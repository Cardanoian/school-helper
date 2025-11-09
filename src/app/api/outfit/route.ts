import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  type ForecastDay,
  type LocationId,
  type OutfitDetails,
  type OutfitImage,
  type OutfitRequestBody,
  type WeatherSummary,
  type GeminiOutfit,
  type StylePreference,
  type VillageForecastItem,
} from '@/app/outfit/types';
import { LOCATION_MAP } from '@/app/outfit/locations';
// import { writeWeatherLog } from '@/app/api/outfit/logger';

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

const STYLE_PROMPT_MAP: Record<StylePreference, string> = {
  '편안한 옷차림': 'comfortable everyday outfit',
  '트렌디한 옷차림': 'trendy statement outfit',
  '단정한 옷차림': 'neat and tidy outfit',
  '깔끔한 옷차림': 'minimal and clean outfit',
  '활동하기 좋은 옷': 'athletic casual outfit',
  '사랑스러운 옷차림': 'romantic cute outfit',
};

const VILLAGE_FORECAST_ENDPOINT =
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

const FORECAST_BASE_TIMES = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
const FORECAST_DAY_OFFSETS: Record<ForecastDay, number> = {
  today: 0,
  tomorrow: 1,
  dayAfter: 2,
};
const FORECAST_DAY_LABEL: Record<ForecastDay, string> = {
  today: '오늘',
  tomorrow: '내일',
  dayAfter: '모레',
};
const DEFAULT_FORECAST_HOUR = 12;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const ROWS_PER_PAGE = 10;
const CATEGORY_SEQUENCE_BASE = [
  'TMP',
  'UUU',
  'VVV',
  'VEC',
  'WSD',
  'SKY',
  'PTY',
  'POP',
  'WAV',
  'PCP',
  'REH',
  'SNO',
];
const EXTRA_CATEGORY_SEQUENCE: Record<string, string[]> = {
  '0600': ['TMN'],
  '1500': ['TMX'],
};
const HOURLY_REQUIRED_CATEGORIES = [
  'TMP',
  'POP',
  'PTY',
  'SKY',
  'REH',
  'WSD',
] as const;
const DAILY_CATEGORY_TARGETS: Record<'TMN' | 'TMX', string> = {
  TMN: '0600',
  TMX: '1500',
};

const weatherCache = new Map<
  string,
  {
    expiresAt: number;
    data: WeatherSummary;
  }
>();

const genAI = (() => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined. Outfit API will be degraded.');
    return null;
  }

  return new GoogleGenAI({ apiKey });
})();

const getKstDateParts = (input: Date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const parts = formatter.formatToParts(input);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
  };
};

const createKstDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
) => {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
};

const getLatestForecastBaseDateTime = (reference: Date) => {
  const effective = new Date(reference.getTime());
  effective.setMinutes(effective.getMinutes() - 45);

  let parts = getKstDateParts(effective);
  const hour = Number.parseInt(parts.hour, 10);
  const minute = Number.parseInt(parts.minute, 10);
  const candidate = hour * 100 + minute;

  let selected = FORECAST_BASE_TIMES[FORECAST_BASE_TIMES.length - 1];

  for (const base of FORECAST_BASE_TIMES) {
    if (candidate >= base) {
      selected = base;
    }
  }

  if (candidate < FORECAST_BASE_TIMES[0]) {
    const previous = new Date(effective.getTime() - MS_IN_DAY);
    parts = getKstDateParts(previous);
    selected = FORECAST_BASE_TIMES[FORECAST_BASE_TIMES.length - 1];
  }

  const baseDate = `${parts.year}${parts.month}${parts.day}`;
  const baseTime = String(selected).padStart(4, '0');

  return { baseDate, baseTime };
};

