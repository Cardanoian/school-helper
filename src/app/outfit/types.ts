import type { LocationId, ProvinceId } from './locations';

export type { Location, LocationId, Province, ProvinceId } from './locations';

export type Gender = 'female' | 'male';

export type StylePreference =
  | '편안한 옷차림'
  | '트렌디한 옷차림'
  | '단정한 옷차림'
  | '깔끔한 옷차림'
  | '활동하기 좋은 옷'
  | '사랑스러운 옷차림';

export type Activity =
  | 'school'
  | 'playground'
  | 'fieldTrip'
  | 'academy'
  | 'familyOuting'
  | 'sportsClub';

export type ForecastDay = 'today' | 'tomorrow' | 'dayAfter';

export type Sensitivity = 'cold' | 'neutral' | 'warm';

export type WeatherSummary = {
  summary: string;
  temperature?: number;
  apparentTemperature?: number;
  lowestTemperature?: number;
  highestTemperature?: number;
  precipitationProbability?: number;
  precipitationAmount?: number;
  windSpeed?: number;
  humidity?: number;
  precipitationType?: string;
  skyStatus?: string;
  dateTimeLabel?: string;
  observedAt?: string;
  stationName?: string;
};

export type OutfitDetails = {
  top?: string;
  bottom?: string;
  outer?: string;
  shoes?: string;
  accessories?: string[];
  background?: string;
  notes?: string;
};

export type OutfitImage = {
  base64: string;
  mimeType: string;
};

export type OutfitRecommendation = {
  text: string;
  outfit: OutfitDetails;
  reasoning?: string;
  weather: WeatherSummary;
  image?: OutfitImage | null;
};

export type OutfitRequestBody = {
  gender?: Gender;
  age?: number;
  favoriteColors?: string[];
  stylePreference?: StylePreference;
  activities?: Activity[];
  sensitivity?: Sensitivity | null;
  provinceId?: ProvinceId;
  locationId?: LocationId;
  forecastDay?: ForecastDay;
};

export type GeminiOutfit = {
  text: string;
  outfit?: OutfitDetails;
  reasoning?: string;
};

export type SelectOption<Value extends string = string> = {
  value: Value;
  label: string;
};

export type OutfitFormState = {
  gender: Gender | '';
  age: number | '';
  favoriteColors: string[];
  stylePreference: StylePreference | '';
  activities: Activity[];
  sensitivity: Sensitivity | '';
  provinceId: ProvinceId;
  locationId: LocationId;
  forecastDay: ForecastDay;
};

export type OutfitSubmitStatus =
  | 'idle'
  | 'validating'
  | 'loading-weather'
  | 'loading-text'
  | 'loading-image'
  | 'success'
  | 'error';

export type OutfitRecommendationPartial = {
  weather?: WeatherSummary;
  text?: string;
  reasoning?: string;
  outfit?: Partial<OutfitDetails>;
  image?: OutfitImage | null;
};

export type OutfitFormFieldErrors = Partial<
  Record<keyof OutfitFormState, string>
>;

export type VillageForecastItem = {
  baseDate: string;
  baseTime: string;
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
  nx: string;
  ny: string;
};
