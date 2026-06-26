# Goal

## 작업
- 한 문장으로 설명: 아이, 선생님, 반 삭제를 상세 모달 안에서 confirm 후 실행되도록 정리한다.
- 사용자에게 주는 가치: 목록에서 실수로 삭제하지 않고, 상세 정보를 확인한 뒤 삭제할 수 있다.

## 범위
### 포함
- 아이 상세 모달 안 삭제 버튼 추가
- 선생님 상세/수정 모달 안 삭제 버튼 이동
- 반 상세/수정 모달 안 삭제 버튼 이동
- 삭제 전 `window.confirm` 확인
- 아이 삭제 저장 액션 추가
- 반 삭제 시 배정 아이는 반 미지정으로 전환
- E2E와 문서/진행 기록 갱신

### 제외
- 삭제 복구 UI
- 삭제 이력 관리
- DB 스키마 변경
- Auth/RLS 또는 공유 코드

## 현재 상태
- 관련 화면/경로: `/children`, `/teachers`, `/settings`
- 관련 테이블 마이그레이션: 기존 `family_open_app_state` 단일 JSON 행 유지
- 관련 테스트: Vitest 단위 테스트, DB migration 테스트, Playwright E2E

## 가정과 결정 기록
- [2026-06-26] 아이 삭제는 `isActive: false`로 숨긴다. 이유: 기존 출석 기록 참조를 갑자기 깨지 않기 위함.
- [2026-06-26] 선생님 삭제는 기존처럼 `isActive: false`로 숨기고 해당 선생님이 담임인 반의 `teacherId`를 비운다.
- [2026-06-26] 반 삭제는 실제 반 배열에서 제거하고, 해당 반의 활성 아이는 `classId: ""`로 옮긴다. 이유: 사용자가 반 삭제 가능을 요청했고, 반 미지정 아이 등록이 이미 허용되어 있기 때문.
- [2026-06-26] 삭제 확인은 MVP 범위에서 브라우저 기본 confirm을 사용한다.

## 완료 조건
- [x] 아이 상세 모달에서 삭제할 수 있고 삭제 전 confirm이 뜬다.
- [x] 선생님 상세/수정 모달에서 삭제할 수 있고 삭제 전 confirm이 뜬다.
- [x] 반 상세/수정 모달에서 삭제할 수 있고 삭제 전 confirm이 뜬다.
- [x] 목록 카드에는 삭제 버튼이 남지 않는다.
- [ ] 삭제 후 Supabase 저장 및 새로고침 유지가 E2E로 검증된다. 네트워크 권한 요청이 사용량 제한으로 거절되어 미실행.
- [ ] 모바일 기준 화면에서 가로 스크롤 없이 사용할 수 있다.
- [ ] 필요한 테스트가 갱신되고 통과한다. typecheck/lint/unit/DB/build는 통과, E2E는 미실행.
- [x] 문서와 진행 기록이 실제 코드와 일치한다.

## 테스트 계획
- 정적 검사: lint, typecheck
- 단위 테스트: family stats 등 기존 Vitest
- DB 테스트: migration 기준 테스트
- E2E 테스트: 아이/선생님/반 상세 모달 삭제 confirm과 새로고침 유지
- 빌드: Next.js production build

## 위험과 되돌리기
- 위험: 반 삭제 시 해당 반 아이가 반 미지정으로 이동한다.
- 위험: 단일 JSON 공개 쓰기 구조는 동시 편집 시 마지막 저장이 이긴다.
- 롤백 방법: 모달 삭제 버튼과 delete 액션 변경을 되돌린다.

## 검증 결과
- 실행한 명령:
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `.\node_modules\.bin\next.cmd build`
  - `.\node_modules\.bin\playwright.cmd test`
- 결과:
  - typecheck 통과
  - eslint 통과
  - Vitest 3 files, 8 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
  - Playwright E2E는 원격 Supabase 네트워크 권한 요청이 사용량 제한으로 거절되어 실행하지 못함
