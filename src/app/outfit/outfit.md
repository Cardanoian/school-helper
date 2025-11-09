# Outfit 추천 페이지 기획서

## 1. 페이지 목적 및 사용자 여정

- **목적**: 사용자가 자신의 기본 신체/스타일 선호 정보와 실시간 기상 정보를 결합해, 당일 착용하기 적합한 코디 텍스트 가이드와 이미지를 제공한다.
- **핵심 가치**: 맞춤형 추천, 시각적 레퍼런스 제공, 예보 기반 실용성 확보.
- **사용자 여정**:
  1. 페이지 진입 → 서비스 소개 및 입력 폼 노출
  2. 사용자 입력(성별, 나이, 선호 색/스타일 등) → 입력 검증
  3. 위치 또는 지역 선택 → 기상청 API 호출 준비
  4. CTA 클릭 시 기상 데이터 fetch → Gemini 텍스트 모델 호출 → JSON 응답 파싱
  5. 텍스트 추천 및 `outfit` 설명 표시
  6. `outfit` 정보를 Gemini 이미지 모델에 전달 → 이미지 생성 결과 렌더링/다운로드 지원
  7. 결과 공유/새 추천 요청 등의 후속 행동 제공

---

## 2. 사용자 입력 폼 설계

| 필드              | 타입              | 필수 | 검증 규칙                                                      | 설명                       |
| ----------------- | ----------------- | ---- | -------------------------------------------------------------- | -------------------------- |
| `gender`          | select            | Y    | 값: `male`, `female`, `nonbinary` 등 미리 정의                 | 착용 대상 기준             |
| `ageRange`        | select            | Y    | 범위 옵션(예: `10s`, `20s`, `30s`, `40s+`) 중 선택             | 온도 체감/스타일 추천 기준 |
| `favoriteColors`  | multiselect       | N    | 최대 3개, `#[0-9A-F]{6}` 또는 프리셋 색상                      | 추천 색상 강조             |
| `stylePreference` | select            | Y    | 옵션: `casual`, `street`, `formal`, `minimal`, `athleisure` 등 | 추천 스타일 토닝           |
| `activities`      | multiselect       | N    | `commute`, `office`, `outdoor`, `date`, `school` 등            | 활동 상황 반영             |
| `sensitivity`     | select            | N    | `cold`, `neutral`, `warm`                                      | 온도 민감도 반영           |
| `location`        | text/autocomplete | Y    | 기상청 API가 지원하는 지역 코드 매핑                           | 기상 데이터 입력값         |
| `forecastDay`     | segmented toggle  | Y    | 옵션: `today`, `tomorrow`, `dayAfter`                          | 추천 기준 날짜 선택        |

### 폼 UX 고려사항

- 비활성 상태에서 필수 입력 누락 시 submit 불가, 필드별 에러 메시지 제공.
- 입력 완료 후 요약 카드/확인 모달로 재확인 옵션 제공.
- 접근성: 라벨-입력 연결, 키보드 네비게이션, 명확한 오류 메시지.

---

## 3. 기상청 API 연동 플로우

1. **엔드포인트**: 기상청 초단기/단기 예보 REST API (예: `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`).
2. **입력 파라미터**
   - `serviceKey`: 환경 변수로 주입 (`process.env.WEATHER_API_KEY`).
   - `numOfRows`, `dataType`(`JSON`), `pageNo` 기본값 설정.
   - `base_date`, `base_time`: 사용자 선택/현재 시각을 정규화 (예: 최근 발표시각).
   - `nx`, `ny` 또는 지역 코드: `location` 입력에서 변환.
3. **응답 필드**
   - 강수확률(`POP`), 기온(`TMP`), 체감온도(`WCI`), 풍속(`WSD`), 습도(`REH`) 등.
   - 필요 시 강수 형태(`PTY`), 하늘 상태(`SKY`), 일출/일몰.
4. **에러 처리**
   - API 실패 시 재시도 로직(최대 1~2회) → 실패 시 사용자 경고.
   - 시간대별 데이터 중 가장 가까운 시간 슬롯으로 보정.
