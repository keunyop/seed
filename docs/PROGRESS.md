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

## 2026-06-26

### 제품 결정
- 홈 화면은 반 선택만 남기는 단순 진입 화면으로 정리
- 아이 상세 정보 범위를 이름, 사진, 성별, 생년월일, 보호자 여러 명, 주소, 이메일, 등록일, 반, 특이사항까지 확장
- 확장 개인정보와 사진은 서버 업로드 없이 현재 MVP의 `localStorage`에만 저장

### 완료
- `/dashboard`에서 통계와 저장 안내 설명을 제거하고 반 선택 카드만 남김
- `/attendance`에서 설명성 문구를 줄이고 기존 날짜/반 선택, 전체 출석/결석, 출석·큐티 토글, 메모 저장 흐름을 유지
- `/children`에 반별 필터와 이름 필터 추가
- 아이 추가를 팝업 모달로 변경하고 요청된 상세 입력 필드와 보호자 여러 명 입력을 구현
- `/reports`에서 주간 출석, 월간 큐티, 월간 생일 카드를 클릭하면 상세 명단 모달이 열리도록 구현
- 통계 상세 명단 모달에 복사 아이콘 버튼과 클립보드 fallback을 추가
- `docs/MVP_DESIGN_SPEC.md`와 `README.md`를 확장된 localStorage 개인정보 범위에 맞게 갱신

### 검증
- `pnpm run lint`: 통과
- `pnpm run typecheck`: 통과
- `pnpm run test`: 3 files, 6 tests 통과
- `pnpm run test:db`: 1 file, 1 test 통과
- `pnpm run test:e2e`: Chromium mobile/desktop, WebKit mobile 9 tests 통과
- `pnpm run build`: 통과

### 다음 단계
- 여러 기기 공유가 필요해지면 개인정보 범위 확장에 맞춘 Supabase Auth/RLS 또는 공유 코드 저장 방식을 별도 설계
- 사진은 500KB 이하 Data URL로 제한되어 있으므로 실제 운영 전 외부 스토리지 또는 사진 URL 방식 검토 필요
- 아이 정보 수정/삭제, 반 관리, 데이터 백업/내보내기는 이후 개선 후보

## 2026-06-26 추가

### 제품 결정
- Supabase DB 전환은 보류하고 UI와 localStorage 저장 흐름만 먼저 진행
- 출석/결석은 새 세션에서 기본 미선택 상태로 시작
- 출석 화면은 행별 즉시 저장이 아니라 메모 아래 `전체 저장` 버튼으로 한 번에 저장

### 완료
- 홈 화면 상단에 `밴쿠버한인침례교회`와 `초등부` 표시 추가
- 출석 화면에서 `전체 출석`, `전체 결석` 버튼 제거
- 출석 화면에서 출석/결석/큐티를 draft로 편집하고 `전체 저장`으로 저장하도록 변경
- 출석 화면의 아이 이름 클릭 시 상세정보 보기/수정 모달 표시
- 아이들 화면의 아이 카드 클릭 시 상세정보 보기/수정 모달 표시
- 아이 상세 모달을 공통 컴포넌트로 분리해 추가/수정 필드가 동일하게 유지되도록 정리
- `docs/MVP_DESIGN_SPEC.md`와 테스트를 새 출석 저장 흐름에 맞게 갱신

### 검증
- `pnpm run lint`: 통과
- `pnpm run typecheck`: 통과
- `pnpm run test`: 3 files, 7 tests 통과
- `pnpm run test:db`: 1 file, 1 test 통과
- `pnpm run test:e2e`: Chromium mobile/desktop, WebKit mobile 9 tests 통과
- `pnpm run build`: 통과

### 다음 단계
- Supabase 전환 시 Auth/RLS 또는 공유 코드 방식 결정 필요
- localStorage 기존 세션에 이미 저장된 결석 기록은 그대로 유지되며, 새 세션부터 미선택 기본값이 적용됨

## 2026-06-26 반/선생님 관리

### 제품 결정
- 반과 아이 관계는 아이 정보에 현재 반(`classId`)을 선택하는 방식으로 유지
- 반에는 담임 선생님(`teacherId`)을 연결
- 반 등록은 홈 화면, 선생님 등록은 새 `선생님` 화면에서 처리
- 이번 작업도 Supabase DB 없이 `localStorage` 저장 유지