const getForecastTargetInfo = (forecastDay: ForecastDay) => {
  const now = new Date();
  const nowParts = getKstDateParts(now);
  let hour = Number.parseInt(nowParts.hour, 10);
  const minute = Number.parseInt(nowParts.minute, 10);

  if (forecastDay === 'today') {
    if (minute >= 30) {
      hour = Math.min(hour + 1, 23);
    }
  } else {
    hour = DEFAULT_FORECAST_HOUR;
  }

  const baseDate = createKstDate(
    Number.parseInt(nowParts.year, 10),
    Number.parseInt(nowParts.month, 10),
    Number.parseInt(nowParts.day, 10),
    hour
  );

  const offset = FORECAST_DAY_OFFSETS[forecastDay] ?? 0;
  const targetDate = new Date(baseDate.getTime() + offset * MS_IN_DAY);
  const targetParts = getKstDateParts(targetDate);
  const dateString = `${targetParts.year}${targetParts.month}${targetParts.day}`;
  const desiredHour = Number.parseInt(targetParts.hour, 10);

  return {
    date: targetDate,
    dateString,
    desiredHour,
  };
};

const resolveForecastItems = (root: unknown): VillageForecastItem[] => {
  const items = (
    root as {
      response?: { body?: { items?: { item?: unknown } } };
    }
  )?.response?.body?.items?.item;
  if (!items) {
    return [];
  }
  if (Array.isArray(items)) {
    return items as VillageForecastItem[];
  }
  return [items as VillageForecastItem];
};

const parseNumber = (value?: string) => {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed === 'null' ||
    trimmed === '강수없음'
  ) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getCategorySequence = (fcstTime: string) => {
  const sequence = [...CATEGORY_SEQUENCE_BASE];
  const extras = EXTRA_CATEGORY_SEQUENCE[fcstTime];
  if (extras) {
    sequence.push(...extras);
  }
  return sequence;
};

const parseDateString = (value: string) => {
  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(4, 6), 10);
  const day = Number.parseInt(value.slice(6, 8), 10);
  return createKstDate(year, month, day, 0);
};

const formatDateString = (date: Date) => {
  const parts = getKstDateParts(date);
  return `${parts.year}${parts.month}${parts.day}`;
};

const advanceHour = (dateStr: string, hour: number) => {
  let nextHour = hour + 1;
  let nextDateStr = dateStr;

  if (nextHour >= 24) {
    nextHour = 0;
    const current = parseDateString(dateStr);
    const nextDate = new Date(current.getTime() + MS_IN_DAY);
    nextDateStr = formatDateString(nextDate);
  }

  return {
    dateStr: nextDateStr,
    hour: nextHour,
  };
};

const compareDateTime = (
  dateA: string,
  hourA: number,
  dateB: string,
  hourB: number
) => {
  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;
  if (hourA < hourB) return -1;
  if (hourA > hourB) return 1;
  return 0;
};

type ForecastMetadata = {
  firstDate: string;
  firstHour: number;
};

const computeItemIndex = (
  metadata: ForecastMetadata,
  category: string,
  fcstDate: string,
  fcstTime: string
) => {
  const targetHour = Number.parseInt(fcstTime.slice(0, 2), 10);
  if (
    compareDateTime(
      fcstDate,
      targetHour,
      metadata.firstDate,
      metadata.firstHour
    ) < 0
  ) {
    return null;
  }

  let cursorDate = metadata.firstDate;
  let cursorHour = metadata.firstHour;
  let index = 0;

  while (compareDateTime(cursorDate, cursorHour, fcstDate, targetHour) < 0) {
    const timeKey = `${String(cursorHour).padStart(2, '0')}00`;
    index += getCategorySequence(timeKey).length;
    const advanced = advanceHour(cursorDate, cursorHour);
    cursorDate = advanced.dateStr;
    cursorHour = advanced.hour;
  }

  const sequence = getCategorySequence(fcstTime);
  const categoryIndex = sequence.indexOf(category);
  if (categoryIndex === -1) {
    return null;
  }

  return index + categoryIndex;
};

const mapPrecipitationType = (code?: string) => {
  switch (code) {
    case '1':
      return '비';
    case '2':
      return '비/눈';
    case '3':
      return '눈';
    case '4':
      return '소나기';
    case '5':
      return '빗방울';
    case '6':
      return '빗방울/눈날림';
    case '7':
      return '눈날림';
    default:
      return undefined;
  }
};

const mapSkyStatus = (code?: string) => {
  switch (code) {
    case '1':
      return '맑음';
    case '3':
      return '구름 많음';
    case '4':
      return '흐림';
    default:
      return undefined;
  }
};

const formatForecastLabel = (date: Date) => {
  const parts = getKstDateParts(date);
  const hour = Number.parseInt(parts.hour, 10);
  return `${parts.month}.${parts.day} ${hour}시 예보`;
};

