# Personal Operating System v2

TypeScript 기반 풀스택 개발 학습을 목표로 진행하는 사이드 프로젝트입니다.  
이 저장소는 3개 프로젝트를 개별로 개발한 뒤 MSA로 통합하기 위한 두 번째 프로젝트입니다.

## 프로젝트 목표

- 백엔드 중심 경험을 바탕으로 풀스택 개발 학습 확장
- TypeScript, Next.js, React, NestJS, PostgreSQL 실전 학습
- 학습 내용을 GitHub에 지속적으로 기록하고 개선

## 현재 구현 범위

- 월간 달력 화면
- 이전 달 / 다음 달 / 오늘 이동
- 날짜 선택 인터랙션
- 테스트 가능한 달력 도메인 로직 분리

## 기술 스택

### 프론트엔드

- TypeScript
- Next.js (App Router)
- React

### 백엔드 (예정)

- NestJS
- Node.js
- PostgreSQL

### 개발 도구

- ESLint
- Vitest
- Cursor

## 설계 방향

과도한 복잡도는 피하면서, 아래 원칙을 실용적으로 적용합니다.

- Clean Code: 명확한 네이밍, 단일 책임 함수, 읽기 쉬운 구조
- Clean Architecture 스타일 분리
  - `domain`: 순수 비즈니스/날짜 계산 로직
  - `application`: 상태 및 유스케이스 조합
  - `ui`: 렌더링 및 사용자 상호작용
- TDD 관점: 핵심 도메인 로직 단위 테스트 우선
- 확장성: 이후 NestJS REST API 연동 시 UI 수정 최소화

## 디렉터리 구조

```text
src/
  app/
    page.tsx
  features/
    calendar/
      domain/
        calendar.ts
        calendar.spec.ts
        types.ts
      application/
        useCalendar.ts
      ui/
        Calendar.tsx
        Calendar.module.css
```

## 실행 방법

### 1) 의존성 설치

```bash
npm install
```

### 2) 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 3) 품질 검사

```bash
npm run lint
npm run test
```

## 학습 포인트

- React 컴포넌트와 상태를 분리해 UI 구성
- 프레임워크 의존 코드와 순수 도메인 로직 분리
- 단위 테스트 기반으로 동작 검증 및 유지보수성 향상
- MSA 통합을 고려한 기능 단위 구조화

## 로드맵

- [ ] NestJS 일정 관리 REST API 구축
- [ ] PostgreSQL 연동 및 데이터 영속화
- [ ] 달력 UI와 API 데이터 연동
- [ ] 인증/인가 기본 흐름 추가
- [ ] 주간/일간 뷰 및 반복 일정 기능 확장