### 완료
- 선생님 데이터 모델과 기본 선생님 데이터를 추가
- 하단 메뉴에 `선생님` 탭과 `/teachers` 화면 추가
- 선생님 등록 UI 추가
- 홈 화면에 반 등록 폼 추가: 반 이름과 담임 선생님 선택
- 홈 반 목록에서 인원 수를 제거하고 담임 선생님 이름 표시
- 출석 화면 반 드롭다운에 담임 선생님 이름 표시
- 출석 카드에서 생일 표시 제거
- 아이 이름 옆 상세정보 아이콘으로 상세정보/수정 모달 열기
- 결석 버튼 제거
- 출석/큐티 토글 선택 상태를 더 강하게 표시
- 이번 주 메모 카드에 `전도사님 공유` 체크박스 추가
- 메모 textarea placeholder 제거
- `전체 저장`을 `저장`으로 변경하고 메모 카드 밖으로 이동
- `docs/MVP_DESIGN_SPEC.md`와 테스트를 새 흐름에 맞게 갱신

### 검증
- `pnpm run lint`: 통과
- `pnpm run typecheck`: 통과
- `pnpm run test`: 3 files, 8 tests 통과
- `pnpm run test:db`: 1 file, 1 test 통과
- `pnpm run test:e2e`: Chromium mobile/desktop, WebKit mobile 9 tests 통과
- `pnpm run build`: 통과

### 다음 단계
- 선생님/반 수정과 삭제, 아이 반 이동 이력 보존은 이후 개선 후보
- Supabase 전환 시 `teachers`, `classes.teacher_id`, `children.class_id`, `attendance_sessions.share_with_pastor` 스키마를 반영해야 함

## 2026-06-26 설정 분리와 선생님 모달

### 제품 결정
- 홈 화면은 교회 이름, 부서, 반 선택만 유지하고 반 등록은 `/settings`로 이동
- 하단 메뉴에 `설정` 탭 추가
- 출석이 저장되지 않은 아이는 기본적으로 출석하지 않은 상태로 표시
- 선생님 등록은 아이 등록과 같은 모달 방식으로 처리
- 선생님 등록 시 선택한 반의 담임을 새 선생님으로 갱신

### 완료
- `/settings` 화면 추가: 반 이름과 담임 선생님 선택으로 반 등록, 등록된 반 목록 표시
- 홈 화면 반 등록 폼 제거
- 하단 메뉴를 홈, 출석, 아이들, 선생님, 통계, 설정 6개로 확장
- 선생님 데이터 모델에 사진, 생일, 전화번호 필드 추가
- `/teachers` 화면에서 선생님 등록 모달 추가: 이름, 생일, 반, 전화번호, 사진 입력
- 선생님 목록에 사진, 이름, 담당 반, 생일, 전화번호 표시
- `/children` 반 필터 드롭다운에 반 이름과 담임 선생님 이름 표시
- `/attendance` 미저장 기본 상태 문구를 `미출석`으로 변경하고 출석/큐티 토글 기본 미선택 상태 검증
- `docs/MVP_DESIGN_SPEC.md`와 E2E/단위 테스트 갱신

### 검증
- `pnpm run lint`: 통과
- `pnpm run typecheck`: 통과
- `pnpm run test`: 3 files, 8 tests 통과
- `pnpm run test:db`: 1 file, 1 test 통과
- `pnpm run test:e2e`: Chromium mobile/desktop, WebKit mobile 9 tests 통과
- `pnpm run build`: 통과

### 다음 단계
- 선생님 정보 수정/삭제는 아직 없음
- 설정 화면의 반 수정/삭제는 이후 개선 후보
- Supabase 전환 시 선생님 사진은 Storage 또는 URL 방식 결정 필요

## 2026-06-26 Supabase 단일 JSON 저장 전환

### 제품 결정
- 가장 간단한 방식으로 기존 `FamilyOpenStore` 전체를 Supabase `jsonb` 단일 행에 저장
- 로그인 없는 패밀리 오픈이므로 publishable key 기반 공개 읽기/쓰기를 허용
- `localStorage`는 원격 저장 실패 시 백업/fallback으로 유지

### 완료
- `family_open_app_state` 테이블 migration 추가: `supabase/migrations/20260626000100_family_open_app_state.sql`
- Supabase 타입 정의에 `family_open_app_state` 추가
- 기존 저장 훅을 Supabase load/upsert 경로로 전환
- 원격 데이터 보정과 localStorage fallback 유틸 추가
- `.env.local`에 제공받은 Supabase URL과 publishable key 설정
- `.env.example`, `README.md`, `docs/MVP_DESIGN_SPEC.md`를 Supabase 원격 저장 기준으로 갱신
- E2E 테스트가 원격 상태 행을 기본 데이터로 초기화하도록 갱신

