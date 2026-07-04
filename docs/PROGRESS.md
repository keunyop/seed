# Progress

## 2026-07-04 선생님/반 UX와 초기 로딩 성능 개선

### 완료
- 선생님이 조회되는 주요 목록과 선택 UI를 가나다순으로 정렬했다.
  - 선생님 로그인 선택 목록
  - `/teachers` 등록된 선생님 목록
  - `/settings` 반 등록/수정의 담임 선생님 선택 목록
- `/settings`의 등록된 반 카드에서 별도 `수정` 버튼을 제거하고, 반 카드 전체 클릭으로 상세/수정 모달을 열도록 변경했다.
- 선생님 로그인 모달의 비밀번호 입력은 비활성화하고, 선생님 선택 후 바로 로그인되도록 변경했다.
- 성능 조사 결과, 서버 하드웨어보다 앱 구조와 사진 전송량이 더 직접적인 병목으로 판단했다.
  - 기존 구조는 전역 로그인 provider와 각 페이지가 `useFamilyOpenStore()`를 따로 실행해 같은 화면에서 Supabase 전체 데이터를 중복 로드했다.
  - `FamilyOpenStoreProvider`를 추가해 Supabase store를 앱에서 한 번만 로드하고, 로그인 모달과 각 화면이 같은 context를 공유하도록 바꿨다.
  - 사진은 Data URL로 DB에 저장되므로 아이/선생님 사진이 많아질수록 초기 응답이 커진다. 새로 저장되는 프로필 사진 한도를 500KB에서 160KB로 낮췄고, 선생님 목록 사진에도 lazy loading/async decoding을 적용했다.