const fetchWeatherFromKMA = async (
  locationId: LocationId,
  forecastDay: ForecastDay
): Promise<WeatherSummary> => {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('WEATHER_API_KEY is not configured');
  }

  const location = LOCATION_MAP[locationId];
  if (!location) {
    throw new Error('지원하지 않는 지역입니다.');
  }

  const cacheKey = `${locationId}:${forecastDay}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const { baseDate: latestBaseDate, baseTime: latestBaseTime } =
    getLatestForecastBaseDateTime(new Date());
  const baseDate = latestBaseDate;
  let baseTime = latestBaseTime;
  if (Number.parseInt(baseTime, 10) > 200) {
    baseTime = '0200';
  }

  const targetInfo = getForecastTargetInfo(forecastDay);
  const encodedServiceKey = apiKey.includes('%')
    ? apiKey
    : encodeURIComponent(apiKey);

  const pageCache = new Map<number, VillageForecastItem[]>();
  const valueCache = new Map<string, string | undefined>();
  let metadata: ForecastMetadata | null = null;
  // let hasLoggedResponse = false;

  const fetchPage = async (pageNo: number) => {
    if (pageCache.has(pageNo)) {
      return pageCache.get(pageNo)!;
    }

    const params = new URLSearchParams({
      pageNo: String(pageNo),
      numOfRows: String(ROWS_PER_PAGE),
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: String(location.nx),
      ny: String(location.ny),
    });

    const url = `${VILLAGE_FORECAST_ENDPOINT}?serviceKey=${encodedServiceKey}&${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('기상 정보를 불러오지 못했어요.');
    }

    const data = await response.json();

    const headerResultCode =
      data?.response?.header?.resultCode ??
      data?.result?.header?.resultCode ??
      data?.header?.resultCode ??
      data?.resultCode;
    if (headerResultCode && headerResultCode !== '00') {
      const message =
        data?.response?.header?.resultMsg ??
        data?.result?.header?.resultMsg ??
        data?.header?.resultMsg ??
        data?.resultMsg;
      throw new Error(message ?? '기상청 응답이 실패했습니다.');
    }

    // if (!hasLoggedResponse) {
    //   await writeWeatherLog(data.response);
    //   hasLoggedResponse = true;
    // }

    const items = resolveForecastItems(data);
    if (!metadata) {
      const firstItem = items[0];
      if (!firstItem) {
        throw new Error('기상청 예보 데이터가 없습니다.');
      }
      metadata = {
        firstDate: firstItem.fcstDate,
        firstHour: Number.parseInt(firstItem.fcstTime.slice(0, 2), 10),
      };
    }

    pageCache.set(pageNo, items);
    return items;
  };

  const ensureMetadata = async () => {
    if (!metadata) {
      await fetchPage(1);
    }
    if (!metadata) {
      throw new Error('기상청 예보 데이터를 찾지 못했습니다.');
    }
  };

  const getForecastValue = async (
    category: string,
    fcstDate: string,
    fcstTime: string
  ) => {
    const cacheId = `${category}:${fcstDate}:${fcstTime}`;
    if (valueCache.has(cacheId)) {
      return valueCache.get(cacheId);
    }

    await ensureMetadata();
    if (!metadata) {
      valueCache.set(cacheId, undefined);
      return undefined;
    }

    const index = computeItemIndex(metadata, category, fcstDate, fcstTime);
    if (index == null) {
      valueCache.set(cacheId, undefined);
      return undefined;
    }

    const primaryPage = Math.floor(index / ROWS_PER_PAGE) + 1;
    const candidatePages = [
      primaryPage,
      primaryPage + 1,
      primaryPage - 1,
    ].filter((page, idx, arr) => page >= 1 && arr.indexOf(page) === idx);

    for (const page of candidatePages) {
      const items = await fetchPage(page);
      const match = items.find(
        (item) =>
          item.category === category &&
          item.fcstDate === fcstDate &&
          item.fcstTime === fcstTime
      );
      if (match) {
        valueCache.set(cacheId, match.fcstValue);
        return match.fcstValue;
      }
    }

    valueCache.set(cacheId, undefined);
    return undefined;
  };

  await ensureMetadata();
  const metadataValue = metadata!;

  const selectedDate = targetInfo.dateString;
  let selectedHour = targetInfo.desiredHour;
  if (
    selectedDate === metadataValue.firstDate &&
    selectedHour < metadataValue.firstHour
  ) {
    selectedHour = metadataValue.firstHour;
  }
  const selectedTime = `${String(selectedHour).padStart(2, '0')}00`;

  const hourlyEntries = await Promise.all(
    HOURLY_REQUIRED_CATEGORIES.map(async (category) => {
      const value = await getForecastValue(
        category,
        selectedDate,
        selectedTime
      );
      return { category, value };
    })
  );
  const hourlyMap = new Map(
    hourlyEntries.map(({ category, value }) => [category, value] as const)
  );

  const dailyEntries = await Promise.all(
    (
      Object.entries(DAILY_CATEGORY_TARGETS) as Array<
        [keyof typeof DAILY_CATEGORY_TARGETS, string]
      >
    ).map(async ([category, time]) => {
      const value = await getForecastValue(category, selectedDate, time);
      return { category, value };
    })
  );
  const dailyMap = new Map(
    dailyEntries.map(({ category, value }) => [category, value] as const)
  );

  const temperature = parseNumber(hourlyMap.get('TMP'));
  const precipitationProbability = parseNumber(hourlyMap.get('POP'));
  const precipitationType = mapPrecipitationType(hourlyMap.get('PTY'));
  const skyStatus = mapSkyStatus(hourlyMap.get('SKY'));
  const humidity = parseNumber(hourlyMap.get('REH'));
  const windSpeed = parseNumber(hourlyMap.get('WSD'));
  const lowestTemperature = parseNumber(dailyMap.get('TMN'));
  const highestTemperature = parseNumber(dailyMap.get('TMX'));

  const forecastDateTime = createKstDate(
    Number.parseInt(selectedDate.slice(0, 4), 10),
    Number.parseInt(selectedDate.slice(4, 6), 10),
    Number.parseInt(selectedDate.slice(6, 8), 10),
    selectedHour
  );
  const dateTimeLabel = formatForecastLabel(forecastDateTime);

  const segments: string[] = [];
  if (typeof temperature === 'number') {
    segments.push(`기온 ${Math.round(temperature)}°C`);
  }
  if (typeof lowestTemperature === 'number') {
    segments.push(`최저 ${Math.round(lowestTemperature)}°C`);
  }
  if (typeof highestTemperature === 'number') {
    segments.push(`최고 ${Math.round(highestTemperature)}°C`);
  }
  if (typeof precipitationProbability === 'number') {
    segments.push(`강수확률 ${Math.round(precipitationProbability)}%`);
  }
  if (precipitationType) {
    segments.push(`강수 형태 ${precipitationType}`);
  }
  if (skyStatus) {
    segments.push(`하늘 ${skyStatus}`);
  }
  if (typeof humidity === 'number') {
    segments.push(`습도 ${Math.round(humidity)}%`);
  }
  if (typeof windSpeed === 'number') {
    segments.push(`풍속 ${windSpeed.toFixed(1)}m/s`);
  }

  const summary =
    segments.length > 0
      ? segments.join(', ')
      : `${location.label ?? '선택 지역'}의 날씨 정보를 불러오지 못했어요.`;

  const weather: WeatherSummary = {
    summary,
    temperature,
    humidity,
    windSpeed,
    precipitationProbability:
      typeof precipitationProbability === 'number'
        ? Math.round(precipitationProbability)
        : undefined,
    precipitationType,
    skyStatus,
    lowestTemperature,
    highestTemperature,
    dateTimeLabel,
    observedAt: forecastDateTime.toISOString(),
    stationName: location.label,
  };

  weatherCache.set(cacheKey, {
    data: weather,
    expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
  });

  return weather;
};

