# Personal Operating System mk2

`mk2`는 Personal Operating System의 메인 웹 앱이자 BFF입니다. Next.js가 브라우저 진입점과 서버 사이드 프록시를 담당하고, NestJS API가 일정/목표 데이터를 관리하며, 인증 전용 NestJS auth-service가 회원가입, 로그인, JWT 발급/폐기를 처리합니다.

`mk1`의 노트 API와 `mk3`의 AI API는 브라우저에 직접 노출하지 않고 Next Route Handler를 통해 프록시합니다. 사용자는 하나의 httpOnly 쿠키 세션으로 Calendar, Notes, Dashboard, AI Chat, Summary, Search, Quiz, News 화면을 사용합니다.

## 시스템 구조

```text
Browser
  |
  v
mk2 Next.js :3000
  ├─ App Router UI: Calendar, Notes, mk3 AI 화면
  ├─ /api/auth/*     -> auth-service :3002
  ├─ /api/backend/*  -> mk2 NestJS API :3001
  ├─ /api/notes/*    -> mk1 Spring Boot :8080
  └─ /api/mk3/*      -> mk3 FastAPI :8001

mk2 NestJS API :3001
  └─ Prisma + PostgreSQL, JWT guard, Redis rate limit

auth-service :3002
  └─ 회원가입/로그인, JWT jti blacklist, 사용자별 session version
```

Next middleware는 보호 라우트 접근 전에 auth-service의 `/api/auth/me`로 세션을 확인합니다. Route Handler는 쿠키의 JWT를 읽어 하위 서비스에 `Authorization: Bearer` 헤더로 전달합니다.

## 기능

### 인증/BFF

- 회원가입, 로그인, 로그아웃
- 현재 토큰 로그아웃: JWT `jti`를 만료 시각까지 Redis denylist에 저장
- 모든 기기 로그아웃: 사용자별 session version을 올려 기존 JWT 무효화
- `/calendar`, `/notes`, `/mk3/*` 보호 라우트 middleware 검증
- mk1/mk3/mk2 API로의 서버 사이드 프록시

### Calendar / Goals

- 날짜별 짧은 메모, 상세 메모, 체크리스트
- 월간 목표, 주간 목표 저장
- `date-holidays`를 이용한 한국 공휴일 표시

### Notes 통합

- mk1 REST API를 통한 노트 목록/상세/작성/수정/삭제
- 노트 검색, 북마크, AI 요약 생성
- `.txt`, `.pdf` 업로드, 원본 보기/다운로드
- 요약 모델 tier, 토큰, 예상 비용 표시

### mk3 AI 통합 UI

- AI 서비스 구독 Dashboard: ChatGPT, Codex, Claude, Claude Code, Gemini, Cursor 등 CRUD와 사용량 동기화
- AI Chat: OpenAI, Gemini, Claude SSE 스트리밍 채팅
- Import/Summary/Quiz: 대화 내역 가져오기, 요약 생성, 퀴즈 생성/풀이
- AI Search: mk3 Qdrant 벡터 검색
- AI News: 뉴스 스크랩, 기업/태그 필터, 기사 분석

## 저장소 구조

```text
personal-operating-system-mk2/
├─ src/                         # Next.js App Router
│  ├─ app/                      # page, layout, Route Handler(BFF)
│  ├─ components/app-shell/     # 인증 후 공통 레이아웃과 내비게이션
│  ├─ features/auth/            # 로그인/회원가입 UI와 API client
│  ├─ features/calendar/        # calendar domain/application/ui/infrastructure
│  ├─ features/notes/           # mk1 notes UI와 API client
│  ├─ features/mk3/             # mk3 AI 화면과 API client
│  └─ lib/                      # 공통 API client, 서비스 URL resolver, auth constants
├─ backend/                     # NestJS 일정/목표 API
│  ├─ src/memo
│  ├─ src/checklist
│  ├─ src/goals
│  ├─ src/auth                  # JWT 검증과 revocation 확인
│  └─ prisma/                   # User, CalendarMemo, CalendarChecklist, MonthlyGoal, WeeklyGoal
├─ auth-service/                # NestJS 인증 전용 서비스
├─ k8s/                         # Kubernetes base/AWS overlay
├─ compose.yaml                 # PostgreSQL + Redis
└─ compose.apps.yaml            # web + api + auth 컨테이너
```

## 주요 API

mk2 NestJS API:

