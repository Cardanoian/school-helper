<div align="center">

# School Helper

학교 생활을 조금 더 가볍고 편안하게 만들어 주는 개인화 AI 도우미 웹앱입니다.  
학생들이 매일 마주하는 고민과 준비 과정을 돕는 것을 목표로 하고 있습니다.

</div>

## 주요 기능

- **홈 대시보드**  
  `src/app/page.tsx`에서 확인할 수 있는 홈 화면은 앱의 핵심 기능을 한눈에 보여주고, 각 기능 페이지로 빠르게 이동할 수 있도록 구성되어 있습니다.

- **고민 상담(`counseling`)**  
  익명으로 고민을 나누고 공감받을 수 있는 공간을 준비 중입니다.  
  예정 기능: 고민 등록 및 응답, 카테고리 분류, 상담 가이드 제공.

- **날씨 맞춤 옷차림(`outfit`)**  
  위치 기반 날씨 정보에 맞춰 착장을 추천하는 기능을 개발 중입니다.  
  예정 기능: 체감 온도, 의류 카테고리 추천, 필수 아이템 알림.

앞으로 학사 일정 관리, 학습 계획 보조 등 다양한 도구를 순차적으로 확장할 예정입니다.

## 빠른 시작

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
# Turbopack 기반 빠른 HMR 지원

# http://localhost:3000 에 접속
```

## 개발 환경

- Node.js 20 이상 필수
- 패키지 매니저: npm (yarn/pnpm/bun도 사용 가능)
- Next.js App Router 기반 (`src/app`)

## 기술 스택

- Next.js 16 + TypeScript
- React 19
- Tailwind CSS v4 (Shadcn UI 컴포넌트 포함)
- Lucide 아이콘

## 프로젝트 구조 (요약)

```
src/
 ├─ app/
 │   ├─ page.tsx          # 홈 대시보드
 │   ├─ counseling/       # 고민 상담 안내 페이지
 │   └─ outfit/           # 날씨 맞춤 옷차림 안내 페이지
 ├─ components/ui/        # UI 컴포넌트 (Button 등)
 └─ lib/                  # 공용 유틸
```

## 기여 및 피드백

기능 제안, 버그 제보, 디자인 피드백 모두 환영합니다.  
이슈나 PR을 통해 자유롭게 의견을 남겨 주세요.