const buildTextPromptPayload = (
  payload: OutfitRequestBody,
  weather: WeatherSummary
) => {
  const forecastDayLabel =
    payload.forecastDay && FORECAST_DAY_LABEL[payload.forecastDay]
      ? FORECAST_DAY_LABEL[payload.forecastDay]
      : FORECAST_DAY_LABEL.today;

  const observedAt = weather.observedAt
    ? new Date(weather.observedAt)
    : new Date();
  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedDate = dateFormatter.format(observedAt);

  const weatherMetrics = {
    TMP: weather.temperature ?? null,
    TMN: weather.lowestTemperature ?? null,
    TMX: weather.highestTemperature ?? null,
    POP: weather.precipitationProbability ?? null,
    PTY: weather.precipitationType ?? null,
    SKY: weather.skyStatus ?? null,
    REH: weather.humidity ?? null,
    WSD: weather.windSpeed ?? null,
  };

  const inputSummary = {
    사용자정보: {
      성별: payload.gender ?? null,
      나이: payload.age ?? null,
      선호색상: payload.favoriteColors ?? [],
      스타일취향: payload.stylePreference ?? null,
      활동계획: payload.activities ?? [],
      체감온도민감도: payload.sensitivity ?? null,
    },
    예보설정: {
      기준일자: formattedDate,
      예보대상: forecastDayLabel,
      지역명: weather.stationName ?? null,
    },
    날씨데이터: weatherMetrics,
  };

  const outputSchema = {
    text: '옷차림 추천 설명 (string)',
    outfit: {
      top: '상의 아이템 (string)',
      bottom: '하의 아이템 (string)',
      outer: '아우터 (string)',
      shoes: '신발 (string)',
      accessories: ['액세서리 배열 (string)'],
      background: '이미지 배경 연출 설명 (string)',
      notes: '추가 메모 (string)',
    },
    reasoning: '추천 근거 (string, optional)',
  };

  return [
    '너는 한국 초등학생을 위한 패션 스타일리스트이자 사진 감독이야.',
    '사용자는 옷차림이 궁금한 어린이 본인이니, 친근하고 응원하는 말투로 어린이에게 직접 설명해.',
    '다음 JSON 데이터를 분석해서 사용자에게 어울리는 옷차림과 이미지 배경 연출을 제안해.',
    '반드시 아래 구조를 따르는 JSON 문자열로 응답하고, 모든 문장은 자연스러운 한국어로 작성해.',
    '출력 JSON 예시 구조:',
    JSON.stringify(outputSchema, null, 2),
    '입력 데이터:',
    JSON.stringify(inputSummary, null, 2),
    '날씨 데이터(TMP, TMN, TMX, POP, PTY, SKY, REH, WSD)를 모두 활용해 계절과 활동 장소를 추론하고 최적의 배경을 제안해.',
  ].join('\n\n');
};