- 남은 문제:
  - 사용량 제한 해제 후 `.\node_modules\.bin\playwright.cmd test`를 네트워크 권한으로 실행해야 함
  - E2E 통과 전까지 이 `goal.md`는 유지

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 운영 배포의 `저장 실패` 원인을 확인하고 앱 상태 저장을 Supabase DB 중심으로 정리한다.
- 사용자에게 주는 가치: 교사와 관리자가 브라우저별 로컬 상태에 흔들리지 않고 같은 DB 데이터를 보고 저장할 수 있다.

## 범위
### 포함
- 운영 배포의 Supabase 읽기 요청 상태 확인
- 앱 상태 로딩에서 localStorage 선반영 제거
- 앱 상태 저장에서 localStorage 쓰기 제거
- Supabase 설정 누락 또는 네트워크 오류 시 명확한 저장 실패 상태 유지
- 관련 문서와 진행 기록 갱신

### 제외
- 운영 Supabase 데이터 임의 변경
- Auth/RLS 또는 공유 코드 도입
- 정규화된 업무 테이블 전환
- Vercel 환경변수 직접 수정

## 현재 상태
- 관련 화면/경로: `/dashboard`, `/attendance`, 전체 앱 저장 상태 배지
- 관련 테이블/마이그레이션: `family_open_app_state` 단일 JSON 행
- 관련 테스트: Vitest 단위 테스트, DB migration 테스트, Next.js build, 운영 배포 읽기 전용 Playwright 확인

## 가정과 결정 기록
- [2026-06-26] 운영 배포 새 브라우저에서 Supabase `select` 요청은 200으로 성공한다. 따라서 현재 핵심 DB 연결은 읽기 기준 정상이다.
- [2026-06-26] 운영 저장 버튼 클릭 검증은 실제 공유 DB 상태를 변경할 수 있어 실행하지 않는다. 필요하면 사용자의 명시 승인 후 진행한다.
- [2026-06-26] localStorage는 필수 요구가 아니므로 원격 DB가 단일 기준이 되도록 앱 상태 로딩/저장에서 제거한다.

## 완료 조건
- [x] 앱 초기 상태가 localStorage가 아니라 Supabase `family_open_app_state`에서 온다. `useFamilyOpenStore`에서 localStorage 로딩 제거.
- [x] 저장 시 localStorage를 쓰지 않고 Supabase에만 저장을 요청한다. `writeLocalFamilyOpenStore` 제거 및 호출 제거.
- [x] Supabase 환경변수 누락/요청 실패 시 `저장 실패` 상태가 표시된다. `loadFamilyOpenStoreFromSupabase`/`saveFamilyOpenStoreToSupabase` 실패 결과가 `saveState: "error"`로 연결됨.
- [x] 운영 배포에서 Supabase 읽기 요청이 200으로 성공한다는 증거를 남긴다. 읽기 전용 Playwright 확인에서 GET 200.
- [x] 필요한 테스트가 통과한다. typecheck, ESLint, unit, DB, build 통과.
- [x] 문서와 진행 기록이 현재 코드와 일치한다.

## 테스트 계획
- 정적 검사: `pnpm run typecheck`, ESLint
- 단위 테스트: Vitest
- 데이터베이스/RLS 테스트: migration 기준 테스트
- E2E/수동 확인: 운영 배포 읽기 전용 Playwright 네트워크 확인
- 빌드: Next.js production build

## 위험과 되돌리기
- 위험: Supabase가 불안정하거나 환경변수가 잘못되면 로컬 fallback 없이 저장 실패가 그대로 보인다.
- 롤백 방법: `useFamilyOpenStore`의 localStorage fallback 로딩/쓰기 흐름을 되돌린다.

## 검증 결과
- 실행한 명령:
  - 운영 배포 읽기 전용 Playwright 네트워크 확인
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
- 결과:
  - 운영 배포 새 브라우저에서 `family_open_app_state?select=state&id=eq.default` GET 200 확인
  - 앱 코드에서 `localStorage` 참조 제거 확인: `rg` 결과 app/components/lib 내 참조 없음
  - typecheck 통과
  - ESLint 통과
  - Vitest 3 files, 8 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
