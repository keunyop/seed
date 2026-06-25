# Progress

## 2026-06-23

### 완료
- Phase 0 저장소 기준선 구축
- Next.js 16 App Router, React 19, TypeScript strict, pnpm lockfile 구성
- Tailwind CSS v4 디자인 토큰과 모바일 우선 앱 셸 구현
- `/dashboard`와 `/login` placeholder 구현
- Supabase local `config.toml`, `seed.sql`, `.env.example` 추가
- Vitest 단위 테스트, DB 기준선 테스트, Playwright Chromium/WebKit smoke test 추가

### 검증
- `pnpm lint`: 통과
- `pnpm typecheck`: 통과
- `pnpm test`: 2 files, 4 tests 통과
- `pnpm test:db`: 1 file, 1 test 통과
- `pnpm test:e2e`: Chromium mobile/desktop, WebKit mobile 6 tests 통과
- `pnpm build`: 통과

### 다음 단계
- Phase 1: Supabase Auth SSR, profiles/organizations/memberships migration, 기본 RLS 정책과 권한 테스트
- 현재 환경에는 `supabase` CLI와 Docker가 PATH에 없어 local Supabase를 시작할 수 없음
- 실제 초대/로그인 흐름 구현 전 Docker Desktop + Supabase CLI 설치 또는 원격 Supabase 프로젝트 정보 필요

## 2026-06-25

### 제품 결정
- MVP 범위가 로그인 없는 패밀리 오픈으로 변경됨
- 이번 MVP는 중앙 DB 공개 쓰기를 열지 않고 브라우저 `localStorage` 저장을 사용하기로 함
- Supabase Auth/RLS는 여러 기기 공유나 운영 권한이 필요해지는 다음 단계로 이동

### 완료
- `instruction.md`, `docs/MVP_DESIGN_SPEC.md`, `README.md`를 로그인 없는 패밀리 오픈 MVP 기준으로 갱신
- `/login`은 `/dashboard`로 리다이렉트하도록 정리하고, `/dashboard`, `/attendance`, `/children`, `/reports`를 로그인 없이 접근 가능한 앱 흐름으로 구현
- 브라우저 `localStorage` 기반 반/아이/출석/큐티/메모 저장소와 기본 샘플 데이터를 추가
- 아이 추가, 날짜/반별 출석 체크, 전체 출석/결석 처리, 큐티 체크, 주간 출석과 월간 큐티/생일 통계를 구현
- 모바일 하단 내비게이션, 저장 상태, 로딩/빈 상태 메시지를 추가
- no-login/local-first 범위에 맞춰 단위 테스트와 E2E 테스트를 갱신

### 검증
- `pnpm run lint`: 통과
- `pnpm run typecheck`: 통과
- `pnpm run test`: 3 files, 6 tests 통과
- `pnpm run test:db`: 1 file, 1 test 통과
- `pnpm run test:e2e`: Chromium mobile/desktop, WebKit mobile 9 tests 통과
- `pnpm run build`: 통과

### 다음 단계
- 실제 여러 기기에서 같은 데이터를 공유해야 하면 Supabase Auth/RLS 복귀 또는 공유 키 기반 저장 방식을 별도 결정
- localStorage 데이터 백업/내보내기, 반 관리, 아이 비활성화 UI는 MVP 이후 개선 후보
- 현재 `.git` 디렉터리가 비어 있어 로컬 Git 상태 확인이나 커밋 작업은 불가