const parseGeminiJson = (raw: string): GeminiOutfit => {
  try {
    const parsed = JSON.parse(raw) as Partial<GeminiOutfit>;
    return {
      text: parsed?.text ?? '추천 설명을 생성하지 못했어요.',
      outfit: parsed?.outfit ?? {},
      reasoning: parsed?.reasoning,
    };
  } catch (error) {
    console.warn('Failed to parse Gemini JSON response', error);
    return {
      text: raw,
      outfit: {},
    };
  }
};

const requestTextRecommendation = async (
  body: OutfitRequestBody,
  weather: WeatherSummary
): Promise<GeminiOutfit> => {
  if (!genAI) {
    return {
      text: 'AI 추천을 사용할 수 없어 간단한 가이드만 제공합니다.',
      outfit: {
        top: '기본 티셔츠',
        bottom: '데님 팬츠',
        outer: '가벼운 아우터',
        shoes: '스니커즈',
        accessories: ['우산 혹은 방수 아이템'],
      },
    };
  }

  const payload = buildTextPromptPayload(body, weather);

  const response = await genAI.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: payload }],
      },
    ],
    config: {
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: [
              '너는 한국어로 응답하는 패션 스타일리스트 AI이자 연출가야.',
              '사용자가 제공한 JSON 데이터를 분석해 옷차림과 배경 정보를 추천해.',
              '텍스트 설명은 어린이 사용자에게 직접 말하듯 한글 2인칭 표현을 사용해.',
              '응답은 반드시 JSON 형식이어야 하며, 필수 필드는 text, outfit(top, bottom, outer, shoes, accessories[], background, notes), 선택 필드는 reasoning이야.',
              '모든 설명은 자연스러운 한국어로 작성하고, 불필요한 텍스트나 설명을 JSON 밖으로 출력하지 마.',
            ].join('\n'),
          },
        ],
      },
      temperature: 0.8,
      topP: 0.9,
      responseMimeType: 'application/json',
    },
  });

  const text =
    response.text ??
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text ?? '')
      .join('')
      .trim();

  if (!text) {
    return {
      text: 'Gemini 응답이 비어 있습니다.',
      outfit: {},
    };
  }

  return parseGeminiJson(text);
};