- `docs/MVP_DESIGN_SPEC.md`와 `README.md`를 비밀번호 없는 로그인, 단일 store provider, 가나다순 선생님 목록, 160KB 사진 한도 기준으로 갱신했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 5 files, 25 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\playwright.cmd test tests/e2e/attendance-mock.spec.ts --project=webkit-mobile`: 1 test 통과. sandbox에서 Next dev server 시작이 `Access is denied`로 실패해 권한 상승 후 forward-slash 경로로 재실행했다.
- `pnpm run build`: 통과

### 데이터/배포 영향
- DB migration과 환경변수 변경은 없다.
- 운영 반영에는 재배포가 필요하다.
- 기존 DB에 이미 저장된 큰 Data URL 사진은 자동으로 작아지지 않는다. 기존 사진까지 줄이려면 운영 데이터 변환 작업 또는 사진 Storage 이전을 별도 승인 후 진행해야 한다.

### 남은 위험
- 전체 `tests/e2e/app-shell.spec.ts`는 원격 Supabase 상태를 초기화할 수 있어 실행하지 않았다.
- 현재 선생님 로그인은 편의용 선택 UI이며, 비밀번호 제거 후에도 서버/RLS 보안 경계는 아니다. 공개 운영 전에는 Supabase Auth/RLS 또는 공유 코드 기반 권한 전환이 필요하다.

## 2026-07-02 원본 명단 기반 2~6학년 보호자 정보 복원

### 완료
- 사용자가 제공한 원본 명단 52행을 운영 Supabase의 기존 아이와 `이름 + 반` 기준으로 매칭했다.
- dry-run 결과:
  - 원본 행: 52건
  - 기존 아이 매칭: 52건
  - 누락 반/아이/중복 매칭: 0건
  - 보호자 후보: 82건
  - 대상 아이에 기존 보호자 row: 0건
- 복원 실행 결과:
  - `children` 상세정보 upsert: 52건
  - `child_parents` 보호자 row insert: 82건
  - 아이 필드 검증 불일치: 0건
  - 보호자 검증 누락: 0건
- 최종 SELECT 검증:
  - 전체 `child_parents`: 94건
  - 이번 원본 명단에서 복원한 `parent-roster-*`: 82건
  - 전체 아이 63명 중 생년월일 전체 blank 처리 아이: 7명

### 보정 규칙
- 생년월일이 비어 있거나 `00` 월/일처럼 실제 날짜가 아니면 `birth_date`, `birth_year`, `birth_month`, `birth_day`를 모두 비웠다.
- 등록일이 `YYYY.MM` 또는 `YYYY.MM.` 형식이면 해당 월 1일로 저장했다. 이번 명단에서는 41건이 해당한다.
- 등록일 `2011/2002`는 유효한 날짜로 해석하지 않고 비웠다.

### 롤백 참고
- 이번 복원 보호자 row id는 `parent-roster-{child_id}-{mother|father}` 패턴이다.
- 필요 시 별도 승인 후 이번 대상 52명 child id 범위의 `parent-roster-*` row를 삭제할 수 있다.
- 아이 상세정보는 원본 명단 기준으로 덮어썼으므로 롤백하려면 복원 전 백업 또는 이전 DB snapshot이 필요하다.

### 남은 위험
- 재발 방지 코드 수정 전에는 원격 E2E 실행과 아이/선생님/반 전체 저장 계열 작업을 피해야 한다.

## 2026-07-02 legacy 부모 연락처 11건 우선 복원

### 완료
- 사용자가 승인한 범위대로 `family_open_app_state` legacy JSON 백업의 부모 연락처 11건을 운영 Supabase `child_parents`에 우선 복원했다.
- 복원 전 dry-run 결과:
  - 현재 `child_parents`: 1건
  - legacy 후보: 11건
  - 현재 row와 정확히 같은 연락처 중복: 0건
  - id 충돌: 0건
  - 삽입 대상: 11건
- 복원 실행 결과:
  - 삽입: 11건
  - 복원 후 `child_parents`: 12건
  - legacy 연락처 존재 검증: 11/11건
- 기존에 남아 있던 1건은 삭제하지 않고 보존했다. 그래서 총 row 수는 11건이 아니라 12건이다.

### 롤백 참고
- 이번 복원으로 삽입된 parent id:
  - `parent-0b3583b8-8fdc-4633-afca-251421dbd3ca`
  - `parent-35824766-b390-4818-a2c1-32861dc49947`
  - `parent-5b532a24-2b8b-4ac5-85bf-9d146a05ee50`
  - `parent-683cf1bd-89b7-4df8-b17c-028a5398a25e`
  - `parent-84da34d5-f569-4cc1-9f5b-e2d2001e0dc3`
  - `parent-85b04901-257c-4daf-86b8-8b27e0610b58`
  - `parent-8be71ef0-0914-41ac-a24a-9b84cbcafbc2`
  - `parent-9584e5fc-dc00-4fb0-a1c9-a583c73dd3d1`
  - `parent-bd06a015-054f-4eca-ae74-b028b7dbaba9`
  - `parent-c08980eb-42ed-44d3-92fe-fd8c9881373e`
  - `parent-f41fe022-2b73-4a7d-9a7b-e23a0b550143`

### 남은 위험
- 2026-06-27에 등록된 보호자 82건 전체 복구에는 Supabase 백업/PITR 또는 원본 명단 파일이 필요하다.
- 재발 방지 코드 수정 전에는 원격 E2E 실행과 아이/선생님/반 전체 저장 계열 작업을 피해야 한다.

## 2026-07-02 부모님 정보 손실 조사

### 확인
- 운영 Supabase를 읽기 전용으로 조회했다. `children` 63명 중 `child_parents`는 1건만 남아 있고, 그 1건도 2026-07-02 17:25:40 UTC에 생성된 기록이다.
- `teachers`, `classes`, `children`, `child_parents`, `attendance_sessions`, `attendance_records`, `attendance_memos`의 `updated_at`이 모두 2026-07-02 17:25:39~40 UTC 한 시점으로 맞춰져 있었다. 개별 아이 수정이 아니라 전체 store 저장 경로가 실행된 흔적으로 판단한다.
- 코드상 직접 원인은 `lib/family/supabase-store.ts`의 `replaceChildParents`다. 이 함수는 `child_parents`를 조직 단위로 전체 삭제한 뒤 현재 store의 `children[*].parents`만 다시 insert한다. 부모 배열이 비어 있거나 일부만 있는 store가 저장되면 기존 부모 정보가 사라진다.
- `tests/e2e/app-shell.spec.ts`의 `resetRemoteStore()`도 `.env.local`의 Supabase에 `createDefaultFamilyOpenStore()`를 저장한다. 기본 store의 아이들은 `parents: []`라서 이 E2E가 운영 DB에 연결되면 부모 테이블을 비울 수 있다.
- 현재 DB에는 E2E에서 만든 것으로 보이는 테스트 아이 이름과 기본 더미 아이가 남아 있어, 원격 DB에 테스트/전체 저장 계열 작업이 실행된 정황이 있다.

### 복원 가능성
- `family_open_app_state` legacy JSON 백업에는 2026-06-26 21:39:07 UTC 기준 7명/11건의 부모 연락처가 남아 있다. 이 11건은 승인 후 복원 스크립트로 `child_parents`에 재삽입 가능하다.
- 진행 기록상 2026-06-27에 45명/77건, 이후 7명/5건의 보호자 정보가 등록됐지만, 개인정보 원본이 담긴 임시 스크립트는 검증 후 삭제됐다. 현재 repo 안에서는 그 82건의 전체 원본을 찾지 못했다.
- 전체 복원을 하려면 Supabase 프로젝트의 백업/PITR, DB 관리자 권한으로 보는 삭제 전 시점 복구, 또는 사용자가 가진 원본 명단 파일이 필요하다. 현재 Codex가 가진 publishable key만으로는 삭제된 row 이력을 조회할 수 없다.

### 즉시 피해야 할 작업
- `pnpm run test:e2e` 또는 `tests/e2e/app-shell.spec.ts` 실행 금지. 이 테스트는 원격 Supabase를 초기화할 수 있다.
- 운영 Supabase에 `saveFamilyOpenStoreWithClient(...createDefaultFamilyOpenStore())` 또는 전체 store 저장 스크립트 실행 금지.
- 부모 정보 복원 전/보호 로직 반영 전에는 운영 화면에서 아이, 선생님, 반 정보를 수정하는 전체 저장 계열 작업을 피한다. 출석/큐티 개별 저장과 메모 전용 저장은 별도 경로지만, 의심되는 브라우저 세션은 새로고침 후 사용한다.

### 다음 단계
- 사용자가 승인하면 먼저 legacy JSON의 11건만 복원할 수 있다.
- 82건 전체 복원을 원하면 Supabase 대시보드에서 2026-07-02 17:25:39 UTC 직전 백업/PITR 가능 여부를 확인하거나, 원본 명단 파일을 제공해야 한다.
- 재발 방지를 위해 `replaceChildParents`를 전체 삭제 방식에서 아이 단위/부모 행 단위 upsert-delete로 바꾸고, E2E가 운영 `.env.local`에 연결되면 중단되도록 보호 장치를 추가해야 한다.

## 2026-07-02 선생님 로그인, 관리자 지정, 댓글형 비밀 메모

### 완료
- 전역 `TeacherAuthProvider`를 추가해 활성 선생님 목록과 기본 비밀번호 `1234`로 로그인하도록 했다.
- 로그인 성공 시 `seed-current-teacher-v1` localStorage 키에 선생님 ID를 저장해 같은 브라우저에서 재로그인을 생략한다.
- `teachers.is_admin` 필드와 선생님 상세 모달의 관리자 체크박스를 추가했다. 관리자 체크박스는 현재 로그인 선생님이 관리자일 때만 보인다.
- 기존 데이터에 관리자가 없으면 첫 활성 선생님을 초기 관리자로 지정하는 migration과 정규화 fallback을 추가했다.
- `attendance_memos` 테이블을 추가하고, 기존 `attendance_sessions.note` 값은 migration에서 댓글형 메모로 1회 복사하도록 했다.
- 출석 화면의 `전도사님 공유` 라벨을 `비밀`로 변경하고, 메모 저장 시 기존 내용을 덮어쓰지 않고 새 댓글형 메모로 추가하게 했다.
- 메모 목록은 선택 반 기준으로 필터링하고, 전체 선택 시 전체 메모를 표시하며, 5개씩 페이지 처리한다.
- 비밀 메모는 작성자와 관리자만 내용을 볼 수 있고, 권한이 없으면 비밀 처리 문구만 보인다.
- 특정 반의 비밀 메모는 해당 반 담임 선생님만 작성할 수 있게 막았다.
- MVP 설계 문서에 로그인/관리자/댓글형 메모 기준을 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `pnpm run lint`: PowerShell `pnpm.exe` 접근 거부로 실패
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 5 files, 24 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `.\node_modules\.bin\playwright.cmd test tests/e2e/attendance-mock.spec.ts --project=webkit-mobile`: 통과. sandbox에서는 Next dev server 시작이 `Access is denied`로 실패해 권한 상승으로 재실행했다.
- `pnpm run build`: 통과

### 데이터/배포 영향
- 새 migration `20260702000100_teacher_auth_and_attendance_memos.sql` 적용이 필요하다.
- migration 적용 전 배포본은 `attendance_memos` 또는 `teachers.is_admin` 조회/저장에서 실패할 수 있다.

### 남은 위험
- 전체 `playwright test`는 테스트 초기화가 설정된 원격 Supabase 데이터를 덮어쓰는 구조라 승인 검토에서 차단되어 실행하지 않았다.
- 현재 앱은 공개 Supabase anon 쓰기 구조를 유지하므로, localStorage 기반 로그인과 관리자 체크는 완전한 서버/RLS 보안 경계가 아니다. 공개 운영 전에는 Supabase Auth/RLS 또는 서버 검증 경로로 전환해야 한다.

## 2026-06-29 출석/큐티 개별 저장과 메모 전용 저장

### 완료
- `/attendance`의 하단 전체 저장 바를 제거하고, 출석/큐티 토글을 누를 때마다 해당 아이의 현재 날짜 record만 즉시 저장하도록 변경했다.
- 출석/큐티 저장은 `attendance_sessions`를 upsert해 session id를 보장한 뒤 `attendance_records`의 `session_id + child_id` 1행만 upsert한다.
- 저장 중에는 해당 아이의 출석/큐티 토글만 잠시 비활성화하고, row 안에 `저장 중`, `저장됨`, `저장 실패` 상태를 표시한다.
- 출석/큐티 저장 실패 시 체크한 값은 화면에 유지하고, row 안의 `다시 저장` 버튼으로 같은 값을 재시도할 수 있게 했다.
- 저장 버튼을 `이번 주 메모` 카드 안으로 옮기고, 메모와 전도사님 공유 여부만 저장하도록 분리했다.
- 메모 저장은 `attendance_sessions`의 `note`, `share_with_pastor`, `saved_at`만 upsert하고 `attendance_records`를 변경하지 않는다.
- 저장 성공으로 `savedAt`이 바뀌어도 현재 출석 draft가 다시 초기화되지 않도록 출석 화면 draft key를 날짜/로드상태 기준으로 조정했다.
- WebKit mock E2E와 Supabase helper 단위 테스트를 새 저장 단위에 맞춰 갱신했다.
- MVP 설계서에 출석/큐티 즉시 개별 저장, 메모 전용 저장, row별 실패 재시도 기준을 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 5 files, 22 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `.\node_modules\.bin\playwright.cmd test tests/e2e/attendance-mock.spec.ts --project=webkit-mobile`: 1 test 통과. sandbox에서 Next dev server 실행이 `Access is denied`로 실패해 권한 상승으로 재실행했다.
- `pnpm run build`: 통과

### 데이터/배포 영향
- DB migration과 환경변수 변경은 없다.
- 운영 반영에는 재배포가 필요하다.

### 남은 위험
- 전체 원격 Supabase E2E는 실제 원격 상태를 초기화/변경하는 테스트라 이번 작업에서는 실행하지 않았다.
- 공개 운영 전에는 현재 패밀리 오픈의 anon 쓰기 정책을 공유 코드 또는 Auth/RLS 기반으로 다시 설계해야 한다.

## 2026-06-28 Vercel Speed Insights 추가

### 완료
- `@vercel/speed-insights` 패키지를 dependency로 추가했다.
- Next.js 루트 레이아웃 `app/layout.tsx`에 `<SpeedInsights />`를 추가해 배포 후 Vercel에서 실제 사용자 성능 데이터를 수집할 수 있게 했다.
- MVP 설계서 기술 기준에 Vercel Speed Insights를 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `pnpm run build`: 통과

### 데이터/배포 영향
- DB migration과 환경변수 변경은 없다.
- 운영 반영에는 재배포가 필요하다.

## 2026-06-28 iPhone 출석 조회/저장 안정성 개선

### 확인
- iPhone Safari에서 저장이 느리거나 간헐적으로 실패할 수 있는 주요 원인은 `/attendance` 저장 버튼이 현재 출석 세션만 저장하지 않고 전체 store 저장 경로를 타는 구조였다.
- 기존 전체 저장 경로는 선생님, 반, 아이, 보호자, 모든 출석 세션/기록을 순서대로 다시 쓰며, 특히 `attendance_records` 전체 삭제 후 재삽입을 수행했다.
- 모바일 네트워크나 WebKit 환경에서는 이 요청량이 커져 저장 완료가 늦고, 중간 실패 시 사용자가 저장 여부를 믿기 어려운 문제가 생길 수 있었다.

### 완료
- `/attendance` 저장을 현재 날짜의 `attendance_sessions` 1건과 해당 세션의 `attendance_records`만 저장하는 scoped 저장 경로로 분리했다.
- 전체 store 저장 경로는 아이/반/선생님 관리처럼 전체 동기화가 필요한 작업에만 유지했다.
- 저장 중에는 날짜, 반, 출석/큐티 토글, 전도사님 공유 체크, 메모 입력과 저장 버튼을 비활성화해 중복 제출을 막았다.
- 저장 실패 시 `저장하지 못했습니다. 변경 내용은 남아 있습니다.`를 보여주고, 체크한 출석/큐티/메모 draft를 유지해 같은 저장 버튼으로 재시도할 수 있게 했다.
- 최신 저장 요청만 공통 저장 상태를 갱신하도록 해 느린 응답이 뒤늦게 도착해 상태를 덮어쓰는 위험을 줄였다.
- 아이 아바타 사진에 `loading="lazy"`와 `decoding="async"`를 적용해 긴 명단에서 iPhone Safari 초기 렌더링 부담을 줄였다.
- E2E 저장 버튼 선택자를 DOM 순서 의존에서 접근성 이름 기반으로 바꿨다.
- WebKit 모바일 mock E2E를 추가해 원격 Supabase를 변경하지 않고 저장 실패 후 입력 유지와 재시도 성공, 현재 세션만 저장하는 요청 범위를 검증했다.
- MVP 설계서에 scoped 출석 저장, 저장 실패 재시도, WebKit 회귀 기준을 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 5 files, 20 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- `.\node_modules\.bin\playwright.cmd test tests/e2e/attendance-mock.spec.ts --project=webkit-mobile`: 1 test 통과. sandbox에서 Next dev server 실행이 `Access is denied`로 실패해 권한 상승으로 재실행했다.

### 남은 위험
- 기존 전체 E2E는 원격 Supabase 상태 초기화/변경 위험이 있어 이번 작업에서는 실행하지 않았다.
- 공개 운영 전에는 현재 패밀리 오픈의 anon 쓰기 정책을 공유 코드 또는 Auth/RLS 기반으로 다시 설계해야 한다.

## 2026-06-27 상단 배지 제거와 모바일 입력 폭 정리

### 완료
- 홈 화면 헤더에서 `Sunday School` 보조 문구를 제거하고 `Seed`만 남겼다.
- `/attendance`, `/children`, `/teachers`, `/settings` 페이지 상단의 `저장됨` 상태 배지를 제거했다.
- `/attendance` 모바일 날짜 input에 좁은 화면용 padding/font-size와 전역 `input[type="date"]` 폭 제한을 적용해 카드 오른쪽 overflow를 막았다.
- 모바일 출석 저장 영역의 카드 테두리와 radius를 제거해 웹 화면처럼 별도 카드로 보이지 않게 했다.
- 출석 체크 아이 이름 옆 상세정보 info 버튼의 border를 제거하고 아이콘 버튼만 남겼다.
- 저장되지 않은 새 출석 세션의 `전도사님 공유` 기본값이 unchecked임을 명시적으로 유지하도록 draft 값을 정리했다.
- 아이 상세 모달과 선생님 상세 모달을 모바일에서도 2열 grid 기반으로 바꾸고, 긴 필드는 전체 폭을 쓰도록 조정했다.
- E2E 기대값에서 상단 `저장됨` 대기 로직을 제거하고, `Sunday School` 미표시와 `전도사님 공유` 기본 unchecked 확인을 추가했다.
- MVP 설계서에 상단 저장 배지 제거, 모바일 저장 영역 borderless 기준, 상세 모달 2열 기준을 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `pnpm run lint`: PowerShell `pnpm.exe` 접근 거부로 실패
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 4 files, 18 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- 임시 Playwright 스크립트로 Supabase REST 요청을 mock하고 production 서버를 띄워 390×844 모바일 viewport 확인:
  - `/dashboard`: `Sunday School` 미표시, `documentScrollWidth = 390`
  - `/attendance`: 상단 `저장됨` 미표시, 날짜 input `34..356`, 저장 영역 border/radius `0px`, info 버튼 border `0px`, `전도사님 공유` unchecked, `documentScrollWidth = 390`
  - `/children` 상세 모달: 날짜 input 2개가 각각 `16..189`, `201..374`, 폭 173px로 동일, 2열 grid, `documentScrollWidth = 390`
  - `/teachers` 상세 모달: 2열 grid, input/select viewport 내부, `documentScrollWidth = 390`
  - `/settings`: 상단 `저장됨` 미표시, `documentScrollWidth = 390`
- Playwright E2E 전체 스위트는 원격 Supabase 상태 초기화 위험 때문에 실행하지 않았다.

## 2026-06-27 선생님 카드 클릭과 사진 메뉴 UI 정리

### 완료
- `/teachers` 선생님 목록 카드의 `수정` 버튼을 제거하고, 카드 전체를 클릭하면 상세/수정 모달이 열리도록 변경했다.
- 아이 상세/등록 모달과 선생님 등록/수정 모달에서 native file input의 `Choose file` 문구가 보이지 않도록 숨김 input으로 전환했다.
- 사진이 없을 때는 사진 영역 클릭으로 바로 사진 선택을 열고, 사진이 있을 때는 사진 영역 클릭으로 `수정`/`삭제` 메뉴를 표시한다.
- 사진 삭제는 모달 안의 현재 입력값에서 사진을 비우며, 기존처럼 저장 버튼을 눌러 최종 반영한다.
- 큰 사진 자동 축소 완료 안내 문구를 제거하고, 처리 중 안내와 오류 안내만 유지했다.
- E2E 기대값을 선생님 카드 클릭 접근성 이름(`상세정보 열기`)에 맞게 갱신했다.
- MVP 설계서에 사진 영역 클릭/사진 메뉴 방식과 선생님 카드 클릭 진입을 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `pnpm run lint`: PowerShell `pnpm.exe` 접근 거부로 실패
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 4 files, 18 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- 임시 Playwright 스크립트로 Supabase REST 요청을 mock하고 production 서버를 띄워 390×844 모바일 viewport 확인:
  - `/teachers`: 선생님 카드 클릭으로 모달 열림, 사진 메뉴의 `수정`/`삭제` 표시, file input `display = none`, `documentScrollWidth = 390`
  - `/children`: 아이 카드 클릭으로 모달 열림, 사진 메뉴의 `수정`/`삭제` 표시, file input `display = none`, `documentScrollWidth = 390`
- Playwright E2E 전체 스위트는 원격 Supabase 상태 초기화 위험 때문에 실행하지 않았다.

## 2026-06-27 휴대폰 사진 자동 축소 저장

### 완료
- 아이 상세/등록 모달에서 500KB를 넘는 사진을 바로 거절하지 않고 브라우저 canvas로 프로필용 JPEG Data URL로 자동 축소하도록 변경했다.
- 선생님 등록/수정 모달에도 같은 자동 축소 흐름을 적용했다.
- 저장되는 사진 Data URL은 500KB 이하로 제한하고, 축소할 수 없는 이미지에는 재선택 안내를 표시한다.
- 사진 처리 중에는 저장 버튼을 비활성화하고, 처리 중/자동 축소 완료 상태 메시지를 표시한다.
- 모바일 390px 모달에서 native file input이 카드 밖으로 밀리지 않도록 `w-0 min-w-0 flex-1`로 폭을 고정했다.
- MVP 설계서와 README의 사진 정책을 "500KB 이하만 선택"에서 "큰 사진 자동 축소 후 500KB 이하 저장"으로 갱신했다.

### 검증
- `pnpm run typecheck`: 통과
- `pnpm run lint`: PowerShell `pnpm.exe` 접근 거부로 실패
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 4 files, 18 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- 임시 Playwright 스크립트로 Supabase REST 요청을 빈 배열로 가로채고 production 서버를 띄워 390×844 모바일 viewport 확인:
  - `/children` 사진 모달: `documentScrollWidth = 390`, `innerWidth = 390`, 사진 input `92..374`, overflow 없음
  - `/teachers` 사진 모달: `documentScrollWidth = 390`, `innerWidth = 390`, 사진 input `92..374`, overflow 없음
- Playwright E2E 전체 스위트는 원격 Supabase 상태 초기화 위험 때문에 실행하지 않았다.

## 2026-06-27 출석 전체 정렬과 모바일 날짜 입력 폭 보정

### 완료
- `/attendance`에서 반이 `전체`일 때 출석 명단을 반 목록 순서로 묶고, 각 반 안에서는 가나다순으로 정렬하도록 변경했다.
- 특정 반을 선택했을 때는 기존처럼 해당 반 안에서 가나다순으로 표시한다.
- `/attendance`, `/reports`의 날짜 입력과 같은 필터 컨트롤에 `min-width: 0`과 `max-width: 100%`를 적용해 모바일 카드 영역을 벗어나지 않도록 보정했다.
- MVP 설계 문서에 전체 반 출석 정렬 기준과 모바일 날짜 입력 폭 기준을 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 14 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- production 서버를 임시로 띄워 390×844 모바일 viewport에서 `/attendance`, `/reports` 확인:
  - `/attendance`: `documentScrollWidth = 390`, `innerWidth = 390`, 날짜 input `34..356`, 카드 `16..374`, overflow 없음.
  - `/reports`: `documentScrollWidth = 390`, `innerWidth = 390`, 날짜 input `34..356`, 카드 `16..374`, overflow 없음.
- Playwright E2E 전체 스위트는 원격 Supabase 상태 초기화 위험 때문에 실행하지 않았다.

## 2026-06-27 출석 체크 모바일 UI와 성능 보강

### 완료
- `/attendance` 출석 체크 명단을 선택된 반 또는 전체 범위 안에서 가나다순으로 표시하도록 변경했다.
- 출석/큐티 토글의 미선택 상태를 회색 배경/회색 border로 바꾸고, 선택 상태에서만 초록/파랑 강조색과 눌림 shadow가 보이도록 정리했다.
- 전체 반 보기에서는 아이 이름 아래에 반 이름을 표시해 모바일에서 아이 소속을 구분하기 쉽게 했다.
- 모바일에서 저장 버튼을 하단 내비게이션 위 sticky action bar로 이동해 긴 명단을 체크한 뒤에도 저장 액션에 접근하기 쉽게 했다.
- 공통 `PressableButton` disabled 상태를 회색 계열로 바꿔 저장할 변경이 없을 때 비활성 느낌이 명확하게 보이도록 했다.
- 출석 화면 draft 동기화에서 렌더 중 `setState` 패턴을 제거하고, 현재 세션 key에 맞는 draft를 파생해 사용하는 구조로 바꿔 불필요한 렌더 위험을 줄였다.
- 출석 명단 정렬 helper와 단위 테스트를 추가했다.
- MVP 설계 문서에 출석 명단 가나다순, 토글 미선택 회색 상태, 모바일 sticky 저장 액션 기준을 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 14 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- production 서버를 임시로 띄워 390×844 모바일 viewport에서 `/attendance` 확인: `scrollWidth = 390`, `innerWidth = 390`, 가로 스크롤 없음.
- 로컬 확인 환경에서는 원격 데이터가 로드되지 않아 실제 아이 토글 DOM 색상은 화면에서 직접 확인하지 못했고, 코드/테스트로 회귀를 확인했다.

## 2026-06-27 초기 렌더링 샘플 데이터 제거

### 완료
- 홈 화면 로딩 중 잠깐 보이던 예전 테스트 반명(`유치부 믿음반`, `초등부 소망반`)의 원인을 코드에서 확인했다.
- 원인은 로컬 DB나 캐시 조회가 아니라 런타임 초기 상태와 빈 Supabase fallback에 테스트용 기본 store가 사용되던 경로였다.
- 앱 런타임 초기값을 빈 store로 바꾸고, Supabase 정규화 테이블이 비어 있을 때 테스트 샘플 데이터를 자동 저장하지 않도록 변경했다.
- 원격 로드 실패/환경변수 누락/보정 fallback도 샘플 store 대신 빈 store를 사용하도록 변경했다.
- 홈 화면은 Supabase 로딩 중 반 목록 대신 로딩 상태를 표시하고, 로드 실패와 로드 후 빈 상태를 구분해 표시한다.
- 테스트 fixture의 예전 반명도 `테스트 1반`, `테스트 2반`으로 바꿔 E2E helper가 예전 반명을 원격 DB에 다시 심지 않도록 정리했다.
- README와 MVP 설계 문서에 런타임 샘플 데이터 미사용 정책을 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 13 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- `rg "createDefaultFamilyOpenStore" app components lib`: 런타임 import 없음. 정의 파일만 남음.
- E2E는 원격 Supabase 상태를 초기화하는 테스트라 이번 작업에서는 실행하지 않았다.

## 2026-06-27 남은 7명 등록과 아이 목록 정렬

### 완료
- 사용자가 원격 Supabase에서 `children.birth_month`/`birth_day` NOT NULL 제약을 제거한 뒤, 보류된 7명을 다시 등록했다.
  - 노찬아
  - 박로빈
  - 이정우
  - 송리유
  - 이한나
  - 김도완
  - 김라온
- 원격 DB 조회로 7명 모두 `birth_month = null`, `birth_day = null` 상태로 저장된 것을 확인했다.
- 보호자 정보 5행을 `child_parents`에 등록했다.
- `/children` 아이 목록에 정렬 선택을 추가했다.
  - 기본값: 가나다
  - 선택값: 반별
- 가나다 정렬은 이름순, 반별 정렬은 현재 반 목록 순서 후 이름순으로 동작한다.
- 전체 개인정보 원본이 포함된 임시 등록 스크립트는 검증 후 삭제했다.

### 검증
- `node tmp\register_missing_birth_children.mjs`: dry-run 7명/보호자 5행 확인
- `node tmp\register_missing_birth_children.mjs --execute`: 7명 upsert, 보호자 5행 insert 성공
- `node tmp\register_missing_birth_children.mjs --verify`: 원격 DB에서 아이 7명, 보호자 5행, null 생일 7명 확인
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 12 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과

### 다음 단계
- 운영 반영에는 재배포가 필요하다.

## 2026-06-27 생년월일 미상 아이 등록 준비

### 제품 결정
- 생년월일을 모르는 아이도 등록할 수 있도록 아이 생일 월/일을 nullable로 변경한다.
- 생일 월/일이 없는 아이는 월간 생일자 통계에서 제외한다.
- `16.00.00`, `15.00.00`처럼 연도만 있는 값은 출생연도만 보존하고 생일 월/일은 비운다.

### 완료
- `supabase/migrations/20260627000100_nullable_child_birth.sql` 추가.
  - `children.birth_month` NOT NULL 제거
  - `children.birth_day` NOT NULL 제거
- 앱 타입과 Supabase 타입 정의에서 아이 `birthMonth`/`birthDay`를 optional/null로 변경했다.
- 아이 추가/수정 저장 로직이 생년월일 빈 값을 허용하도록 변경했다.
- 아이 목록/통계 생일 표시가 생년월일 미입력과 출생연도만 있는 상태를 처리하도록 변경했다.
- 월간 생일자 통계는 생일 월/일이 없는 아이를 제외하도록 변경했다.
- 문서에 생년월일 미상 아이 등록 정책을 반영했다.

### 원격 등록 시도
- 보류된 7명 등록을 시도했으나, 원격 DB의 기존 NOT NULL 제약 때문에 실패했다.
- 실패 메시지: `null value in column "birth_month" of relation "children" violates not-null constraint`
- 현재 `.env.local`에는 Supabase publishable key만 있고 schema migration을 적용할 service role/DB 권한이 없어 Codex가 원격 schema를 직접 변경할 수 없다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 11 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과

### 다음 단계
- Supabase SQL Editor 또는 migration 적용 도구에서 아래 SQL을 먼저 적용해야 한다.
  - `alter table public.children alter column birth_month drop not null, alter column birth_day drop not null;`
- 원격 DB schema 변경 후 보류된 7명을 다시 등록한다.

## 2026-06-27 2학년~6학년 아이 명단 등록

### 완료
- 사용자가 제공한 52명 명단을 대량 등록 전 검증했다.
- 원격 Supabase의 기존 반/아이 상태를 확인했다.
  - 반은 이미 1학년~6학년이 존재해 새 반을 만들지 않았다.
  - 기존 활성 아이는 1학년 6명이라 이번 2학년~6학년 명단과 충돌하지 않았다.
- 생년월일이 유효한 45명을 Supabase 정규화 테이블에 등록했다.
  - 2학년 9명
  - 3학년 11명
  - 4학년 8명
  - 5학년 6명
  - 6학년 11명
- 보호자 정보 77행을 `child_parents`에 등록했다.
- 등록일이 월까지만 있는 39건은 해당 월 1일로 저장된 것을 원격 DB 조회로 확인했다.
- 정채원의 등록일 `2011/2002`는 유효한 날짜로 해석하지 않고 비워 저장했다.
- 전체 개인정보 원본이 포함된 임시 등록 스크립트는 검증 후 삭제했다.

### 보류
- 현재 DB 스키마는 아이 생일 월/일이 필수라 생년월일이 비었거나 `00.00`인 7명은 임의 날짜로 왜곡하지 않고 보류했다.
  - 노찬아: 생년월일 비어 있음
  - 박로빈: 생년월일 비어 있음
  - 이정우: 생년월일 비어 있음
  - 송리유: `16.00.00`
  - 이한나: 생년월일 비어 있음
  - 김도완: `15.00.00`
  - 김라온: 생년월일 비어 있음
- 등록일이 생년월일보다 빠른 6건은 사용자가 제공한 값 그대로 저장했다. 필요하면 별도 정정이 필요하다.

### 검증
- `node tmp\register_children_roster.mjs`: dry-run 파싱 검증 통과
- `node tmp\register_children_roster.mjs --inspect`: 원격 반 6개, 기존 아이 11명 확인
- `node tmp\register_children_roster.mjs --execute`: 새 아이 45명, 보호자 77행 등록
- `node tmp\register_children_roster.mjs --verify`: 원격 DB에서 45명/77행 확인, 월 단위 등록일 39/39건 1일 보정 확인
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과

### 다음 단계
- 보류된 7명은 실제 생년월일을 확인한 뒤 추가 등록한다.
- 생년월일을 모르는 아이도 앱에 등록해야 한다면, `children.birth_month`/`birth_day`를 nullable로 바꾸고 생일 통계에서 제외하는 schema/UI 변경이 먼저 필요하다.

## 2026-06-26 legacy localStorage 정리

### 확인
- 앱 런타임은 Supabase 정규화 테이블을 읽고 쓰며, 브라우저 localStorage를 상태 저장소로 사용하지 않는다.
- 코드에 남은 localStorage 접근은 E2E 검증과 legacy 키 삭제 목적뿐이다.
- Supabase `family_open_app_state` 단일 JSON 테이블은 로컬 DB가 아니라 원격 DB의 이관 원본/백업 테이블이다. 운영 정규화 migration이 끝나기 전 삭제하면 데이터 손실 위험이 있어 삭제하지 않았다.

### 완료
- legacy localStorage 키 `seed-family-open-store-v1`를 상수화했다.
- 앱 시작 시 해당 키가 남아 있으면 삭제하도록 `useFamilyOpenStore`에 best-effort cleanup을 추가했다.
- E2E 회귀 테스트가 legacy localStorage 키를 심은 뒤 앱이 제거하는지 확인하도록 갱신했다.
- README와 MVP 설계 문서에 localStorage 미사용 및 legacy 키 삭제 정책을 반영했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 10 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- Playwright E2E는 원격 Supabase 상태를 초기화하는 테스트라 운영 데이터 변경 위험 때문에 실행하지 않았다.

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

## 2026-06-26 통계 테스트 데이터 확인과 UI 보강

### 확인
- 운영 Supabase `family_open_app_state`를 읽기 전용으로 조회했다.
- 월간 큐티 1명은 2026-06-28 세션의 비활성 테스트 아이 `테스트아이1782461318678` 기록(`qtCompleted: true`) 때문에 발생했다.
- 운영 DB에는 비활성 테스트 선생님/아이 기록이 남아 있다. 삭제 또는 초기화는 운영 데이터 변경이므로 실행하지 않았다.

### 완료
- 월간 큐티 집계에서 활성 아이의 기록만 계산하도록 수정했다. 비활성 아이의 과거 테스트 큐티 기록은 통계에 포함되지 않는다.
- 출석 체크 화면의 반 드롭다운에 `전체` 옵션을 추가했고, 선택 시 반 미지정 포함 모든 활성 아이를 보여준다.
- 아이 등록/수정 모달의 부모님 정보에 관계 드롭다운을 추가했다: 아빠, 엄마, 기타.
- 기존 부모 데이터는 관계 값이 없으면 `기타`로 보정한다.
- 선생님 화면의 `등록된 선생님` 제목 옆에 활성 선생님 수를 표시한다.
- 홈 화면 상단에 `Seed` 타이틀과 초록색 풀잎 로고를 추가했다.
- `docs/MVP_DESIGN_SPEC.md`의 부모 데이터 모델에 관계 필드를 반영했다.

### 검증
- 운영 Supabase 읽기 전용 조회: 테스트 큐티 기록 원인 확인
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 10 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과

### 다음 단계
- 운영 DB에 남은 비활성 테스트 데이터 삭제/초기화가 필요하면 제품 책임자 승인 후 별도 작업으로 수행한다.
- E2E는 원격 Supabase 상태를 초기화하는 테스트라 운영 데이터 변경 위험 때문에 이번 작업에서 실행하지 않았다..

## 2026-06-26 아이 목록 보호자 표시 정리

### 완료
- `/children` 등록 아이 목록 카드에서 보호자 수와 등록일 대신 등록된 보호자 이름을 표시하도록 변경했다.
- 보호자 이름이 없으면 `미입력`으로 표시한다.
- 아이 상세 모달의 등록일 입력과 기존 저장 데이터는 유지해 데이터 호환성을 보존했다.
- E2E 기대값과 `docs/MVP_DESIGN_SPEC.md`의 아이 목록 표시 설명을 갱신했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 10 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- Playwright E2E는 원격 Supabase 상태를 초기화하는 테스트라 운영 데이터 변경 위험 때문에 실행하지 않았다.

### 다음 단계
- 운영 반영에는 재배포가 필요하다.

## 2026-06-26 정규화 DB 스키마 개편

### 제품 결정
- 기존 `family_open_app_state` 단일 JSON 저장은 이관 원본과 백업 용도로 유지한다.
- 앱의 주 저장 기준은 정규화 테이블로 전환한다: `organizations`, `teachers`, `classes`, `children`, `child_parents`, `attendance_sessions`, `attendance_records`.
- 로그인 없는 패밀리 오픈 UX는 유지하되, 모든 업무 테이블에 `organization_id`와 RLS를 둔다.
- 이번 단계의 RLS는 기본 조직 1개에 대해 `anon`/`authenticated` 읽기·쓰기를 허용한다. 공개 운영 수준의 권한 분리는 Auth 또는 공유 코드 결정 후 별도 작업으로 진행한다.

### 완료
- `supabase/migrations/20260626000200_normalized_family_schema.sql` 추가.
- 새 migration에 정규화 테이블, 인덱스, updated_at trigger, RLS 정책, grant를 포함했다.
- 기존 `family_open_app_state` JSON 데이터를 새 테이블로 이관하는 SQL을 migration에 포함했다.
- Supabase 타입 정의를 신규 테이블 기준으로 갱신했다.
- 앱 저장 어댑터를 단일 JSON upsert에서 정규화 테이블 읽기/쓰기 방식으로 교체했다.
- 저장 어댑터가 현재 store에 없는 반, 선생님, 아이 행을 정리하도록 해 테스트 초기화와 상태 덮어쓰기가 새 테이블 기준으로 동작하게 했다.
- Playwright 원격 초기화 helper도 새 저장 어댑터를 사용하도록 갱신했다.
- `README.md`, `instruction.md`, `docs/MVP_DESIGN_SPEC.md`, DB 테스트를 정규화 DB 기준으로 갱신했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 10 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- Playwright E2E는 원격 Supabase 상태를 초기화하는 테스트라 운영 데이터 변경 위험 때문에 실행하지 않았다.

### 다음 단계
- 운영 Supabase에 `20260626000200_normalized_family_schema.sql` migration을 적용해야 배포본이 새 테이블을 사용할 수 있다.
- migration 적용 전 이 코드가 먼저 배포되면 신규 테이블이 없어 `저장 실패`가 표시될 수 있다.
- 공개 운영 전에는 로그인 또는 공유 코드 기반 권한 정책을 결정하고 RLS를 기본 조직 공개 쓰기에서 교체해야 한다.

## 2026-06-26 아이 아바타 표시 정리

### 완료
- `/children` 등록 아이 목록에서 보호자 이름 앞 `보호자` 접두어를 제거했다.
- 사진이 없는 아이 아바타를 공통 컴포넌트로 분리하고, 남자/여자/미입력 성별에 따라 다른 색상을 적용했다.
- `/attendance` 출석 체크 행의 아이 이름 앞에도 아이 목록과 같은 아바타를 추가했다.
- 아이 상세 모달의 사진 미입력 상태도 같은 성별별 아바타 색상을 따른다.
- E2E 기대값과 `docs/MVP_DESIGN_SPEC.md`의 화면 설명을 갱신했다.

### 검증
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 10 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- Playwright E2E는 원격 Supabase 상태를 초기화하는 테스트라 운영 데이터 변경 위험 때문에 실행하지 않았다.

### 다음 단계
- 운영 반영에는 재배포가 필요하다.