5. **캐싱 전략**
   - 동일 지역+시간 요청 반복 시 10~15분 캐싱 (Next.js `revalidateTag` 활용 고려).

---

## 4. Gemini 2.5 Flash 텍스트 모델 연동

### 목적

- 사용자 입력 + 기상 데이터 → 자연어 코디 가이드, 구조화 JSON 생성.

### 요청 구성

```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    {
      role: 'user',
      parts: [
        {
          text: JSON.stringify({
            gender,
            ageRange,
            favoriteColors,
            stylePreference,
            activities,
            sensitivity,
            weather: weatherSummary,
          }),
        },
      ],
    },
  ],
  config: {
    systemInstruction:
      'You are a fashion stylist AI that returns JSON with fields text and outfit.',
    responseMimeType: 'application/json',
  },
});
```

### 기대 응답 스키마

```json
{
  "text": "오늘은 ...",
  "outfit": {
    "top": "라이트 니트 ...",
    "bottom": "와이드 팬츠 ...",
    "outer": "필요 시 ...",
    "shoes": "로퍼 ...",
    "accessories": ["..."],
    "notes": "기상 관련 주의사항"
  },
  "reasoning": "(선택) 추천 근거"
}
```

- `response.text`가 없을 경우 `response.candidates[0].content.parts`를 JSON 파싱.
- JSON 파싱 실패 대비 try/catch + fallback 메시지 제공.

---

## 5. Gemini 2.5 Flash Image 연동

### 프롬프트 템플릿

```
Generate a full-body portrait of a person standing, wearing the outfit described below.
- Gender: {gender}
- Age: {ageRange}
- Style: {stylePreference}
- Colors: {favoriteColors}
- Weather context: {weatherSummary}
- Outfit details: {outfit top/bottom/outer/shoes/accessories}
```

- 이미지 모델은 텍스트 결과 `outfit`을 구조화하여 줄글로 전달.
- `safetySettings`(필요 시)로 NSFW 차단.

### 호출 예시

```ts
const imageResponse = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: [{ text: prompt }],
});

for (const part of imageResponse.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, 'base64');
    await fs.promises.writeFile('outfit.png', buffer);
  }
}
```

### 출력 처리

- 생성 이미지 base64 → `Blob` → object URL로 미리보기.
- 다운로드 버튼 제공, 실패 시 안내 메시지.

---

## 6. UI/상태/오류 처리 전략

- **레이아웃**: 좌측 입력 폼, 우측 결과/프리뷰 섹션(모바일에서는 상하 배치).
- **상태 관리**: React hook 기반 상태(`useState` + `useReducer`), API 호출은 React Query 또는 SWR.
- **로딩 단계**
  1. 기상 정보 fetch 로딩 스피너
  2. Gemini 텍스트 생성 로딩 메시지
  3. Gemini 이미지 생성 로딩 애니메이션
- **오류 UI**
  - 입력 검증 오류: 인라인 메시지
  - API 오류: Alert/Toast + 재시도 버튼
  - 이미지 실패: 실패 일러스트 + 텍스트 결과만 제공
- **상태 보존**: 결과 수신 후 입력 값과 추천 내용을 로컬 상태에 보존, 새 요청 시 재사용 가능.

---

## 7. 추가 고려사항

- **성능**: API 연쇄 호출 지연 최소화, 비동기 병렬화(기상 데이터와 텍스트 모델 호출 준비 동시 처리).
- **보안**: API 키는 서버 환경 변수, 클라이언트 호출은 Next.js API Route를 통해 프록시.
- **접근성**: 색 대비 준수, 이미지 alt 텍스트에 코디 요약 제공.
- **국제화**: 텍스트 응답 언어 옵션(ko/en) 추후 확장 고려.
- **로그/분석**: 사용자 입력과 추천 결과를 익명 통계로 수집해 추천 개선.
- **에지 케이스**: 극단적 기상(폭설, 폭염) 시 별도 경고 메시지, 이미지 모델 프롬프트 안전 장치 추가.
