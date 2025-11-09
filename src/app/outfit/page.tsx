'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Cloud,
  CloudDrizzle,
  CloudRain,
  Download,
  Droplets,
  Loader2,
  RefreshCcw,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type Activity,
  type ForecastDay,
  type Gender,
  type OutfitFormFieldErrors,
  type OutfitFormState,
  type OutfitRecommendationPartial,
  type OutfitRequestBody,
  type Sensitivity,
  type OutfitSubmitStatus,
  type SelectOption,
  type StylePreference,
} from './types';
import {
  KOREA_PROVINCES,
  PROVINCE_MAP,
  PROVINCE_OPTIONS,
  type LocationId,
  type ProvinceId,
} from './locations';

const GENDER_OPTIONS: SelectOption<Gender>[] = [
  { value: 'female', label: '여자' },
  { value: 'male', label: '남자' },
];

const STYLE_OPTIONS: SelectOption<StylePreference>[] = [
  { value: '편안한 옷차림', label: '편안한 옷차림' },
  { value: '트렌디한 옷차림', label: '트렌디한 옷차림' },
  { value: '단정한 옷차림', label: '단정한 옷차림' },
  { value: '깔끔한 옷차림', label: '깔끔한 옷차림' },
  { value: '활동하기 좋은 옷', label: '활동하기 좋은 옷' },
  { value: '사랑스러운 옷차림', label: '사랑스러운 옷차림' },
];

const ACTIVITY_OPTIONS: SelectOption<Activity>[] = [
  { value: 'school', label: '학교 수업' },
  { value: 'playground', label: '놀이터/야외 놀이' },
  { value: 'fieldTrip', label: '소풍/현장 체험' },
  { value: 'academy', label: '학원/방과후 수업' },
  { value: 'familyOuting', label: '가족 나들이' },
  { value: 'sportsClub', label: '체육 활동/동아리' },
];

const SENSITIVITY_OPTIONS: SelectOption<Sensitivity>[] = [
  { value: 'cold', label: '추움' },
  { value: 'neutral', label: '보통' },
  { value: 'warm', label: '더움' },
];

const FORECAST_DAY_OPTIONS: SelectOption<ForecastDay>[] = [
  { value: 'today', label: '오늘' },
  { value: 'tomorrow', label: '내일' },
  { value: 'dayAfter', label: '모레' },
];

const FAVORITE_COLOR_OPTIONS: SelectOption[] = [
  { value: '#FF6B6B', label: '빨간색' },
  { value: '#FF99CC', label: '분홍색' },
  { value: '#FFD93D', label: '노란색' },
  { value: '#6BCB77', label: '초록색' },
  { value: '#4D96FF', label: '파란색' },
  { value: '#845EC2', label: '보라색' },
  { value: '#FFFFFF', label: '흰색' },
  { value: '#1F1F1F', label: '검은색' },
];

const MAX_FAVORITE_COLORS = 3;

const DEFAULT_PROVINCE = KOREA_PROVINCES[14]!;
const DEFAULT_LOCATION = DEFAULT_PROVINCE.locations[0]!;

const INITIAL_FORM_STATE: OutfitFormState = {
  gender: '',
  age: '',
  favoriteColors: [],
  stylePreference: '',
  activities: [],
  sensitivity: '',
  provinceId: DEFAULT_PROVINCE.id,
  locationId: DEFAULT_LOCATION.id,
  forecastDay: 'today',
};