| 영역 | Endpoint | 설명 |
|---|---|---|
| Health | `GET /api/health`, `GET /api/health/db` | 서버와 DB 상태 확인 |
| Memos | `GET/POST /api/memos`, `GET/PUT/PATCH/DELETE /api/memos/:dateKey` | 날짜별 메모 |
| Calendar Checklists | `GET/PUT /api/calendar-checklists/:dateKey` | 날짜별 체크리스트 |
| Monthly Goals | `GET/PUT/DELETE /api/monthly-goals/:yearMonth` | 월간 목표 |
| Weekly Goals | `GET /api/weekly-goals/batch`, `GET/PUT/DELETE /api/weekly-goals/:rangeKey` | 주간 목표 |

auth-service:

| Endpoint | 설명 |
|---|---|
| `POST /api/auth/register` | 회원가입, bcrypt hash 저장, JWT 발급 |
| `POST /api/auth/login` | 로그인, JWT 발급 |
| `GET /api/auth/me` | 현재 JWT 검증과 사용자 반환 |
| `POST /api/auth/logout` | 현재 JWT `jti` denylist 등록 |
| `POST /api/auth/sessions/revoke-all` | 모든 기기 세션 무효화 |

Next BFF:

| Endpoint | 대상 |
|---|---|
| `/api/backend/*` | mk2 NestJS API |
| `/api/notes/v1/*` | mk1 `/api/v1/*` |
| `/api/mk3/v1/*` | mk3 `/api/v1/*` |
| `/api/auth/*` | auth-service |

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | TypeScript, Next.js 16 App Router, React 19, CSS Modules |
| BFF | Next Route Handlers, httpOnly cookie, middleware |
| API/Auth | NestJS 11, Passport JWT, class-validator |
| Persistence | Prisma 7, PostgreSQL 16 |
| Session control | Redis jti denylist, session version, rate limit |
| Test | Vitest, Jest, Supertest |
| Infra | Docker Compose, Kubernetes, Kustomize, cert-manager, Traefik, GitHub Actions, AWS |

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

`gen:jwt-secret` 출력값을 `backend\.env`의 `JWT_SECRET`에 넣습니다.

주요 값:

```text
# backend/.env: mk2 Nest API와 auth-service가 함께 사용
DATABASE_URL="postgresql://pos:pos@localhost:5433/pos_mk2?schema=public"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
JWT_SECRET=
JWT_EXPIRES_IN="7d"
REDIS_URL="redis://127.0.0.1:6380"
REDIS_KEY_PREFIX="pos:mk2"
```

하위 서비스 주소는 기본값으로 로컬 포트를 사용하며, 필요 시 루트 `.env.local`에서 변경할 수 있습니다.

```text
BACKEND_URL=http://127.0.0.1:3001
AUTH_SERVICE_URL=http://127.0.0.1:3002
NOTES_SERVICE_URL=http://localhost:8080
MK3_SERVICE_URL=http://localhost:8001
```

`JWT_SECRET`는 mk1의 `POS_JWT_SECRET`와 같은 값을 사용해야 합니다. mk3는 auth-service의 `/api/auth/me`로 JWT를 검증합니다.

처음 빈 PostgreSQL을 쓰는 경우에는 인프라를 먼저 띄운 뒤 Prisma migration을 한 번 적용합니다. `auth-service`도 같은 `users` 테이블을 쓰므로 migration은 `backend/prisma` 기준으로 관리합니다.

```powershell
docker compose up -d
npm run prisma:migrate --prefix backend
```

`.\dev.ps1`로 실행하는 경우에는 이 migration 단계가 자동으로 처리됩니다.

### 3. 개발용 실행

```powershell
.\dev.ps1
```

스크립트는 PostgreSQL/Redis를 Docker Compose로 실행하고 backend Prisma migration을 적용한 뒤 `npm run dev:all`로 web/api/auth를 함께 띄웁니다.

수동 실행:

```powershell
docker compose up -d
npm run prisma:migrate --prefix backend
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
npm run docker:up:split
```

`compose.apps.yaml`의 web 컨테이너는 기본적으로 호스트의 mk1/mk3를 `host.docker.internal`로 호출합니다.

## 테스트

```powershell
npm run lint
npm run test
npm run test --prefix backend
npm run test:e2e --prefix backend
```

현재 테스트는 캘린더/날짜 도메인, 한국 공휴일 보정, Nest health e2e와 DB health를 중심으로 검증합니다.

## 배포 구성

- `Dockerfile.web`, `Dockerfile.api`, `Dockerfile.auth`: web/api/auth 이미지 분리
- `k8s/base`: Namespace, ConfigMap, Secret 예시, PostgreSQL, Redis, Auth, API, Web, Ingress
- `k8s/overlays/aws`: 외부 RDS/Redis, ECR 이미지, Traefik Ingress, cert-manager TLS
- `.github/workflows/ecr-push.yml`: web/api/auth 이미지를 ECR push 후 self-hosted runner에서 k3s rollout restart