const buildImagePrompt = (
  body: OutfitRequestBody,
  outfit: OutfitDetails | undefined,
  weather: WeatherSummary
) => {
  const stylePreferenceForPrompt =
    body.stylePreference && STYLE_PROMPT_MAP[body.stylePreference]
      ? `${body.stylePreference} (${STYLE_PROMPT_MAP[body.stylePreference]})`
      : '편안한 옷차림 (comfortable everyday outfit)';

  const weatherDetails: string[] = [];
  if (typeof weather.temperature === 'number') {
    weatherDetails.push(`현재 기온 ${Math.round(weather.temperature)}°C`);
  }
  if (typeof weather.lowestTemperature === 'number') {
    weatherDetails.push(`최저 ${Math.round(weather.lowestTemperature)}°C`);
  }
  if (typeof weather.highestTemperature === 'number') {
    weatherDetails.push(`최고 ${Math.round(weather.highestTemperature)}°C`);
  }
  if (
    typeof weather.precipitationProbability === 'number' &&
    weather.precipitationProbability >= 0
  ) {
    weatherDetails.push(`강수확률 ${weather.precipitationProbability}%`);
  }
  if (weather.precipitationType) {
    weatherDetails.push(`강수 형태 ${weather.precipitationType}`);
  }
  if (weather.skyStatus) {
    weatherDetails.push(`하늘 상태 ${weather.skyStatus}`);
  }
  if (typeof weather.humidity === 'number') {
    weatherDetails.push(`습도 ${Math.round(weather.humidity)}%`);
  }
  if (typeof weather.windSpeed === 'number') {
    weatherDetails.push(`풍속 ${weather.windSpeed.toFixed(1)}m/s`);
  }

  const backgroundDescription =
    outfit?.background ??
    `${weather.summary}. 날씨와 활동에 어울리는 야외 배경을 연출해.`;

  const lines: string[] = [
    'Create a full-body illustration in a polished 2D animation style.',
    '- Character: Korean person, standing pose, natural proportions, gentle expression.',
    `- Art style: modern 2D animation, clean outlines, soft lighting.`,
    `- Gender: ${body.gender ?? 'unspecified'} / Age: ${
      body.age ?? 'unspecified'
    }`,
    `- Outfit mood: ${stylePreferenceForPrompt}`,
    `- Preferred colors: ${
      body.favoriteColors && body.favoriteColors.length > 0
        ? body.favoriteColors.join(', ')
        : 'neutral and harmonious palette'
    }`,
    `- Planned activities: ${
      body.activities && body.activities.length > 0
        ? body.activities.join(', ')
        : 'general daily routine'
    }`,
    `- Weather context: ${weatherDetails.join(', ') || weather.summary}`,
    `- Background: ${backgroundDescription}`,
    `- Forecast day: ${
      body.forecastDay
        ? FORECAST_DAY_LABEL[body.forecastDay] ?? body.forecastDay
        : FORECAST_DAY_LABEL.today
    }`,
    '- Keep props and environment consistent with the weather conditions.',
    '- Outfit details:',
  ];

  if (outfit?.top) lines.push(`  • Top: ${outfit.top}`);
  if (outfit?.bottom) lines.push(`  • Bottom: ${outfit.bottom}`);
  if (outfit?.outer) lines.push(`  • Outer: ${outfit.outer}`);
  if (outfit?.shoes) lines.push(`  • Shoes: ${outfit.shoes}`);
  if (outfit?.accessories?.length) {
    lines.push(`  • Accessories: ${outfit.accessories.join(', ')}`);
  }

  return lines.join('\n');
};