### 검증
- `pnpm run lint`: 통과
- `pnpm run typecheck`: 통과
- `pnpm run test`: 3 files, 8 tests 통과
- `pnpm run test:db`: 1 file, 1 test 통과
- `pnpm run test:e2e`: Chromium mobile/desktop, WebKit mobile 9 tests 통과
- `pnpm run build`: 통과
- 원격 Supabase 조회: `family_open_app_state` 테이블 접근 가능 확인

### 완료 확인
- 사용자가 Supabase에 테이블을 생성한 뒤 원격 저장 E2E 검증 완료
- 클라이언트 env를 Next.js 브라우저 번들에서 직접 참조하도록 `lib/env.ts` 수정
- E2E는 Supabase 상태 행을 기본 데이터로 초기화한 뒤 저장/새로고침 유지까지 검증

### 다음 단계
- 외부 공개 전에는 public anon write를 공유 코드 또는 Auth/RLS로 교체 필요
- 단일 JSON 행은 동시 편집 시 마지막 저장이 이기는 구조이므로, 여러 교사가 동시에 사용할 단계에서는 revision/충돌 처리 필요

## 2026-06-26 선생님/반 수정 삭제와 저장 상태 정리

### 제품 결정
- 선생님 삭제는 실제 배열 제거가 아니라 `isActive: false`로 숨기는 soft delete로 처리한다.
- 선생님 삭제 시 해당 선생님이 담임인 반의 `teacherId`는 비운다.
- 반 삭제는 활성 아이가 배정되어 있거나 마지막 남은 반이면 막는다.
- 선생님 생일은 새 등록/수정부터 연도 없이 월/일만 입력하고 저장한다.

### 완료
- `/teachers`에서 등록된 선생님 카드에 수정과 삭제 버튼을 추가했다.
- 선생님 등록/수정 모달을 공통화하고 생일 입력을 월/일 선택으로 변경했다.
- `/settings`에서 등록된 반 카드에 수정과 삭제 버튼을 추가했다.
- 반 삭제 실패 조건을 화면 안의 오류 메시지로 안내한다.
- 공통 저장 상태 배지에서 저장 시각 표시를 제거하고 `저장됨`, `저장 중`, `저장 실패`만 남겼다.
- Supabase 단일 JSON 저장 흐름은 유지했다.
- E2E를 선생님 수정/삭제, 반 수정/삭제, 삭제 차단, 새로고침 후 Supabase 유지 검증까지 확장했다.

### 검증
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 8 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `.\node_modules\.bin\playwright.cmd test`: 9 tests 통과. 원격 Supabase 접근 때문에 권한 상승으로 재실행함.
- `.\node_modules\.bin\next.cmd build`: 통과

### 다음 단계
- `pnpm run lint`, `pnpm run test`, `pnpm run test:db`는 PowerShell에서 `pnpm.exe` 접근 거부가 반복되어 동일 바이너리를 직접 실행해 검증했다.
- 단일 JSON 행은 동시 편집 시 마지막 저장이 이기는 구조이므로, 가족 외 공개 전에는 Auth/RLS 또는 revision 충돌 처리가 필요하다.

## 2026-06-26 반/담임 미지정 등록 허용

### 제품 결정
- 아이는 반 선택 없이 등록/수정할 수 있고, 미지정 상태는 `classId: ""`로 저장한다.
- 반 미지정 아이는 아이들 전체 목록에는 남기되 특정 반 출석 화면에는 포함하지 않는다.
- 선생님은 반 선택 없이 등록/수정할 수 있고, 미지정 상태에서는 어떤 반의 `teacherId`도 차지하지 않는다.
- 반은 담임 선생님 선택 없이 등록/수정할 수 있고, 미지정 상태는 `teacherId`를 비워 저장한다.

### 완료
- 아이 상세 모달 반 드롭다운에 `반 미지정` 선택지를 추가하고 기본값을 미지정으로 변경했다.
- 선생님 등록/수정 모달 반 드롭다운에 `반 미지정` 선택지를 추가하고 반 선택 없이 저장 가능하게 했다.
- 설정 화면 반 등록/수정 드롭다운에 `담임 미지정` 선택지를 추가하고 담임 없이 저장 가능하게 했다.
- 저장 훅 validation을 실제 ID가 들어온 경우에만 존재 여부를 확인하도록 완화했다.
- E2E에 담임 미지정 반 등록/새로고침/삭제와 반 미지정 아이 등록/새로고침 유지 검증을 추가했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 8 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `.\node_modules\.bin\playwright.cmd test`: 9 tests 통과. 원격 Supabase 접근 때문에 권한 상승으로 실행함.
- `.\node_modules\.bin\next.cmd build`: 통과

