# Goal

## 작업
- 한 문장으로 설명: 선생님 선택/비밀번호 로그인, 관리자 지정, 댓글형 주간 메모와 비밀 메모 권한을 추가한다.
- 사용자에게 주는 가치: 사이트 접속자가 누구인지 식별하고, 반별 메모를 빠르게 남기면서 비밀 메모는 작성자와 관리자 중심으로 보호한다.

## 범위
### 포함
- 선생님 목록 기반 로그인 모달, 기본 비밀번호 `1234`, 브라우저 localStorage 로그인 유지
- 선생님 데이터에 관리자 여부 추가 및 선생님 상세 모달에서 관리자 지정 UI 추가
- 관리자 지정은 현재 로그인 선생님이 관리자일 때만 가능
- 주간 메모를 저장할 때 기존 메모를 덮어쓰지 않고 댓글처럼 새 항목으로 추가
- 메모를 선택 반 기준으로 필터링하고, 전체 선택 시 전체 메모 표시
- 메모 목록 5개 단위 페이지 처리
- `전도사님 공유` 라벨을 `비밀`로 변경
- 비밀 메모는 작성자와 관리자만 내용 열람 가능
- 특정 반의 비밀 메모는 해당 반 담임 선생님만 작성 가능
- Supabase migration, 타입, 단위/E2E 테스트, 진행 문서 갱신

### 제외
- 비밀번호 변경/초기화 UI
- Supabase Auth 기반 실제 계정 로그인
- 완전한 서버 세션/RLS 권한 전환. 현재 MVP의 공개 anon 쓰기 구조를 유지하되, 가능한 DB 구조와 클라이언트 권한 검증을 추가한다.

## 현재 상태
- 관련 화면/경로: `/attendance`, `/teachers`, 전역 layout
- 관련 테이블/migration: `teachers`, `attendance_sessions`, 신규 `attendance_memos`
- 관련 테스트: `tests/unit/supabase-store.test.ts`, `tests/unit/family-stats.test.ts`, `tests/e2e/attendance-mock.spec.ts`, `tests/db/phase-zero.test.ts`

## 가정과 결정 기록
- [2026-07-02] 기존 데이터에 관리자가 없으면 첫 활성 선생님을 초기 관리자로 지정한다 / 관리자 지정 기능의 부트스트랩이 필요함 / 이후에는 관리자만 변경 가능
- [2026-07-02] 기본 비밀번호는 모든 선생님 공통 `1234`로 검증한다 / 사용자가 초기 비밀번호만 요청함 / 추후 비밀번호 변경 기능이 필요하면 별도 작업
- [2026-07-02] 현재 앱은 공개 Supabase anon 쓰기 구조이므로 완전한 서버/RLS 권한 보장은 이번 범위에서 제외하고 UI/클라이언트 검증과 DB 필드 기반으로 구현한다 / 전체 Auth 전환은 별도 설계 필요

## 완료 조건
- [x] 알 수 없는 접속자는 선생님 선택과 비밀번호 입력 전까지 화면 기능을 사용할 수 없다. 증거: `TeacherAuthProvider` 전역 모달, mock E2E 로그인 후 출석 화면 접근.
- [x] 로그인 성공 후 같은 브라우저에서 재접속하면 다시 로그인하지 않는다. 증거: `seed-current-teacher-v1` localStorage 저장, app-shell E2E helper 갱신.
- [x] 선생님 상세 모달에서 관리자만 관리자 여부를 변경할 수 있다. 증거: `useTeacherAuth().isAdmin` 기반 관리자 체크박스 표시.
- [x] 메모 저장 시 새 댓글형 메모가 추가되고 기존 메모가 덮어써지지 않는다. 증거: `attendance_memos` insert, mock E2E에서 `attendance_records` 추가 mutation 없음 확인.
- [x] 메모 목록은 선택 반 기준으로 필터링되고 전체 선택 시 전체 메모가 표시된다. 증거: `getAttendanceMemosForView` 단위 테스트.
- [x] 메모 목록은 한 페이지 5개로 페이지 처리된다. 증거: 출석 화면 `memoPageCount`, `pagedMemos` 구현.
- [x] 비밀 메모 내용은 작성자와 관리자만 볼 수 있고, 권한이 없는 경우 비밀 처리된다. 증거: `canViewAttendanceMemo` 단위 테스트 및 UI 마스킹.
- [x] 특정 반의 비밀 메모는 해당 반 담임 선생님만 작성할 수 있다. 증거: `canCreateSecretAttendanceMemo` 단위 테스트 및 저장 전 검증.
- [x] 필요한 migration과 TypeScript 타입이 현재 코드와 일치한다. 증거: `20260702000100_teacher_auth_and_attendance_memos.sql`, `types/database.generated.ts`, typecheck 통과.
- [x] 관련 테스트가 추가/갱신되고 통과한다. 증거: typecheck, eslint, unit, db, mock E2E, build 통과.
- [x] `docs/PROGRESS.md`에 작업 결과와 검증을 기록한다.

## 테스트 계획
- 정적 검사: `pnpm run typecheck`, `pnpm run lint`
- 단위 테스트: `pnpm run test`
- 데이터베이스/RLS 테스트: `pnpm run test:db`
- E2E 테스트: `pnpm run test:e2e` 또는 관련 mock E2E 우선 실행
- 수동 확인 화면 크기: 390x844 모바일, 1280px 데스크톱

## 위험과 되돌리기
- 위험: 현재 공개 anon Supabase 구조에서는 브라우저 캐시 기반 로그인과 관리자 체크를 완전한 보안 경계로 볼 수 없다.
- 위험: 새 `attendance_memos`, `teachers.is_admin` migration이 배포 DB에 적용되기 전에는 저장/조회가 실패할 수 있다.
- 롤백 방법: 신규 migration 적용 전이면 코드 변경을 되돌린다. 적용 후에는 새 컬럼/테이블을 사용하지 않는 이전 코드로 되돌릴 수 있으나 DB에는 미사용 데이터가 남는다.

## 검증 결과
- 실행한 명령: `pnpm run typecheck`
- 결과: 통과
- 실행한 명령: `pnpm run lint`
- 결과: `pnpm.exe` 접근 거부
- 실행한 명령: `.\node_modules\.bin\eslint.cmd .`
- 결과: 통과
- 실행한 명령: `.\node_modules\.bin\vitest.cmd run`
- 결과: 5 files, 24 tests 통과
- 실행한 명령: `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
- 결과: 1 file, 1 test 통과
- 실행한 명령: `.\node_modules\.bin\playwright.cmd test tests/e2e/attendance-mock.spec.ts --project=webkit-mobile`
- 결과: sandbox에서는 Next dev server `Access is denied`; 권한 상승 재실행 통과
- 실행한 명령: `pnpm run build`
- 결과: 통과
- 남은 문제: 전체 `playwright test`는 원격 Supabase 테스트 초기화가 데이터를 덮어쓰는 위험으로 승인 검토에서 차단되어 실행하지 않았다. 새 migration 적용이 배포 전 필요하다. 현재 로그인/권한은 공개 anon Supabase 구조 위의 클라이언트 검증이므로 완전한 서버/RLS 보안 경계는 별도 작업이다.