- 남은 문제:
  - 이 변경은 아직 운영 배포에 반영되지 않았으므로 재배포 필요
  - 운영 저장 버튼 클릭 검증은 실제 DB 상태를 변경할 수 있어 미실행

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 운영 DB 큐티 테스트 데이터 여부를 확인하고, 요청된 출석/아이/선생님/홈 UI 개선을 반영한다.
- 사용자에게 주는 가치: 통계가 왜 보이는지 원인을 명확히 알고, 현장 입력 흐름과 홈 식별성이 좋아진다.

## 범위
### 포함
- 운영 Supabase `family_open_app_state` 읽기 전용 조회와 큐티 집계 원인 확인
- 출석 체크 화면 반 선택 드롭다운에 `전체` 옵션 추가
- 아이 등록/수정 부모님 정보에 관계 드롭다운 추가: 아빠, 엄마, 기타
- 선생님 화면 `등록된 선생님` 제목 옆 인원수 표시
- 홈 화면 상단에 `Seed` 타이틀과 초록색 애기 풀잎 로고 추가
- 관련 타입, 보정 로직, 테스트, 문서/진행 기록 갱신

### 제외
- 운영 Supabase 데이터 삭제 또는 초기화
- Auth/RLS 또는 공유 코드 도입
- 정규화된 DB 스키마 전환
- 이미지 파일 생성 또는 외부 에셋 추가

## 현재 상태
- 관련 화면/경로: `/reports`, `/attendance`, `/children`, `/teachers`, `/dashboard`
- 관련 테이블/마이그레이션: `family_open_app_state` 단일 JSON 행, migration 변경 없음
- 관련 테스트: family stats unit, Playwright 앱 흐름, DB migration 테스트

## 가정과 결정 기록
- [2026-06-26] 운영 데이터 조회는 읽기 전용으로만 수행한다. 테스트 데이터 삭제는 실제 DB 변경이므로 사용자 승인 전 실행하지 않는다.
- [2026-06-26] 부모 관계 값은 `father`, `mother`, `other`로 저장하고 화면에는 아빠/엄마/기타로 표시한다.
- [2026-06-26] 출석 화면 `전체`는 모든 활성 아이를 보여주되, 반 미지정 아이도 포함한다.
- [2026-06-26] 홈 로고는 별도 파일 없이 CSS/SVG 코드로 그린 단순 풀잎 마크로 구현한다.

## 완료 조건
- [x] 큐티 1명 표시의 DB 원인을 확인하고 결과를 보고한다.
- [x] 운영 데이터 삭제가 필요하면 승인 없이는 실행하지 않는다.
- [x] 출석 체크 화면 반 드롭다운에서 `전체`를 선택할 수 있다.
- [x] 부모 정보에 관계 드롭다운이 있고 저장/수정 후 유지된다.
- [x] 선생님 화면에 등록된 활성 선생님 수가 보인다.
- [x] 홈 화면에 Seed 타이틀과 초록색 풀잎 로고가 보인다.
- [ ] 필요한 테스트가 갱신되고 통과한다. typecheck, ESLint, unit, DB, build는 통과했으나 원격 DB 쓰기 위험 때문에 E2E는 미실행.
- [x] 문서와 진행 기록이 현재 코드와 일치한다.

## 테스트 계획
- 정적 검사: typecheck, ESLint
- 단위 테스트: parent relation normalization/display, stats
- 데이터베이스/RLS 테스트: migration 기준 테스트
- E2E 테스트: 전체 출석 필터, 부모 관계 입력, 선생님 수, 홈 타이틀/로고
- 빌드: Next.js production build

## 위험과 되돌리기
- 위험: 운영 DB에 테스트 데이터가 남아 있어 통계가 계속 보일 수 있다.
- 롤백 방법: 이번 UI 변경 파일을 되돌리고, 운영 데이터 정리는 별도 승인 후 수행한다.