export default function OutfitPage() {
  const [formState, setFormState] =
    useState<OutfitFormState>(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<OutfitSubmitStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<OutfitFormFieldErrors>({});
  const [result, setResult] = useState<OutfitRecommendationPartial | null>(
    null
  );

  const isStreaming =
    status === 'loading-weather' ||
    status === 'loading-text' ||
    status === 'loading-image';
  const isLoading = status === 'validating' || isStreaming;

  const handleSelect = <K extends keyof OutfitFormState>(
    key: K,
    value: OutfitFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleArrayValue = (key: keyof OutfitFormState, value: string) => {
    setFormState((prev) => {
      const current = new Set(
        Array.isArray(prev[key]) ? (prev[key] as string[]) : []
      );
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }

      return {
        ...prev,
        [key]: Array.from(current),
      };
    });
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleProvinceChange = (provinceId: ProvinceId) => {
    setFormState((prev) => {
      const province = PROVINCE_MAP[provinceId];
      const nextLocationId = province?.locations.some(
        (location) => location.id === prev.locationId
      )
        ? prev.locationId
        : province?.locations[0]?.id ?? prev.locationId;

      return {
        ...prev,
        provinceId,
        locationId: nextLocationId,
      };
    });
    setFieldErrors((prev) => ({
      ...prev,
      provinceId: undefined,
      locationId: undefined,
    }));
  };

  const selectedProvince =
    PROVINCE_MAP[formState.provinceId] ?? DEFAULT_PROVINCE;
  const availableLocations = selectedProvince.locations;
  const hasLocationOptions = availableLocations.length > 0;

  const validateForm = (state: OutfitFormState) => {
    const nextErrors: OutfitFormFieldErrors = {};

    if (!state.gender) {
      nextErrors.gender = '성별을 선택해 주세요.';
    }

    if (state.age === '' || Number.isNaN(state.age) || state.age <= 0) {
      nextErrors.age = '만 나이를 숫자로 입력해 주세요.';
    }

    if (!state.stylePreference) {
      nextErrors.stylePreference = '선호 스타일을 선택해 주세요.';
    }

    if (!state.provinceId) {
      nextErrors.provinceId = '광역자치단체를 선택해 주세요.';
    }

    if (!state.locationId) {
      nextErrors.locationId = '지역을 선택해 주세요.';
    }

    const province =
      state.provinceId && PROVINCE_MAP[state.provinceId]
        ? PROVINCE_MAP[state.provinceId]
        : undefined;
    if (province && state.locationId) {
      const belongsToProvince = province.locations.some(
        (location) => location.id === state.locationId
      );
      if (!belongsToProvince) {
        nextErrors.locationId =
          '선택한 지역이 해당 광역자치단체에 속하지 않아요.';
      }
    } else if (state.provinceId && !province) {
      nextErrors.provinceId = '지원하지 않는 광역자치단체예요.';
    }

    if (state.favoriteColors.length > MAX_FAVORITE_COLORS) {
      nextErrors.favoriteColors = `선호 색상은 최대 ${MAX_FAVORITE_COLORS}개까지 선택할 수 있어요.`;
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setStatus('validating');
    setErrorMessage(null);

    const nextErrors = validateForm(formState);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus('error');
      setErrorMessage('필수 입력값을 확인해 주세요.');
      return;
    }

    setStatus('loading-weather');
    setStatusMessage('기상 정보를 불러오는 중이에요...');
    setResult(null);

    try {
      const payload: OutfitRequestBody = {
        gender: formState.gender || undefined,
        age: formState.age === '' ? undefined : formState.age,
        favoriteColors: formState.favoriteColors,
        stylePreference: formState.stylePreference || undefined,
        activities: formState.activities,
        sensitivity: formState.sensitivity || null,
        provinceId: formState.provinceId,
        locationId: formState.locationId,
        forecastDay: formState.forecastDay,
      };

      const response = await fetch('/api/outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Outfit 추천을 가져오지 못했어요.');
      }

      const bodyStream = response.body;
      if (!bodyStream) {
        throw new Error('서버로부터 데이터를 읽을 수 없어요.');
      }

      const reader = bodyStream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let shouldCancel = false;
      let didComplete = false;
      let encounteredError = false;

      const processEvent = (line: string) => {
        if (!line) {
          return;
        }

        try {
          const event = JSON.parse(line) as Record<string, unknown>;
          const stage =
            typeof event.stage === 'string' ? event.stage : undefined;

          switch (stage) {
            case 'weather': {
              const weather =
                event.weather as OutfitRecommendationPartial['weather'];
              setResult((prev) => ({
                ...(prev ?? {}),
                weather,
              }));
              setStatus('loading-text');
              setStatusMessage(
                '날씨 정보를 정리했어요. 옷차림 가이드를 만드는 중이에요...'
              );
              break;
            }
            case 'text': {
              const text =
                typeof event.text === 'string' ? event.text : undefined;
              const outfit =
                (event.outfit as OutfitRecommendationPartial['outfit']) ??
                undefined;
              const reasoning =
                typeof event.reasoning === 'string'
                  ? event.reasoning
                  : undefined;

              setResult((prev) => ({
                ...(prev ?? {}),
                text: text ?? prev?.text,
                outfit: outfit ?? prev?.outfit ?? {},
                reasoning: reasoning ?? prev?.reasoning,
              }));
              setStatus('loading-image');
              setStatusMessage('옷차림 이미지를 준비하고 있어요...');
              break;
            }
            case 'image': {
              const image =
                (event.image as OutfitRecommendationPartial['image']) ?? null;
              setResult((prev) => ({
                ...(prev ?? {}),
                image,
              }));

              if (typeof event.warning === 'string') {
                setStatusMessage(event.warning);
              } else {
                setStatusMessage('이미지를 마무리하고 있어요...');
              }
              break;
            }
            case 'complete': {
              const recommendation = event.recommendation as
                | OutfitRecommendationPartial
                | undefined;
              setResult((prev) => ({
                ...(prev ?? {}),
                ...(recommendation ?? {}),
                outfit: recommendation?.outfit ?? prev?.outfit ?? {},
              }));
              setStatus('success');
              setStatusMessage('');
              setErrorMessage(null);
              didComplete = true;
              shouldCancel = true;
              break;
            }
            case 'error': {
              encounteredError = true;
              setStatus('error');
              setStatusMessage('');
              setErrorMessage(
                typeof event.message === 'string'
                  ? event.message
                  : '추천을 가져오는 중 오류가 발생했어요.'
              );
              shouldCancel = true;
              break;
            }
            default:
              break;
          }
        } catch (parseError) {
          console.error(
            '스트림 데이터를 해석하는 중 오류가 발생했어요.',
            parseError
          );
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          buffer += decoder.decode();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          processEvent(line);

          if (shouldCancel) {
            break;
          }

          newlineIndex = buffer.indexOf('\n');
        }

        if (shouldCancel) {
          await reader.cancel().catch(() => undefined);
          break;
        }
      }

      if (!shouldCancel) {
        const remaining = buffer.trim();
        if (remaining) {
          processEvent(remaining);
        }
      }

      if (!didComplete && !encounteredError) {
        setStatus('error');
        setStatusMessage('');
        setErrorMessage('추천 결과를 완성하지 못했어요. 다시 시도해 주세요.');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setStatusMessage('');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '추천을 가져오는 중 오류가 발생했어요.'
      );
    }
  };

  const handleReset = () => {
    setFormState(INITIAL_FORM_STATE);
    setFieldErrors({});
    setStatus('idle');
    setStatusMessage('');
    setErrorMessage(null);
    setResult(null);
  };

  const handleDownloadImage = () => {
    if (!result?.image?.base64) return;
    const mimeType = result.image.mimeType || 'image/png';
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${result.image.base64}`;
    link.download = 'outfit.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSubmitDisabled =
    isLoading ||
    !formState.gender ||
    formState.age === '' ||
    !formState.stylePreference ||
    !formState.provinceId ||
    !formState.locationId;

  const imageSrc =
    result?.image?.base64 && result.image.base64.length > 0
      ? `data:${result.image.mimeType || 'image/png'};base64,${
          result.image.base64
        }`
      : null;
  const outfit = result?.outfit ?? {};
  const hasOutfitDetails =
    Boolean(outfit.top) ||
    Boolean(outfit.bottom) ||
    Boolean(outfit.outer) ||
    Boolean(outfit.shoes) ||
    (Array.isArray(outfit.accessories) && outfit.accessories.length > 0) ||
    Boolean(outfit.background) ||
    Boolean(outfit.notes);
  const outfitFallbackMessage = (() => {
    if (hasOutfitDetails) {
      return null;
    }

    switch (status) {
      case 'loading-weather':
      case 'loading-text':
      case 'loading-image':
        return '아직 추천 아이템을 고르는 중이에요. 곧 완성된 코디를 알려드릴게요.';
      case 'success':
        return '아이템 체크리스트를 불러오지 못했어요.';
      case 'error':
        return '아이템 체크리스트를 완성하지 못했어요.';
      default:
        return null;
    }
  })();
  const textContent = (() => {
    if (typeof result?.text === 'string' && result.text.trim().length > 0) {
      return result.text;
    }

    switch (status) {
      case 'loading-weather':
        return '날씨를 확인하는 중이에요. 곧 옷차림 가이드를 전해드릴게요.';
      case 'loading-text':
        return 'AI가 옷차림 가이드를 정리하고 있어요...';
      case 'loading-image':
        return '이미지를 준비하면서 옷차림 설명을 다듬고 있어요...';
      case 'success':
        return '옷차림 가이드를 불러오지 못했어요.';
      case 'error':
        return result?.text ?? '옷차림 가이드를 불러오지 못했어요.';
      default:
        return '';
    }
  })();

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-background text-foreground'>
      <header className='sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-6 py-4 backdrop-blur'>
        <Button
          variant='ghost'
          size='icon'
          asChild
          aria-label='메인 페이지로 이동'
        >
          <Link href='/'>
            <ArrowLeft className='size-5' />
          </Link>
        </Button>
        <h1 className='flex-1 text-center text-lg font-semibold'>
          날씨 맞춤 옷차림 추천
        </h1>
        <span className='size-10' aria-hidden />
      </header>

      <div className='flex flex-1 flex-col gap-10 px-6 pb-16 pt-8'>
        <section className='flex flex-col gap-3'>
          <h1 className='text-3xl font-semibold tracking-tight leading-snug'>
            오늘 날씨와 취향을 반영한 옷차림 추천을 받아보세요.
          </h1>
          <p className='text-base text-muted-foreground'>
            기상청 예보와 스타일리스트 AI를 조합해 상·하의부터 액세서리, 이미지
            레퍼런스까지 제공합니다.
          </p>
        </section>

        <div className='grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr,1fr]'>
          <section className='rounded-2xl border border-border bg-card/80 p-8 shadow-sm backdrop-blur'>
            <h2 className='text-xl font-semibold'>기본 정보 입력</h2>
            <form className='mt-6 space-y-6' onSubmit={handleSubmit}>
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <label className='text-sm font-medium text-foreground'>
                    성별 <span className='text-destructive'>*</span>
                  </label>
                  <select
                    value={formState.gender}
                    onChange={(event) =>
                      handleSelect('gender', event.target.value as Gender)
                    }
                    className={cn(
                      'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
                      fieldErrors.gender &&
                        'border-destructive focus:ring-destructive/40'
                    )}
                  >
                    <option value=''>선택해 주세요</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.gender ? (
                    <p className='text-sm text-destructive'>
                      {fieldErrors.gender}
                    </p>
                  ) : null}
                </div>

                <div className='flex flex-col gap-2'>
                  <label className='text-sm font-medium text-foreground'>
                    나이 <span className='text-destructive'>*</span>
                  </label>
                  <input
                    type='number'
                    inputMode='numeric'
                    min={1}
                    max={120}
                    step={1}
                    placeholder='만 나이를 입력해 주세요'
                    value={formState.age === '' ? '' : formState.age}
                    onChange={(event) => {
                      const { value } = event.target;
                      if (value === '') {
                        handleSelect('age', '');
                        return;
                      }
                      const parsed = Number.parseInt(value, 10);
                      handleSelect('age', Number.isNaN(parsed) ? '' : parsed);
                    }}
                    className={cn(
                      'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
                      fieldErrors.age &&
                        'border-destructive focus:ring-destructive/40'
                    )}
                  />
                  {fieldErrors.age ? (
                    <p className='text-sm text-destructive'>
                      {fieldErrors.age}
                    </p>
                  ) : (
                    <p className='text-xs text-muted-foreground'>
                      주민등록상의 만 나이를 숫자로 입력해 주세요. 예: 11
                    </p>
                  )}
                </div>
              </div>

              <div className='flex flex-col gap-2'>
                <label className='text-sm font-medium text-foreground'>
                  선호 색상 (최대 {MAX_FAVORITE_COLORS}개)
                </label>
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                  {FAVORITE_COLOR_OPTIONS.map((option) => {
                    const isSelected = formState.favoriteColors.includes(
                      option.value
                    );
                    const disableAdditionalSelection =
                      !isSelected &&
                      formState.favoriteColors.length >= MAX_FAVORITE_COLORS;

                    return (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() =>
                          disableAdditionalSelection
                            ? null
                            : toggleArrayValue('favoriteColors', option.value)
                        }
                        className={cn(
                          'flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'hover:border-primary/50'
                        )}
                        aria-pressed={isSelected}
                        disabled={disableAdditionalSelection}
                      >
                        <span
                          className='inline-block size-4 rounded-full border'
                          style={{ backgroundColor: option.value }}
                        />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.favoriteColors ? (
                  <p className='text-sm text-destructive'>
                    {fieldErrors.favoriteColors}
                  </p>
                ) : (
                  <p className='text-xs text-muted-foreground'>
                    선택하지 않아도 괜찮아요. 색상이 보이지 않아도 최대 선택
                    개수를 초과하면 추가 선택이 제한됩니다.
                  </p>
                )}
              </div>

              <div className='flex flex-col gap-2'>
                <label className='text-sm font-medium text-foreground'>
                  선호 스타일 <span className='text-destructive'>*</span>
                </label>
                <select
                  value={formState.stylePreference}
                  onChange={(event) =>
                    handleSelect(
                      'stylePreference',
                      event.target.value as StylePreference
                    )
                  }
                  className={cn(
                    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
                    fieldErrors.stylePreference &&
                      'border-destructive focus:ring-destructive/40'
                  )}
                >
                  <option value=''>선택해 주세요</option>
                  {STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.stylePreference ? (
                  <p className='text-sm text-destructive'>
                    {fieldErrors.stylePreference}
                  </p>
                ) : null}
              </div>

              <div className='flex flex-col gap-2'>
                <label className='text-sm font-medium text-foreground'>
                  주요 활동
                </label>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                  {ACTIVITY_OPTIONS.map((option) => {
                    const isSelected = formState.activities.includes(
                      option.value
                    );
                    return (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() =>
                          toggleArrayValue('activities', option.value)
                        }
                        className={cn(
                          'rounded-lg border border-border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'hover:border-primary/50'
                        )}
                        aria-pressed={isSelected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className='text-xs text-muted-foreground'>
                  오늘 예정된 일정을 선택하면 옷차림 난이도와 실용성을 조절해
                  드려요.
                </p>
              </div>

              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <label className='text-sm font-medium text-foreground'>
                    온도 민감도
                  </label>
                  <p className='text-xs text-muted-foreground'>
                    어떤 날씨를 참기 힘든지 골라 주세요.
                  </p>
                  <select
                    value={formState.sensitivity}
                    onChange={(event) =>
                      handleSelect(
                        'sensitivity',
                        event.target.value as Sensitivity
                      )
                    }
                    className='w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
                  >
                    <option value=''>선택하지 않음</option>
                    {SENSITIVITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='flex flex-col gap-2'>
                  <label className='text-sm font-medium text-foreground'>
                    추천 날짜
                  </label>
                  <p className='text-xs text-muted-foreground'>
                    오늘, 내일, 모레 중 하나를 선택해 주세요.
                  </p>
                  <div className='grid grid-cols-3 gap-2'>
                    {FORECAST_DAY_OPTIONS.map((option) => {
                      const isSelected = formState.forecastDay === option.value;
                      return (
                        <button
                          key={option.value}
                          type='button'
                          onClick={() =>
                            handleSelect('forecastDay', option.value)
                          }
                          className={cn(
                            'rounded-lg border border-border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40',
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'hover:border-primary/50'
                          )}
                          aria-pressed={isSelected}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className='flex flex-col gap-2'>
                <label className='text-sm font-medium text-foreground'>
                  지역 <span className='text-destructive'>*</span>
                </label>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <select
                    value={formState.provinceId}
                    onChange={(event) =>
                      handleProvinceChange(event.target.value as ProvinceId)
                    }
                    className={cn(
                      'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
                      fieldErrors.provinceId &&
                        'border-destructive focus:ring-destructive/40'
                    )}
                  >
                    {PROVINCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formState.locationId}
                    onChange={(event) =>
                      handleSelect(
                        'locationId',
                        event.target.value as LocationId
                      )
                    }
                    disabled={!hasLocationOptions}
                    className={cn(
                      'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60',
                      fieldErrors.locationId &&
                        'border-destructive focus:ring-destructive/40'
                    )}
                  >
                    {hasLocationOptions ? (
                      availableLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.label}
                        </option>
                      ))
                    ) : (
                      <option value=''>선택 가능한 지역이 없어요</option>
                    )}
                  </select>
                </div>
                {fieldErrors.provinceId ? (
                  <p className='text-sm text-destructive'>
                    {fieldErrors.provinceId}
                  </p>
                ) : null}
                {fieldErrors.locationId ? (
                  <p className='text-sm text-destructive'>
                    {fieldErrors.locationId}
                  </p>
                ) : (
                  <p className='text-xs text-muted-foreground'>
                    광역자치단체를 먼저 고르면 해당 시·군·구 목록이 자동으로
                    맞춰져요.
                  </p>
                )}
              </div>

              {errorMessage ? (
                <div className='rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                  {errorMessage}
                </div>
              ) : null}

              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                {statusMessage ? (
                  <div className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
                    {isLoading ? (
                      <Loader2 className='size-4 animate-spin text-primary' />
                    ) : null}
                    <span>{statusMessage}</span>
                  </div>
                ) : (
                  <span className='text-sm text-muted-foreground'>
                    필수 입력란(*)을 모두 채워주세요.
                  </span>
                )}

                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleReset}
                    className='inline-flex items-center gap-2'
                  >
                    <RefreshCcw className='size-4' />
                    초기화
                  </Button>

                  <Button
                    type='submit'
                    disabled={isSubmitDisabled}
                    className='inline-flex items-center gap-2 disabled:opacity-60'
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className='size-4 animate-spin' />
                        추천 생성 중
                      </>
                    ) : (
                      '추천 받기'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </section>

          <section className='flex h-full flex-col gap-6 rounded-2xl border border-border bg-card/60 p-8 shadow-sm backdrop-blur'>
            <div className='flex items-center'>
              <h2 className='text-xl font-semibold'>추천 결과</h2>
            </div>

            {status === 'idle' && !result ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground'>
                <Sparkles className='size-8 text-primary' />
                <p className='max-w-xs text-sm'>
                  왼쪽에서 정보를 입력하면 날씨에 맞춘 코디 텍스트와 이미지를
                  생성해 드릴게요.
                </p>
              </div>
            ) : null}

            {result ? (
              <div className='flex flex-1 flex-col gap-6'>
                <div className='space-y-2 rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-sm'>
                  <span className='text-xs font-medium uppercase text-muted-foreground'>
                    날씨 요약
                  </span>
                  <p className='leading-relaxed text-foreground'>
                    {result.weather?.summary ??
                      '날씨 요약 정보를 불러오지 못했어요.'}
                  </p>
                  <div className='grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3'>
                    {typeof result.weather?.temperature === 'number' ? (
                      <div className='inline-flex items-center gap-1'>
                        <Thermometer className='size-3.5' />
                        <span>
                          기온 {Math.round(result.weather.temperature)}°C
                        </span>
                      </div>
                    ) : null}
                    {typeof result.weather?.lowestTemperature === 'number' ? (
                      <div className='inline-flex items-center gap-1'>
                        <ArrowDown className='size-3.5 text-blue-500' />
                        <span>
                          최저 {Math.round(result.weather.lowestTemperature)}°C
                        </span>
                      </div>
                    ) : null}
                    {typeof result.weather?.highestTemperature === 'number' ? (
                      <div className='inline-flex items-center gap-1'>
                        <ArrowUp className='size-3.5 text-red-500' />
                        <span>
                          최고 {Math.round(result.weather.highestTemperature)}°C
                        </span>
                      </div>
                    ) : null}
                    {typeof result.weather?.apparentTemperature === 'number' ? (
                      <div className='inline-flex items-center gap-1'>
                        <Thermometer className='size-3.5 text-orange-500' />
                        <span>
                          체감 {Math.round(result.weather.apparentTemperature)}
                          °C
                        </span>
                      </div>
                    ) : null}
                    {typeof result.weather?.precipitationProbability ===
                    'number' ? (
                      <div className='inline-flex items-center gap-1'>
                        <CloudRain className='size-3.5 text-blue-500' />
                        <span>
                          강수확률 {result.weather.precipitationProbability}%
                        </span>
                      </div>
                    ) : null}
                    {typeof result.weather?.windSpeed === 'number' ? (
                      <div className='inline-flex items-center gap-1'>
                        <Wind className='size-3.5 text-slate-500' />
                        <span>풍속 {result.weather.windSpeed} m/s</span>
                      </div>
                    ) : null}
                    {typeof result.weather?.humidity === 'number' ? (
                      <div className='inline-flex items-center gap-1'>
                        <Droplets className='size-3.5 text-sky-600' />
                        <span>습도 {result.weather.humidity}%</span>
                      </div>
                    ) : null}
                    {result.weather?.precipitationType ? (
                      <div className='inline-flex items-center gap-1'>
                        <CloudDrizzle className='size-3.5 text-blue-400' />
                        <span>
                          강수 형태 {result.weather.precipitationType}
                        </span>
                      </div>
                    ) : null}
                    {result.weather?.skyStatus ? (
                      <div className='inline-flex items-center gap-1'>
                        <Cloud className='size-3.5 text-slate-400' />
                        <span>하늘 {result.weather.skyStatus}</span>
                      </div>
                    ) : null}
                    {result.weather?.dateTimeLabel ? (
                      <div className='inline-flex items-center gap-1'>
                        <Sun className='size-3.5 text-amber-500' />
                        <span>{result.weather.dateTimeLabel}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className='space-y-3'>
                  <span className='text-xs font-medium uppercase text-muted-foreground'>
                    옷차림 가이드
                  </span>
                  <p className='whitespace-pre-line rounded-xl border border-border/70 bg-background/60 px-4 py-4 text-sm leading-relaxed text-foreground'>
                    {textContent}
                  </p>
                  {result.reasoning ? (
                    <details className='rounded-xl border border-dashed border-border/70 bg-background/30 px-4 py-3 text-sm text-muted-foreground transition hover:border-border'>
                      <summary className='cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                        추천 근거 보기
                      </summary>
                      <p className='mt-2 whitespace-pre-line leading-relaxed'>
                        {result.reasoning}
                      </p>
                    </details>
                  ) : null}
                </div>

                <div className='space-y-3'>
                  <span className='text-xs font-medium uppercase text-muted-foreground'>
                    아이템 체크리스트
                  </span>
                  <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    {outfitFallbackMessage ? (
                      <li className='rounded-xl border border-dashed border-border/40 bg-background/40 px-4 py-3 text-sm sm:col-span-2'>
                        <p className='text-muted-foreground'>
                          {outfitFallbackMessage}
                        </p>
                      </li>
                    ) : null}
                    {outfit.top ? (
                      <li className='rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm'>
                        <span className='text-xs font-medium uppercase text-muted-foreground'>
                          상의
                        </span>
                        <p className='mt-1 text-foreground'>{outfit.top}</p>
                      </li>
                    ) : null}
                    {outfit.bottom ? (
                      <li className='rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm'>
                        <span className='text-xs font-medium uppercase text-muted-foreground'>
                          하의
                        </span>
                        <p className='mt-1 text-foreground'>{outfit.bottom}</p>
                      </li>
                    ) : null}
                    {outfit.outer ? (
                      <li className='rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm'>
                        <span className='text-xs font-medium uppercase text-muted-foreground'>
                          아우터
                        </span>
                        <p className='mt-1 text-foreground'>{outfit.outer}</p>
                      </li>
                    ) : null}
                    {outfit.shoes ? (
                      <li className='rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm'>
                        <span className='text-xs font-medium uppercase text-muted-foreground'>
                          신발
                        </span>
                        <p className='mt-1 text-foreground'>{outfit.shoes}</p>
                      </li>
                    ) : null}
                    {outfit.accessories?.length ? (
                      <li className='rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm sm:col-span-2'>
                        <span className='text-xs font-medium uppercase text-muted-foreground'>
                          액세서리
                        </span>
                        <p className='mt-1 text-foreground'>
                          {outfit.accessories.join(', ')}
                        </p>
                      </li>
                    ) : null}
                    {outfit.background ? (
                      <li className='rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm sm:col-span-2'>
                        <span className='text-xs font-medium uppercase text-muted-foreground'>
                          배경 연출
                        </span>
                        <p className='mt-1 whitespace-pre-line text-foreground'>
                          {outfit.background}
                        </p>
                      </li>
                    ) : null}
                    {outfit.notes ? (
                      <li className='rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-3 text-sm sm:col-span-2'>
                        <span className='text-xs font-medium uppercase text-muted-foreground'>
                          참고 메모
                        </span>
                        <p className='mt-1 whitespace-pre-line text-foreground'>
                          {outfit.notes}
                        </p>
                      </li>
                    ) : null}
                  </ul>
                </div>

                {imageSrc ? (
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs font-medium uppercase text-muted-foreground'>
                        코디 이미지 프리뷰
                      </span>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='inline-flex items-center gap-2'
                        onClick={handleDownloadImage}
                      >
                        <Download className='size-3.5' />
                        다운로드
                      </Button>
                    </div>
                    <div className='overflow-hidden rounded-xl border border-border/70 bg-background/60'>
                      <Image
                        src={imageSrc}
                        alt='생성된 옷차림 레퍼런스'
                        width={768}
                        height={1024}
                        className='h-auto w-full object-cover'
                        unoptimized
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : isLoading ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-3 text-center'>
                <Loader2 className='size-6 animate-spin text-primary' />
                <p className='text-sm text-muted-foreground'>
                  추천 내용을 정리하는 중입니다. 잠시만 기다려 주세요.
                </p>
              </div>
            ) : status === 'error' && !result ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-3 text-center text-destructive'>
                <p className='text-sm font-medium'>
                  추천을 가져오는 데 실패했어요.
                </p>
                {errorMessage ? (
                  <p className='text-xs text-destructive/80'>{errorMessage}</p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