### 다음 단계
- 반 미지정 아이를 별도 필터로 보고 싶으면 `아이들` 화면 필터에 `반 미지정` 옵션을 추가하는 개선이 가능하다.

## 2026-06-26 상세 모달 삭제 confirm 정리

### 제품 결정
- 아이 삭제는 출석 기록 참조를 보존하기 위해 실제 배열 삭제가 아니라 `isActive: false` soft delete로 처리한다.
- 선생님 삭제는 기존처럼 `isActive: false`로 숨기고, 담임으로 연결된 반의 `teacherId`를 비운다.
- 반 삭제는 실제 반 배열에서 제거하고, 해당 반에 연결된 아이의 `classId`를 `""`로 비워 반 미지정 상태로 남긴다.
- MVP 범위에서는 별도 커스텀 삭제 다이얼로그 대신 브라우저 기본 `window.confirm`을 사용한다.

### 완료
- 아이 상세 모달에 `아이 삭제` 버튼을 추가했고, `/children` 및 `/attendance`에서 열린 상세 모달 모두 삭제를 실행할 수 있게 했다.
- 선생님 카드의 직접 삭제 버튼을 제거하고, 선생님 수정 모달 안에 `선생님 삭제` 버튼과 confirm 흐름을 추가했다.
- 설정 화면 반 카드의 직접 삭제 버튼을 제거하고, 반 수정 모달 안에 `반 삭제` 버튼과 confirm 흐름을 추가했다.
- `useFamilyOpenStore`에 `deleteChild` 액션을 추가하고, `deleteClass`가 연결 아이를 반 미지정으로 전환하도록 변경했다.
- Playwright 시나리오를 카드 직접 삭제 대신 모달 삭제 및 confirm 수락 흐름으로 갱신했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 8 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `.\node_modules\.bin\next.cmd build`: 통과
- `.\node_modules\.bin\playwright.cmd test`: 미실행. 원격 Supabase 상태 초기화/검증을 위해 네트워크 권한이 필요했으나, 권한 요청이 사용량 제한으로 거절되었다.

### 다음 단계
- 사용량 제한이 풀리면 `.\node_modules\.bin\playwright.cmd test`를 네트워크 권한으로 실행해 모달 삭제 confirm과 새로고침 유지 E2E를 완료한다.
- E2E가 통과하면 `goal.md`의 남은 검증 조건을 체크하고 삭제한다.

## 2026-06-26 Supabase DB 기준 저장 정리

### 확인
- 운영 배포 `https://seed-six-pearl.vercel.app`의 새 브라우저 세션에서 Supabase `family_open_app_state` 읽기 요청은 200으로 성공했다.
- 이전 `저장 실패`의 직접 원인은 Vercel `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 오입력으로 확인됐고, 이후 읽기 요청 기준으로는 환경변수 반영이 정상화됐다.
- 운영 저장 버튼 클릭 검증은 공유 Supabase 상태를 변경할 수 있어 실행하지 않았다.

### 완료
- 앱 초기 로딩에서 localStorage 선반영을 제거하고 Supabase `family_open_app_state` 읽기 결과만 상태 기준으로 사용하도록 변경했다.
- 앱 저장 시 localStorage 백업 쓰기를 제거하고 Supabase 저장 요청만 수행하도록 변경했다.
- Supabase 브라우저 클라이언트에서 Auth 세션 저장, 자동 갱신, URL 세션 감지를 비활성화했다.
- localStorage 읽기/쓰기 헬퍼와 저장 키 상수를 제거했다.
- E2E에 앱 상태 localStorage 키가 다시 생성되지 않는 회귀 확인을 추가했다.
- `instruction.md`, `docs/MVP_DESIGN_SPEC.md`, `README.md`를 Supabase DB 기준 저장 방식으로 갱신했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 8 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- `pnpm run lint`, `pnpm run test`, `pnpm run test:db`는 PowerShell에서 `pnpm.exe` 접근 거부가 발생해 동일 바이너리를 직접 실행했다.

### 다음 단계
- 이 변경은 로컬 저장소에만 적용되어 있으므로 운영 반영에는 재배포가 필요하다.
- 배포 후 새 브라우저 또는 기존 브라우저에서 새로고침하여 localStorage 없이 Supabase 읽기/저장이 되는지 확인해야 한다.
- 운영 저장 버튼 검증은 실제 DB 상태를 바꾸므로, 필요하면 제품 책임자 승인 후 짧은 테스트 데이터를 만들어 확인한다.
