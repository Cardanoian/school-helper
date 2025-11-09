- 상담 페이지는 상단 헤더, 채팅 뷰, 입력 영역, 설정 모달로 구성한다.
  - 헤더: 좌측 `뒤로가기` 아이콘(클릭 시 `/`로 이동), 중앙에 페이지 제목, 우측에 설정 아이콘 버튼을 배치한다.
  - 채팅 뷰: 사용자/봇 메시지를 좌우 정렬로 표시하고, 스트리밍 중인 메시지는 타이핑 인디케이터를 함께 보여준다.
  - 입력 영역: 텍스트 입력기 + 전송 버튼. `Enter` 전송, `Shift+Enter` 줄바꿈을 지원한다.
  - 설정 모달: 첫 렌더 시 자동으로 열리며, 사용자 나이/성별, 기타 상담에 필요한 속성과 상담봇 특징(MBTI 드롭다운, 답변 길이 옵션: 짧게/중간/길게)을 설정한다. 하단 `적용` 버튼으로 설정을 저장하고 모달을 닫는다.
- 상태 관리
  - 전역 상태 없이 `page.tsx` 내부에서 `useState` 기반으로 관리하며, 설정 정보는 로컬 스토리지에 저장해 재방문 시 복원한다.
  - 메시지 목록은 `{ id, role, content, createdAt }` 형태의 배열로 유지한다.
  - 전송 중인 메시지에 대한 optimistic 업데이트를 수행하고, 스트림 완료 시 실제 응답으로 덮어쓴다.
- Gemini 연동 흐름
  - 서버 라우트 `src/app/api/counseling/route.ts`에서 `GoogleGenAI` 인스턴스를 생성한다.
    ```ts
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    ```
  - `POST` 요청 본문 구조
    ```json
    {
      "history": [{ "role": "user" | "model", "parts": [{ "text": string }] }],
      "message": string,
      "config": { "mbti": string, "answerLength": "short" | "medium" | "long" }
    }
    ```
  - 서버는 `ai.chats.create({ model, history })` 후 `chat.sendMessageStream({ message })`를 호출하여 스트림을 획득한다.
    - 공식 예시와 동일한 방식으로 `for await...of` 루프를 돌며, 각 `chunk.text`를 `ReadableStream`으로 전달한다.
    - 응답 헤더는 `Content-Type: text/plain; charset=utf-8` 혹은 `text/event-stream`을 사용한다.
    - 스트림 도중 오류가 발생하면 스트림을 닫고 500 응답을 보낸다.
- 클라이언트 스트림 처리
  - `fetch('/api/counseling', { method: 'POST', body: JSON.stringify(...) })` 후 `response.body`를 `ReadableStreamDefaultReader`로 읽는다.
  - UTF-8 디코더로 chunk를 문자열로 변환해 누적하고, UI에 즉시 반영한다.
  - 스트리밍 완료 후 메시지 상태를 `done`으로 표시하고 스크롤을 가장 아래로 이동한다.
- 설정 모달 로직
  - 초기에 `useEffect`로 로컬 스토리지에서 설정을 불러오고 없으면 기본값을 적용하며 모달을 연다.
  - 사용자가 `적용` 버튼을 누르면 설정을 저장하고 모달을 닫는다. 모달 닫힌 후 첫 전송 시 설정 정보를 함께 서버에 전송한다.
- 에러 및 엣지 케이스
  - API 키 누락 시 서버에서 500 에러 메시지를 명시적으로 반환하고, 클라이언트에서 경고 토스트를 표시한다.
  - 네트워크/스트림 중단 시 로더를 중단하고 재시도 버튼을 제공한다.
  - 입력이 비어 있으면 전송 버튼을 비활성화한다.
