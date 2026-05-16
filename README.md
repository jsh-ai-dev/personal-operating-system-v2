# Personal Operating System mk2

TypeScript 풀스택으로 구현한 Personal Operating System 시리즈의 메인 웹/BFF 저장소입니다.

Next.js를 브라우저의 단일 진입점으로 두고, mk2 자체 NestJS API, 분리된 auth-service, mk1 Spring 노트 API, mk3 FastAPI AI API를 동일한 JWT 주체(`sub`) 기준으로 연결합니다.

시리즈 저장소:

- [mk1 - Spring Boot 노트/검색/파일/AI 요약](https://github.com/jsh-ai-dev/personal-operating-system-mk1)
- [mk2 - 본 저장소, Next.js/NestJS 통합 웹과 인증](https://github.com/jsh-ai-dev/personal-operating-system-mk2)
- [mk3 - FastAPI AI 대화 저장, 임포트, 검색](https://github.com/jsh-ai-dev/personal-operating-system-mk3)

## 한눈에 보기

| 구분 | 내용 |
|---|---|
| 목적 | 개인 일정/목표/노트/AI 학습 데이터를 하나의 웹 진입점에서 다루는 통합 앱 |
| 핵심 역할 | Next.js BFF, 인증 쿠키 관리, mk2 API, mk1/mk3 프록시, React UI |
| 백엔드 | NestJS API와 별도 NestJS auth-service, Prisma/PostgreSQL, Redis |
| 프론트 | Calendar, Notes, AI Chat, AI Summary, AI Search, AI Quiz, AI News, AI Service Dashboard |
| 운영 요소 | Docker Compose, Kubernetes, AWS overlay, cert-manager TLS, Traefik HTTPS redirect, ECR 배포 workflow |

## 시스템 구조

```text
[Browser]
    |
    v
[mk2 Next.js :3000]
    ├─ UI: Calendar / Notes / AI Dashboard / AI Chat / Summary / Search / Quiz / News
    ├─ /api/auth/*        -> auth-service (:3002)
    ├─ /api/backend/*     -> mk2 NestJS API (:3001)
    ├─ /api/notes/*       -> mk1 Spring Boot REST (:8080)
    └─ /api/mk3/*         -> mk3 FastAPI (:8001)

[mk2 NestJS API :3001] -> Prisma, PostgreSQL, JWT 검증, Redis rate limit
[auth-service :3002]   -> 회원가입/로그인, JWT 발급, jti 블랙리스트, 세션 버전
[mk1 Spring :8080]     -> 노트, 파일, 검색, AI 요약
[mk3 FastAPI :8001]    -> AI 대화, 임포트, 의미 검색, 뉴스 분석
```

브라우저에는 httpOnly 쿠키만 저장하고, Next Route Handler가 쿠키의 토큰을 읽어 하위 서비스로 `Authorization: Bearer` 헤더를 전달합니다. 이 구조 덕분에 mk1/mk3 API를 직접 브라우저에 노출하지 않고 같은 로그인 세션으로 묶을 수 있습니다.

## 구현 기능

### 1. 인증과 BFF

- 회원가입, 로그인, 로그아웃
- 모든 기기 로그아웃: 사용자별 세션 버전(`sv`)을 올려 기존 JWT 무효화
- 현재 토큰 로그아웃: JWT `jti`를 만료 시각까지 Redis 블랙리스트에 저장
- middleware에서 보호 라우트 접근 시 auth-service `/api/auth/me`로 세션 검증
- `/api/backend/*`, `/api/notes/*`, `/api/mk3/*` 프록시에서 hop-by-hop 헤더 제거, 요청 body/응답 stream 전달
- 하위 서비스 주소는 `BACKEND_URL`, `AUTH_SERVICE_URL`, `NOTES_SERVICE_URL`, `MK3_SERVICE_URL`로 분리

### 2. Calendar / Goals

- 월간 6주 고정 그리드, 이전/다음 달, 오늘 이동
- 연/월 선택 컨트롤
- 날짜별 짧은 메모와 상세 메모
- 월간 목표, 주간 목표 저장
- 한국 공휴일 표시: `date-holidays` + 로컬 보정 데이터
- 달력 도메인 로직과 날짜 키 변환은 프레임워크 밖에서 Vitest로 검증

### 3. Notes 통합

mk1 REST API를 Next BFF로 프록시해 React 화면에서 사용합니다.

- 노트 목록, 상세, 작성, 수정, 삭제
- 검색어, 북마크 필터, 작성일/수정일/제목/관련도 정렬
- 페이지 크기 선택과 페이지 번호 UI
- `.txt`/`.pdf` 업로드
- PDF/텍스트 원본 새 탭 열기 또는 다운로드
- 북마크 토글
- 노트 AI 요약 생성/재생성/저장
- 요약 모델 tier, 토큰, 예상 비용 표시

### 4. mk3 AI 통합 UI

mk3의 Python/FastAPI 기능을 mk2의 React 화면으로 가져와 실사용 메인 UI를 구성했습니다.

- AI 서비스 대시보드
  - ChatGPT, Codex, Claude, Claude Code, Gemini, Copilot, Cursor 등 구독 서비스 CRUD
  - 월 구독료, 통화, 구독일, 사용량, 청구 URL, 메모 관리
  - 구독 그룹 중복 비용 제거(ChatGPT/Codex, Claude/Claude Code)
  - 카드 순서 드래그 저장
  - Codex/Claude/ChatGPT 스크래퍼 트리거와 마지막 동기화 시각 표시
- AI Chat
  - OpenAI/Gemini/Claude SSE 스트리밍 채팅
  - 모델 목록과 가격/제한 정보 조회
  - 대화/메시지 숨김, 복원, 수정, 삭제
  - assistant 메시지별 토큰과 비용 표시
- 대화 임포트
  - ChatGPT export, JetBrains Codex `.events`, Gemini Takeout, Claude export, Claude Code `.jsonl`
  - 파일 업로드 후 S3 기반 임포트 가능
  - 임포트 히스토리 표시
  - 서비스별/기간별 필터
- AI Summary / Quiz
  - 저장된 대화 요약 목록
  - OpenAI 모델 선택 후 퀴즈 생성/재생성/삭제
  - 퀴즈 풀이 화면에서 정답/해설 확인
- AI Search
  - mk3 Qdrant 의미 검색
  - 전체 대화 재인덱싱
  - 검색/인덱싱 비용 표시
- AI News
  - 날짜별 뉴스 스크랩
  - 기업/태그 필터
  - 기사 상세와 AI 분석, 예상 질문/답변 확인
  - 분석 모델 선택과 비용 표시

## 저장소 구조

```text
personal-operating-system-mk2/
├─ src/                         # Next.js App Router
│  ├─ app/                      # 페이지와 Route Handlers(BFF)
│  ├─ components/app-shell/     # 인증 후 공통 레이아웃과 내비게이션
│  ├─ features/
│  │  ├─ auth/                  # 로그인/회원가입 UI와 auth API client
│  │  ├─ calendar/              # domain/application/ui/infrastructure
│  │  ├─ notes/                 # mk1 노트 UI와 API client
│  │  └─ mk3/                   # AI Dashboard/Chat/Summary/Search/Quiz/News UI
│  └─ lib/                      # API client, URL resolver, auth constants
├─ backend/                     # NestJS 일정/목표 API
│  ├─ src/memo
│  ├─ src/goals
│  ├─ src/auth                  # JWT 검증과 revocation 확인
│  └─ prisma/                   # User, CalendarMemo, MonthlyGoal, WeeklyGoal
├─ auth-service/                # NestJS 인증 전용 서비스
├─ k8s/                         # Kubernetes base/AWS overlay
├─ compose.yaml                 # PostgreSQL + Redis
└─ compose.apps.yaml            # web + api + auth 컨테이너
```

## 백엔드 API

mk2 NestJS API:

| 영역 | Endpoint | 설명 |
|---|---|---|
| Health | `GET /api/health`, `GET /api/health/db` | 서버/DB 상태 확인 |
| Memos | `GET/POST /api/memos`, `GET/PUT/PATCH/DELETE /api/memos/:dateKey` | 날짜별 메모 |
| Monthly Goals | `GET/PUT/DELETE /api/monthly-goals/:yearMonth` | 월간 목표 |
| Weekly Goals | `GET /api/weekly-goals/batch`, `GET/PUT/DELETE /api/weekly-goals/:rangeKey` | 주간 목표 |

auth-service:

| Endpoint | 설명 |
|---|---|
| `POST /api/auth/register` | 회원가입, bcrypt hash 저장, JWT 발급 |
| `POST /api/auth/login` | 로그인, JWT 발급 |
| `GET /api/auth/me` | 현재 토큰 검증과 사용자 반환 |
| `POST /api/auth/logout` | 현재 JWT `jti` 블랙리스트 등록 |
| `POST /api/auth/sessions/revoke-all` | 모든 기기 로그아웃 |

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | TypeScript, Next.js 16 App Router, React 19, CSS Modules |
| BFF | Next Route Handlers, httpOnly cookie, server-side proxy |
| API | NestJS 11, Prisma 7, PostgreSQL 16, class-validator |
| Auth | Passport JWT, bcryptjs, Redis jti blacklist/session version/rate limit |
| Test | Vitest, Jest, Supertest |
| Infra | Docker Compose, Kubernetes, Kustomize, cert-manager, Traefik, GitHub Actions, AWS ECR |

## 로컬 실행

### 1. 의존성 설치

```powershell
npm install
npm install --prefix backend
npm install --prefix auth-service
```

### 2. 환경 파일 준비

```powershell
Copy-Item backend\.env.example backend\.env
npm run gen:jwt-secret --prefix backend
```

`backend/.env`의 주요 값:

```text
DATABASE_URL="postgresql://pos:pos@localhost:5433/pos_mk2?schema=public"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
JWT_SECRET=
JWT_EXPIRES_IN="7d"
REDIS_URL="redis://127.0.0.1:6380"
REDIS_KEY_PREFIX="pos:mk2"
```

mk1/mk3를 함께 연결하려면 Next 실행 환경에 다음 값도 맞춥니다.

```text
NOTES_SERVICE_URL=http://localhost:8080
MK3_SERVICE_URL=http://localhost:8001
AUTH_SERVICE_URL=http://127.0.0.1:3002
BACKEND_URL=http://127.0.0.1:3001
```

### 3. 개발용 실행

```powershell
.\dev.ps1
```

`dev.ps1`은 PostgreSQL/Redis를 Docker Compose로 올리고, `npm run dev:all`로 web/api/auth를 함께 실행합니다.

수동으로 나눠 실행할 수도 있습니다.

```powershell
docker compose up -d
npm run dev:all
```

기본 포트:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Auth: `http://localhost:3002`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`

### 4. 앱까지 Docker로 실행

```powershell
npm run docker:up
npm run docker:up:split
```

`compose.apps.yaml`의 web 컨테이너는 기본적으로 호스트의 mk1/mk3에 `host.docker.internal`로 접근하도록 구성되어 있습니다.

## 품질 확인

```powershell
npm run lint
npm run test                    # Vitest: calendar/date domain
npm run test --prefix backend   # Jest: Nest backend
npm run test:e2e --prefix backend
```

현재 테스트 범위:

- 달력 도메인: 월 시작일, 6주 고정 그리드, 오늘/현재 월 표시
- 날짜 키: `YYYY-MM-DD`, `YYYY-MM`
- 한국 공휴일 보정 데이터
- Nest e2e: health, DB health

## 배포와 운영 구성

- `Dockerfile.web`, `Dockerfile.api`, `Dockerfile.auth`: web/api/auth 분리 이미지
- `compose.yaml`: PostgreSQL 16, Redis 7
- `compose.apps.yaml`: web/api/auth 컨테이너 실행
- `k8s/base`: Namespace, ConfigMap, Secret 예시, PostgreSQL, Redis, Auth, API, Web, Ingress
- `k8s/overlays/aws`: 외부 RDS/Redis 연결, ECR 이미지 매핑, Traefik Ingress, cert-manager TLS
- `k8s/overlays/aws/certificate.mk2.yaml`: `www.jsh-ai-dev.com` TLS 인증서
- `.github/workflows/ecr-push.yml`: 수동 실행으로 web/api/auth 이미지를 ECR에 push하고 self-hosted runner에서 k3s rollout restart 수행
- `scripts/aws/check-overlay-placeholders.ps1`: 배포 전 placeholder/약한 기본값 검사
- `scripts/aws/validate-k8s-learning.ps1`: mk1/mk2/mk3 namespace rollout 검증

## 개발 흐름

커밋 히스토리는 mk2가 단순 캘린더에서 시리즈의 통합 게이트웨이로 확장된 과정을 보여줍니다.

1. Next.js 캘린더 기반과 TypeScript 도메인 테스트로 시작
2. NestJS/Prisma API를 붙여 메모와 월간/주간 목표를 사용자별로 저장
3. auth-service 분리, httpOnly 쿠키, JWT `sub`, Redis 블랙리스트/세션 버전 도입
4. mk1 노트 REST를 BFF로 연결해 노트 목록/상세/파일/AI 요약 UI 통합
5. mk3 FastAPI를 프록시해 AI 서비스 대시보드, 채팅, 요약, 퀴즈, 의미 검색, 뉴스 분석 화면을 React로 포팅
6. Docker split stack, Kubernetes base/AWS overlay, TLS/HTTPS redirect, ECR push, k3s 재배포 workflow 정리
7. 최근에는 캘린더/노트 조작 UI, mk3 Chat/Summary/Search/Quiz/News, 파일 업로드 임포트와 히스토리 표시를 개선

## 관련 문서

- `backend/README.md`: Nest backend 기본 설명
- `k8s/README.md`: Kubernetes 적용 방법
- `docs/aws-learning-deployment-runbook.md`: mk1~mk3 AWS 학습 배포 절차
- `docs/aws-data-services-checklist.md`: RDS, Redis, Elasticsearch, MongoDB, Qdrant 배치 체크리스트
- `AGENTS.md`, `CLAUDE.md`: 로컬 AI 에이전트 작업 가이드

## 라이선스

개인 사이드 프로젝트용입니다. 저장소 루트 및 각 패키지의 `package.json` 라이선스 필드를 따릅니다.