const requestImage = async (
  body: OutfitRequestBody,
  outfit: OutfitDetails | undefined,
  weather: WeatherSummary
): Promise<OutfitImage | null> => {
  if (!genAI) {
    return null;
  }

  try {
    const prompt = buildImagePrompt(body, outfit, weather);
    const response = await genAI.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const primaryParts = response.candidates?.[0]?.content?.parts ?? [];
    const alternativeParts =
      response.candidates && response.candidates.length > 0
        ? response.candidates.flatMap(
            (candidate) => candidate.content?.parts ?? []
          )
        : [];
    const parts = primaryParts.length > 0 ? primaryParts : alternativeParts;

    for (const part of parts) {
      if (part?.inlineData?.data) {
        const mimeType = part.inlineData.mimeType ?? 'image/png';
        return {
          base64: part.inlineData.data,
          mimeType,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('Gemini image generation failed', error);
    return null;
  }
};

const fallbackWeatherSummary = (
  locationId?: LocationId,
  forecastDay?: ForecastDay
): WeatherSummary => {
  const location = locationId ? LOCATION_MAP[locationId] : undefined;
  const dayLabel =
    (forecastDay && FORECAST_DAY_LABEL[forecastDay]) ??
    FORECAST_DAY_LABEL.today;
  return {
    summary: `${
      location?.label ?? '선택 지역'
    }의 ${dayLabel} 날씨 정보를 가져오지 못해 평균적인 봄날을 가정했어요.`,
    temperature: 20,
    lowestTemperature: 15,
    highestTemperature: 23,
    precipitationProbability: 10,
    humidity: 50,
    windSpeed: 2,
    skyStatus: '맑음',
    dateTimeLabel: `${dayLabel} 예시`,
    observedAt: new Date().toISOString(),
    stationName: location?.label,
  };
};

export async function POST(request: NextRequest) {
  let body: OutfitRequestBody;

  try {
    body = (await request.json()) as OutfitRequestBody;
  } catch (error) {
    console.error('Outfit request JSON parse error', error);
    return NextResponse.json(
      { error: '요청 본문이 올바른 JSON 형식이 아닙니다.' },
      { status: 400 }
    );
  }

  if (
    !body.gender ||
    body.age == null ||
    Number.isNaN(body.age) ||
    body.age <= 0 ||
    !body.stylePreference ||
    !body.locationId
  ) {
    return NextResponse.json(
      { error: '필수 입력값이 누락되었습니다.' },
      { status: 400 }
    );
  }

  const location = LOCATION_MAP[body.locationId];
  if (!location) {
    return NextResponse.json(
      { error: '지원하지 않는 지역입니다.' },
      { status: 400 }
    );
  }

  const forecastDay: ForecastDay = body.forecastDay ?? 'today';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      const sendError = (error: unknown, stage?: string) => {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
            ? error
            : '알 수 없는 오류가 발생했어요.';

        send({ stage: 'error', message, originStage: stage });
        controller.close();
      };

      let weather: WeatherSummary;
      try {
        weather = await fetchWeatherFromKMA(
          body.locationId as LocationId,
          forecastDay
        );
      } catch (error) {
        console.warn('Weather fetch failed, using fallback', error);
        weather = fallbackWeatherSummary(body.locationId, forecastDay);
      }

      send({ stage: 'weather', weather });

      let outfit: GeminiOutfit;
      let outfitDetails: OutfitDetails = {};
      try {
        outfit = await requestTextRecommendation(body, weather);
        outfitDetails = outfit.outfit ?? {};
        send({
          stage: 'text',
          text: outfit.text,
          outfit: outfitDetails,
          reasoning: outfit.reasoning,
        });
      } catch (error) {
        console.error('Text recommendation failed', error);
        sendError(error, 'text');
        return;
      }

      try {
        const image = await requestImage(body, outfitDetails, weather);
        send({ stage: 'image', image });
        send({
          stage: 'complete',
          recommendation: {
            text: outfit!.text,
            outfit: outfitDetails,
            reasoning: outfit?.reasoning,
            weather,
            image,
          },
        });
      } catch (error) {
        console.warn('Gemini image generation failed', error);
        send({
          stage: 'image',
          image: null,
          warning:
            error instanceof Error
              ? error.message
              : '이미지 생성에 실패했어요.',
        });
        send({
          stage: 'complete',
          recommendation: {
            text: outfit!.text,
            outfit: outfitDetails,
            reasoning: outfit?.reasoning,
            weather,
            image: null,
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