## 검증 결과
- 실행한 명령:
  - 운영 Supabase `family_open_app_state` 읽기 전용 조회
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
- 결과:
  - 운영 DB에 활성 아이는 1명이고, 비활성 테스트 아이 `테스트아이1782461318678`의 `2026-06-28` 출석 기록에 `qtCompleted: true`가 남아 있음을 확인
  - 통계 집계가 활성 아이의 큐티 기록만 세도록 보정
  - 출석 화면 반 드롭다운 `전체` 옵션 추가
  - 부모 관계 드롭다운과 저장/정규화 로직 추가
  - 선생님 화면 활성 선생님 수 표시 추가
  - 홈 화면 `Seed` 타이틀과 초록색 풀잎 로고 추가
  - typecheck 통과
  - ESLint 통과
  - Vitest 3 files, 10 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
- 남은 문제:
  - 운영 DB 테스트 데이터 삭제/정리는 실제 데이터 변경이므로 사용자 승인 전 미실행
  - Playwright E2E는 `resetRemoteStore()`로 원격 Supabase 상태를 쓸 수 있어 미실행
  - 이 변경은 아직 운영 배포에 반영되지 않았으므로 재배포 필요

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 등록 아이 목록 카드에서 보호자 정보를 실제 등록된 보호자 이름으로 보여주고 등록일 표시는 제거한다.
- 사용자에게 주는 가치: 아이 목록에서 바로 보호자 이름을 확인할 수 있고 불필요한 등록일 정보로 화면이 복잡해지지 않는다.

## 범위
### 포함
- `/children` 아이 목록 카드의 보호자 표시 변경
- 보호자 이름이 없을 때의 빈 상태 문구 처리
- E2E/문서/진행 기록 갱신

### 제외
- 아이 상세 모달의 등록일 입력 제거
- 데이터 모델 또는 Supabase migration 변경
- 보호자 연락처 표시 추가

## 현재 상태
- 관련 화면/경로: `/children`
- 관련 테이블/마이그레이션: `family_open_app_state` 단일 JSON 행, migration 변경 없음
- 관련 테스트: Playwright 앱 흐름, Next.js typecheck/build

## 가정과 결정 기록
- [2026-06-26] 등록일은 목록 카드에서만 숨긴다. 상세 모달에는 기존 입력값과 저장 로직을 유지해 기존 데이터 호환성을 지킨다.
- [2026-06-26] 보호자가 여러 명이면 등록된 이름을 쉼표로 이어서 표시한다.
- [2026-06-26] 보호자 이름이 하나도 없으면 `보호자 미입력`으로 표시한다.

## 완료 조건
- [x] 아이 목록 카드에서 보호자 수가 아니라 등록된 보호자 이름이 보인다.
- [x] 아이 목록 카드에서 등록일이 보이지 않는다.
- [x] 보호자 이름이 없는 아이도 깨지지 않고 빈 상태 문구가 보인다.
- [ ] 필요한 테스트가 갱신되고 통과한다. typecheck, ESLint, unit, DB, build는 통과했으나 원격 DB 쓰기 위험 때문에 E2E는 미실행.
- [x] 문서와 진행 기록이 현재 코드와 일치한다.

## 테스트 계획
- 정적 검사: typecheck, ESLint
- 단위 테스트: 해당 없음
- 데이터베이스/RLS 테스트: migration 변경 없음 확인
- E2E 테스트: 아이 추가 후 목록 카드에 보호자 이름 표시 및 등록일 미표시 확인
- 빌드: Next.js production build

## 위험과 되돌리기
- 위험: 보호자 이름이 길면 모바일 카드에서 줄이 길어질 수 있다.
- 롤백 방법: `/children` 카드의 보호자/등록일 표시 변경을 되돌린다.

## 검증 결과
- 실행한 명령:
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
- 결과:
  - 아이 목록 카드 보호자 표시를 `보호자 {이름들}` 또는 `보호자 미입력`으로 변경
  - 아이 목록 카드에서 등록일 표시 제거
  - E2E 기대값과 설계/진행 문서 갱신
  - typecheck 통과
  - ESLint 통과
  - Vitest 3 files, 10 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
- 남은 문제:
  - Playwright E2E는 `resetRemoteStore()`로 원격 Supabase 상태를 쓸 수 있어 미실행
  - 이 변경은 아직 운영 배포에 반영되지 않았으므로 재배포 필요
