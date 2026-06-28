# Goal

## Addendum: legacy localStorage 정리

## 작업
- 한 문장으로 설명: 브라우저에 남아 있을 수 있는 과거 localStorage 앱 상태 키를 삭제하고, 현재 저장 기준이 Supabase DB임을 문서화한다.
- 사용자에게 주는 가치: 예전 로컬 저장 데이터가 화면 상태와 혼동되지 않고, 새 화면은 DB 상태만 기준으로 동작한다.

## 범위
### 포함
- legacy localStorage 키 `seed-family-open-store-v1` 상수화
- 앱 시작 시 legacy localStorage 키 삭제
- E2E 회귀 검증 갱신
- README, MVP 설계 문서, 진행 기록 갱신

### 제외
- 운영 Supabase `family_open_app_state` 테이블 삭제
- 운영 DB 데이터 삭제/초기화
- Auth/RLS 권한 구조 변경

## 결정 기록
- [2026-06-26] 브라우저 localStorage는 앱 상태 저장소로 사용하지 않으며, 남아 있는 legacy 키는 앱 시작 시 삭제한다.
- [2026-06-26] Supabase `family_open_app_state`는 로컬 DB가 아니라 원격 이관 원본/백업 테이블이다. 운영 정규화 migration 완료 전 삭제하면 데이터 손실 위험이 있어 삭제하지 않는다.

## 완료 조건
- [x] 앱 시작 시 `seed-family-open-store-v1` localStorage 키가 삭제된다.
- [x] 앱은 localStorage에서 상태를 읽거나 localStorage에 상태를 저장하지 않는다.
- [x] 문서에 localStorage 미사용 및 legacy 키 삭제 정책을 반영한다.
- [x] typecheck/lint/unit/DB/build 검증이 통과한다.
- [x] E2E는 운영 DB 변경 위험 때문에 실행하지 않고 사유를 기록한다.

## 검증 결과
- `pnpm run typecheck`: 통과
- `.\node_modules\.bin\eslint.cmd .`: 통과
- `.\node_modules\.bin\vitest.cmd run`: 3 files, 10 tests 통과
- `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`: 1 file, 1 test 통과
- `pnpm run build`: 통과
- Playwright E2E는 원격 Supabase 상태를 초기화하는 테스트라 운영 데이터 변경 위험 때문에 실행하지 않았다.

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
- 한 문장으로 설명: 생년월일 미상 7명을 원격 Supabase에 등록하고 아이들 목록에 가나다/반별 정렬을 추가한다.
- 사용자에게 주는 가치: 전체 명단이 출석부에 들어가고, 교사가 아이 목록을 이름순 또는 반별로 빠르게 확인할 수 있다.

## 범위
### 포함
- 보류된 7명 원격 등록 재시도 및 검증
- `/children` 아이 목록에 정렬 컨트롤 추가
- 기본 정렬을 가나다로 설정
- 반별 정렬은 반 순서 다음 이름순으로 정렬
- 정렬 로직 테스트와 문서/진행 기록 갱신

### 제외
- 출석 기록 생성
- DB schema 추가 변경
- 원격 데이터 삭제 또는 초기화
- 아이 목록 외 화면의 정렬 정책 변경

## 현재 상태
- 관련 화면/경로: `/children`
- 관련 테이블/마이그레이션: `children`, `child_parents`, `classes`, `20260627000100_nullable_child_birth.sql`
- 관련 테스트: family stats unit, DB migration test, 원격 Supabase 등록/조회

## 가정과 결정 기록
- [2026-06-27] 사용자가 원격 Supabase에서 nullable birth migration SQL을 적용했다고 알려주었으므로 7명 등록을 재시도한다.
- [2026-06-27] `가나다` 정렬은 아이 이름 기준 한국어 locale 오름차순이다.
- [2026-06-27] `반별` 정렬은 현재 반 목록 순서대로 정렬하고 같은 반 안에서는 이름 가나다순으로 정렬한다. 반 미지정은 마지막에 둔다.

## 완료 조건
- [x] 보류된 7명이 원격 Supabase에 등록된다.
- [x] 등록 후 원격 DB에서 7명과 보호자 5행을 확인한다.
- [x] 아이들 목록 기본 정렬이 가나다순이다.
- [x] 아이들 목록에서 반별 정렬을 선택할 수 있다.
- [x] 정렬 로직 테스트가 추가되고 통과한다.
- [x] 문서와 진행 기록이 현재 상태와 일치한다.

## 테스트 계획
- 정적 검사: `pnpm run typecheck`, ESLint
- 단위 테스트: 아이 목록 정렬 helper, nullable 생일 기존 테스트
- 데이터베이스/RLS 테스트: 원격 Supabase 등록/조회, migration test
- E2E 테스트: 운영 데이터 변경 작업이므로 자동 E2E는 실행하지 않고 DB 조회와 단위 테스트로 검증
- 수동 확인 화면 크기: CSS는 모바일 2버튼 segmented control로 구성

## 위험과 되돌리기
- 위험: 실제 개인정보가 원격 DB에 쓰인다.
- 위험: 반별 정렬은 현재 반 배열 순서에 의존한다.
- 롤백 방법: 이번 등록 child id 7개를 삭제하면 `child_parents`는 cascade로 삭제된다. UI 정렬 변경은 `/children`과 정렬 helper 변경을 되돌린다.

## 검증 결과
- 실행한 명령:
  - `node tmp\register_missing_birth_children.mjs`
  - `node tmp\register_missing_birth_children.mjs --execute`
  - `node tmp\register_missing_birth_children.mjs --verify`
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
- 결과:
  - dry-run: 7명, 보호자 5행 확인
  - execute: 원격 Supabase에 7명 upsert, 보호자 5행 insert 성공
  - verify: 원격 DB에서 아이 7명, 보호자 5행, null 생일 7명 확인
  - `/children` 목록에 가나다/반별 정렬 컨트롤 추가
  - 기본 정렬은 가나다순으로 설정
  - 반별 정렬 helper와 단위 테스트 추가
  - typecheck 통과
  - ESLint 통과
  - Vitest 3 files, 12 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
  - 개인정보 원본이 포함된 임시 등록 스크립트는 검증 후 삭제함
- 남은 문제:
  - 운영 반영에는 재배포가 필요함

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 사용자가 제공한 2학년부터 6학년까지의 아이 목록을 Supabase 정규화 테이블에 등록한다.
- 사용자에게 주는 가치: 실제 초등부 아이 명단이 앱의 아이들/출석 화면에서 바로 사용할 수 있게 된다.

## 범위
### 포함
- 제공된 표의 아이 이름, 성별, 생년월일, 보호자 이름/전화번호, 주소, 이메일, 등록일, 반, 특이사항 등록
- 등록일이 `YYYY.MM` 또는 `YYYY.MM.`처럼 월까지만 있는 경우 해당 월 1일로 보정
- 현재 원격 DB의 기존 반/아이 데이터를 보존하면서 새 아이를 병합
- 등록 후 원격 DB 조회로 등록 건수와 주요 필드 검증
- `docs/PROGRESS.md`에 진행 결과 기록

### 제외
- 출석 기록 임의 생성
- 선생님 또는 반 구조의 대규모 변경
- Auth/RLS 권한 구조 변경
- 모호하거나 유효하지 않은 날짜를 제품 책임자 확인 없이 임의 날짜로 확정

## 현재 상태
- 관련 화면/경로: `/children`, `/attendance`
- 관련 테이블/마이그레이션: `children`, `child_parents`, `classes`
- 관련 테스트: 데이터 파싱 검증 스크립트, 원격 Supabase 읽기/쓰기 확인, typecheck/lint 가능 범위

## 가정과 결정 기록
- [2026-06-27] 등록일이 월까지만 있으면 사용자의 지시에 따라 해당 월 1일로 저장한다.
- [2026-06-27] 빈 등록일, 빈 생년월일, 유효하지 않은 생년월일/등록일은 임의 보정하지 않고 확인 대상으로 남긴다.
- [2026-06-27] 같은 이름이라도 생년월일/보호자가 다르면 별도 아이로 등록할 수 있다.

## 완료 조건
- [x] 제공된 명단 중 검증 가능한 아이가 원격 Supabase `children`/`child_parents`에 등록된다.
- [x] 반 값이 2학년~6학년 class_id에 연결된다.
- [x] 등록일 월 단위 입력은 1일로 보정되어 저장된다.
- [x] 모호하거나 유효하지 않은 값은 임의로 왜곡하지 않고 사용자에게 보고된다.
- [x] 등록 후 원격 DB 조회로 아이 수와 보호자 수를 확인한다.
- [x] 진행 결과가 `docs/PROGRESS.md`에 기록된다.

## 테스트 계획
- 정적 검사: 등록 스크립트 TypeScript/JavaScript 실행 전 dry-run 검증
- 단위 테스트: 해당 없음
- 데이터베이스/RLS 테스트: 원격 Supabase select/upsert/delete 없이 필요한 행 upsert 확인
- E2E 테스트: 운영 데이터 변경 작업이므로 자동 E2E는 실행하지 않고 DB 조회로 검증
- 수동 확인 화면 크기: UI 변경 없음

## 위험과 되돌리기
- 위험: 실제 개인정보가 원격 DB에 쓰인다.
- 위험: 기존 저장 어댑터의 전체 저장 방식은 잘못 사용하면 기존 데이터를 삭제할 수 있으므로 직접 테이블 upsert 방식으로 등록한다.
- 롤백 방법: 이번 작업에서 생성한 child id 목록을 기준으로 `children` 행을 삭제하면 `child_parents`는 cascade로 삭제된다.

## 검증 결과
- 실행한 명령:
  - `node tmp\register_children_roster.mjs`
  - `node tmp\register_children_roster.mjs --inspect`
  - `node tmp\register_children_roster.mjs --execute`
  - `node tmp\register_children_roster.mjs --verify`
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
- 결과:
  - dry-run: 총 52명 중 생년월일이 유효한 45명 등록 가능, 생년월일 문제 7명 보류 확인
  - inspect: 원격 Supabase에 1학년~6학년 반 6개, 기존 아이 11명 확인. 이번 2학년~6학년 명단과 자연키 충돌 없음
  - execute: 기존 반 사용, 새 아이 45명 등록, 보호자 77행 등록, 생년월일 문제 7명 보류
  - verify: 원격 DB에서 등록 대상 45명과 보호자 77행 확인, 월 단위 등록일 39/39건이 해당 월 1일로 저장됨
  - typecheck 통과
  - ESLint 통과
  - 개인정보 원본이 포함된 임시 등록 스크립트는 검증 후 삭제함
- 남은 문제:
  - 생년월일이 비었거나 `00.00`인 7명은 DB 필수 생일 월/일을 임의로 만들지 않기 위해 보류함: 노찬아, 박로빈, 이정우, 송리유, 이한나, 김도완, 김라온
  - 정채원의 등록일 `2011/2002`는 유효한 날짜로 해석하지 않고 비워 저장함
  - 등록일이 생년월일보다 빠른 6건은 제공값 그대로 저장했으며, 필요하면 별도 정정 필요

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 아이 생일을 nullable로 바꾸고 생년월일 미상 7명을 원격 Supabase에 등록한다.
- 사용자에게 주는 가치: 생년월일을 아직 모르는 아이도 출석부에 먼저 포함해 반별 출석 체크에 사용할 수 있다.

## 범위
### 포함
- `children.birth_month`, `children.birth_day` nullable migration 추가
- 앱 타입, 저장 어댑터, 생일 표시/월간 생일 통계가 생일 미입력 아이를 처리하도록 수정
- 생년월일 미상 아이 등록 시 생일 관련 DB 필드는 `null`로 저장
- 보류된 7명 등록 및 원격 DB 조회 검증
- 문서와 진행 기록 갱신

### 제외
- 선생님 생일 nullable 변경
- 생일 추정값 입력
- Auth/RLS 권한 구조 변경
- 운영 DB schema migration을 service role 없이 강제로 적용

## 현재 상태
- 관련 화면/경로: `/children`, `/attendance`, `/reports`, 아이 상세 모달
- 관련 테이블/마이그레이션: `children.birth_month`, `children.birth_day`
- 관련 테스트: family stats unit, DB migration test, 원격 Supabase 등록/조회

## 가정과 결정 기록
- [2026-06-27] 사용자가 생일 nullable을 명시 승인했으므로 생년월일 미상 아이는 `birth_date`, `birth_year`, `birth_month`, `birth_day`를 모두 `null`로 저장한다.
- [2026-06-27] 생일 미상 아이는 월간 생일자 통계에서 제외한다.
- [2026-06-27] 생일 미상 아이의 화면 표시는 `생년월일 미입력`으로 한다.
- [2026-06-27] 현재 `.env.local`에는 publishable key만 있어 원격 schema migration은 직접 적용하지 못할 수 있다. 적용이 막히면 SQL migration 파일과 필요한 수동 적용 절차를 남긴다.

## 완료 조건
- [x] 생일 미상 아이를 표현할 수 있도록 앱 타입과 저장 로직이 nullable 생일을 지원한다.
- [x] 새 migration이 `children.birth_month`/`birth_day`의 NOT NULL 제약을 제거한다.
- [x] 생일 미상 아이는 월간 생일 통계에서 제외된다.
- [x] 보류된 7명이 원격 Supabase에 등록된다.
- [x] 등록 후 원격 DB에서 7명과 보호자 정보를 확인한다.
- [x] 필요한 테스트와 문서가 갱신되고 통과한다.

## 테스트 계획
- 정적 검사: `pnpm run typecheck`, ESLint
- 단위 테스트: `formatChildBirthDate`, `getMonthlyBirthdays` nullable 생일 처리
- 데이터베이스/RLS 테스트: migration 파일에 nullable 변경 포함 확인
- E2E 테스트: 운영 데이터 변경 작업이므로 자동 E2E는 실행하지 않고 DB 조회로 검증
- 수동 확인 화면 크기: UI 구조 변경은 최소화

## 위험과 되돌리기
- 위험: 원격 DB migration 적용 전에는 null 생일 insert가 NOT NULL 제약으로 실패할 수 있다.
- 위험: 생일 미상 아이는 생일 통계에 표시되지 않는다.
- 롤백 방법: 등록된 7명 child id를 삭제하고, migration 적용 전이면 적용하지 않는다. 적용 후 롤백하려면 null 생일 데이터를 정리한 뒤 NOT NULL 제약을 되돌려야 한다.

## 검증 결과
- 실행한 명령:
  - `node tmp\register_missing_birth_children.mjs`
  - `node tmp\register_missing_birth_children.mjs --execute`
  - `node tmp\register_missing_birth_children.mjs --verify`
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
- 결과:
  - dry-run: 남은 7명, 보호자 5행 등록 대상 확인
  - 원격 등록 시도 실패: `null value in column "birth_month" of relation "children" violates not-null constraint`
  - 사용자 원격 alter table 적용 후 재실행하여 보류 7명 등록 성공
  - 원격 DB 조회에서 아이 7명, 보호자 5행, null 생일 7명 확인
  - `20260627000100_nullable_child_birth.sql` migration 추가
  - 앱 타입/저장/표시/통계가 nullable 아이 생일을 지원하도록 변경
  - typecheck 통과
  - ESLint 통과
  - Vitest 3 files, 11 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
  - 개인정보 원본이 포함된 임시 등록 스크립트는 검증 후 삭제함
- 남은 문제:
  - 운영 반영에는 재배포가 필요함

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 단일 JSON 저장 구조를 정규화된 Supabase 업무 테이블 구조로 개편한다.
- 사용자에게 주는 가치: 아이, 보호자, 반, 선생님, 출석 기록이 각각 테이블로 관리되어 검색·통계·이력·권한 분리의 기반이 생긴다.

## 범위
### 포함
- `organizations`, `teachers`, `classes`, `children`, `child_parents`, `attendance_sessions`, `attendance_records` migration 추가
- 기존 `family_open_app_state` JSON 데이터를 정규화 테이블로 이관하는 SQL 포함
- 기본 조직 1개 기준의 RLS 정책과 인덱스 추가
- 앱 저장 계층을 정규화 테이블 읽기/쓰기 기준으로 교체
- DB 테스트, 타입, 문서, 진행 기록 갱신

### 제외
- 운영 Supabase에 migration 직접 적용
- 로그인, 초대, 역할별 UI, 교사별 접근 제한 도입
- 사진 파일 스토리지 전환
- 다중 조직 전환 UI
- 운영 데이터 삭제 또는 초기화

## 현재 상태
- 관련 화면/경로: 전체 앱 저장 흐름(`/dashboard`, `/attendance`, `/children`, `/teachers`, `/settings`, `/reports`)
- 관련 테이블/마이그레이션: 현재 `family_open_app_state` 단일 JSON 행만 사용
- 관련 테스트: DB migration 문자열 테스트, family stats unit, Playwright 앱 흐름

## 가정과 결정 기록
- [2026-06-26] 현재 사용자 경험을 깨지 않기 위해 로그인 없는 패밀리 오픈은 유지한다. 대신 모든 업무 테이블에 `organization_id`를 두고 RLS를 켠다.
- [2026-06-26] 이번 단계의 RLS는 기본 조직 1개에 대해 `anon`/`authenticated` 읽기·쓰기를 허용한다. 완전한 보안을 위해서는 다음 단계에서 로그인 또는 공유 코드를 결정해야 한다.
- [2026-06-26] 기존 JSON 테이블은 백업과 이관 원본으로 유지하고 삭제하지 않는다.
- [2026-06-26] 사진은 현재처럼 Data URL 텍스트로 유지한다. Storage 전환은 별도 결정이 필요하다.
- [2026-06-26] 앱 내부 타입과 화면 API는 우선 유지하고, 저장 어댑터만 정규화 테이블을 바라보게 한다.

## 완료 조건
- [x] 정규화된 업무 테이블 migration이 추가된다.
- [x] 기존 JSON 데이터를 정규화 테이블로 이관할 수 있는 SQL이 포함된다.
- [x] 앱 로딩이 단일 JSON이 아니라 정규화 테이블에서 상태를 조립한다.
- [x] 앱 저장이 단일 JSON upsert가 아니라 정규화 테이블에 저장한다.
- [x] 모든 신규 업무 테이블에 RLS가 켜져 있다.
- [ ] 필요한 테스트가 갱신되고 통과한다. typecheck, ESLint, unit, DB, build는 통과했으나 원격 DB 쓰기 위험 때문에 E2E는 미실행.
- [x] 문서와 진행 기록이 현재 코드와 일치한다.

## 테스트 계획
- 정적 검사: typecheck, ESLint
- 단위 테스트: 기존 stats/store 보정 Vitest
- 데이터베이스/RLS 테스트: migration 파일에 정규화 테이블, RLS, JSON 이관 SQL 포함 확인
- E2E 테스트: 원격 DB 쓰기 위험 때문에 기본적으로 미실행, 필요 시 승인 후 실행
- 빌드: Next.js production build

## 위험과 되돌리기
- 위험: 운영 DB에 migration 적용 전 배포하면 앱이 신규 테이블을 찾지 못해 저장 실패가 표시될 수 있다.
- 위험: 현재 RLS는 로그인 없는 기본 조직 공개 쓰기를 유지하므로 외부 공개 서비스 수준의 권한 분리는 아직 아니다.
- 롤백 방법: 저장 어댑터를 `family_open_app_state` JSON 저장 경로로 되돌리고 신규 migration 적용 전이면 migration을 적용하지 않는다.

## 검증 결과
- 실행한 명령:
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
- 결과:
  - `20260626000200_normalized_family_schema.sql` migration 추가
  - `organizations`, `teachers`, `classes`, `children`, `child_parents`, `attendance_sessions`, `attendance_records` 테이블 추가
  - 기존 `family_open_app_state` JSON을 새 테이블로 이관하는 SQL 포함
  - 신규 업무 테이블 RLS와 기본 조직 정책 추가
  - 앱 저장 어댑터를 정규화 테이블 읽기/쓰기 방식으로 교체
  - 저장 어댑터가 현재 store에 없는 반, 선생님, 아이 행을 정리하도록 보강
  - E2E 원격 초기화 helper를 새 저장 어댑터 기준으로 갱신
  - README, instruction, MVP 설계서, 진행 기록, DB 테스트 갱신
  - typecheck 통과
  - ESLint 통과
  - Vitest 3 files, 10 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
- 남은 문제:
  - 운영 Supabase에는 아직 새 migration을 적용하지 않았다.
  - migration 적용 전 이 코드가 운영에 배포되면 신규 테이블이 없어 `저장 실패`가 표시될 수 있다.
  - Playwright E2E는 `resetRemoteStore()`가 원격 Supabase 상태를 쓸 수 있어 미실행.
  - 현재 RLS는 기본 조직 공개 읽기/쓰기이며, 공개 운영 전 Auth 또는 공유 코드 기반 권한 정책 결정이 필요하다.

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 아이 목록 보호자 라벨을 더 간결하게 바꾸고, 출석 화면과 아이 관련 아바타에 성별별 색상을 적용한다.
- 사용자에게 주는 가치: 아이 목록과 출석 체크 화면에서 아이를 더 빠르게 구분할 수 있고, 화면 정보가 덜 복잡해진다.

## 범위
### 포함
- `/children` 아이 목록에서 `보호자` 접두어 제거
- `/attendance` 출석 행에 아이 목록과 같은 아바타 추가
- 아이 목록, 출석 화면, 아이 상세 모달의 사진 없는 아이 아바타 색상을 성별별로 구분
- E2E/문서/진행 기록 갱신

### 제외
- 선생님 아바타 색상 변경
- 실제 사진 업로드/저장 방식 변경
- 성별 데이터 모델 변경 또는 migration 추가

## 현재 상태
- 관련 화면/경로: `/children`, `/attendance`, 아이 상세 모달
- 관련 테이블/마이그레이션: `family_open_app_state` 단일 JSON 행, migration 변경 없음
- 관련 테스트: Playwright 앱 흐름, Next.js typecheck/build

## 가정과 결정 기록
- [2026-06-26] 사진이 있는 아이는 사진을 그대로 우선 표시하고, 성별 색상은 사진이 없는 기본 아바타에만 적용한다.
- [2026-06-26] 남자 아바타는 파란 계열, 여자 아바타는 분홍 계열, 미입력은 초록 계열로 표시한다.
- [2026-06-26] 보호자 이름이 없을 때는 `미입력`으로 표시해 `보호자` 텍스트를 목록에서 완전히 제거한다.

## 완료 조건
- [x] 아이 목록에서 보호자 이름 앞 `보호자` 텍스트가 보이지 않는다.
- [x] 출석 화면 아이 이름 앞에 아이 목록과 같은 형태의 아바타가 보인다.
- [x] 사진 없는 아이 아바타가 성별에 따라 다른 색상으로 보인다.
- [ ] 필요한 테스트가 갱신되고 통과한다. typecheck, ESLint, unit, DB, build는 통과했으나 원격 DB 쓰기 위험 때문에 E2E는 미실행.
- [x] 문서와 진행 기록이 현재 코드와 일치한다.

## 테스트 계획
- 정적 검사: typecheck, ESLint
- 단위 테스트: 해당 없음
- 데이터베이스/RLS 테스트: migration 변경 없음 확인
- E2E 테스트: 아이 추가 후 목록 보호자 이름, 출석 화면 아바타 확인
- 빌드: Next.js production build

## 위험과 되돌리기
- 위험: 출석 행에 아바타가 추가되며 모바일에서 한 줄 공간이 줄어든다.
- 롤백 방법: 공통 아이 아바타 컴포넌트 적용과 보호자 라벨 변경을 되돌린다.

## 검증 결과
- 실행한 명령:
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
- 결과:
  - 아이 목록 보호자 표시를 이름만 보이도록 변경
  - 공통 `ChildAvatar` 컴포넌트 추가 및 성별별 기본 아바타 색상 적용
  - 출석 화면 아이 행 앞 아바타 추가
  - 아이 상세 모달 사진 미입력 상태에 성별별 아바타 색상 적용
  - E2E 기대값과 설계/진행 문서 갱신
  - typecheck 통과
  - ESLint 통과
  - Vitest 3 files, 10 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
- 남은 문제:
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
- [2026-06-26] 보호자 이름이 하나도 없으면 `미입력`으로 표시한다.

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
  - 아이 목록 카드 보호자 표시를 `{이름들}` 또는 `미입력`으로 변경
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

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 앱 초기 렌더링에서 예전 테스트 반 데이터가 잠깐 보이는 런타임 fallback 경로를 제거한다.
- 사용자에게 주는 가치: 홈 화면과 다른 화면이 항상 현재 Supabase DB 데이터만 기준으로 표시되고, 빈 DB나 로딩 중에도 테스트 데이터가 섞여 보이지 않는다.

## 범위
### 포함
- 런타임 초기 상태를 테스트 샘플 데이터가 아닌 빈 store로 변경
- Supabase 정규화 테이블이 비어 있을 때 기본 샘플 데이터를 자동 저장하지 않도록 변경
- store 보정 fallback이 샘플 데이터 대신 빈 store를 사용하도록 변경
- 홈 화면 로딩 상태 보강
- 테스트 fixture와 런타임 store 생성 경로 분리 검증
- README, MVP 설계 문서, PROGRESS 기록 갱신

### 제외
- 운영 DB 데이터 삭제 또는 초기화
- E2E가 원격 DB를 reset하는 시나리오 실행
- Auth/RLS 권한 구조 변경

## 현재 상태
- 관련 화면/경로: `/dashboard`, 공통 `useFamilyOpenStore`
- 관련 저장소: Supabase 정규화 업무 테이블, legacy `family_open_app_state` 백업 테이블
- 관련 테스트: family stats unit, DB migration test, typecheck, ESLint, build

## 가정과 결정 기록
- [2026-06-27] 예전 데이터 노출은 로컬 DB/cache 조회가 아니라 런타임 기본 샘플 store가 초기 렌더와 빈 DB fallback에 사용된 결과로 본다.
- [2026-06-27] 테스트 fixture는 유지하되 앱 런타임에서 import하지 않도록 분리한다.
- [2026-06-27] Supabase 정규화 테이블이 비어 있으면 샘플 seed를 자동 생성하지 않고 빈 상태를 보여준다.

## 완료 조건
- [x] 초기 React state가 샘플 반/아이/선생님 데이터를 포함하지 않는다.
- [x] Supabase 로드 실패 또는 빈 DB 상태에서 샘플 데이터를 저장하거나 표시하지 않는다.
- [x] 홈 화면 로딩 중 예전 테스트 반명이 보이지 않는다.
- [x] 관련 테스트와 문서가 갱신되고 typecheck/lint/unit/DB/build가 통과한다.

## 테스트 계획
- 정적 검사: `pnpm run typecheck`, ESLint
- 단위 테스트: `.\node_modules\.bin\vitest.cmd run`
- DB 테스트: `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
- 빌드: `pnpm run build`
- E2E: 원격 DB reset 위험 때문에 이번 작업에서는 기본적으로 실행하지 않고 사유를 기록한다.

## 위험과 되돌리기
- 위험: Supabase 설정이 없거나 비어 있으면 더 이상 테스트 샘플이 보이지 않고 빈 상태가 보인다.
- 롤백 방법: 빈 store 초기화/fallback 변경을 되돌리고 기존 기본 샘플 store 경로를 복구한다.

## 검증 결과
- 실행한 명령:
  - `rg "createDefaultFamilyOpenStore" app components lib`
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
- 결과:
  - 런타임 경로에서는 `createDefaultFamilyOpenStore()` import가 사라지고 정의 파일만 남았다.
  - 예전 테스트 반명 문자열은 런타임/테스트 fixture에서 제거되었고 진행 기록의 원인 설명에만 남았다.
  - typecheck 통과
  - ESLint 통과
  - Vitest 3 files, 13 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
- 남은 문제:
  - Playwright E2E는 `resetRemoteStore()`가 원격 Supabase 상태를 초기화할 수 있어 실행하지 않았다.
  - 이 변경은 아직 운영 배포에 반영되지 않았으므로 재배포가 필요하다.

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 출석 체크 명단을 가나다순으로 정렬하고 모바일 기준으로 출석 화면의 UI/UX와 렌더링 성능을 보강한다.
- 사용자에게 주는 가치: 교사가 휴대폰에서 아이를 더 빨리 찾고, 아직 누르지 않은 출석/큐티 버튼을 명확히 구분하며, 출석 체크 흐름이 더 안정적으로 동작한다.

## 범위
### 포함
- `/attendance` 아이 명단을 기본 가나다순으로 정렬
- 출석/큐티 미선택 버튼을 회색 계열의 비활성 느낌으로 변경
- 모바일 기준 출석 화면 정보 밀도, 터치 영역, 저장 버튼 접근성 점검 및 개선
- 불필요한 반복 계산/렌더링이 있으면 memoization 등으로 개선
- 관련 단위 테스트와 문서/진행 기록 갱신

### 제외
- 출석 데이터 모델 또는 DB schema 변경
- 운영 DB 데이터 수정 또는 초기화
- Auth/RLS 권한 구조 변경
- 앱 전체 정보 구조의 대규모 개편

## 현재 상태
- 관련 화면/경로: `/attendance`, 공통 저장 hook, family stats helper
- 관련 테이블/마이그레이션: `classes`, `children`, `attendance_sessions`, `attendance_records` 변경 없음 예상
- 관련 테스트: family stats unit, DB migration test, typecheck, ESLint, build, 가능하면 모바일 화면 확인

## 가정과 결정 기록
- [2026-06-27] 출석 화면의 가나다순은 선택된 반 또는 전체 필터 안에서 아이 이름 기준 한국어 locale 오름차순으로 적용한다.
- [2026-06-27] 버튼의 미선택 상태는 실제 disabled가 아니라 클릭 가능한 회색 상태로 표시한다. 이유: 사용자는 눌러서 선택할 수 있어야 하기 때문이다.
- [2026-06-27] 모바일 UI 개선은 출석 체크의 빠른 입력 흐름을 해치지 않는 작은 수직 변경으로 제한한다.

## 완료 조건
- [x] 출석 체크 명단이 가나다순으로 표시된다.
- [x] 출석과 큐티 버튼의 미선택 상태가 회색 계열로 보이고 클릭 가능하다.
- [x] 모바일 기준에서 주요 터치 영역과 저장 흐름이 더 명확해진다.
- [x] 불필요한 계산/렌더링 개선이 필요한 부분은 반영된다.
- [x] 관련 테스트와 문서가 갱신되고 typecheck/lint/unit/DB/build가 통과한다.
- [x] 진행 결과가 `docs/PROGRESS.md`에 기록된다.

## 테스트 계획
- 정적 검사: `pnpm run typecheck`, ESLint
- 단위 테스트: `.\node_modules\.bin\vitest.cmd run`
- DB 테스트: `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
- 빌드: `pnpm run build`
- 화면 확인: 가능하면 로컬 dev server와 모바일 viewport에서 `/attendance` 확인
- E2E: 원격 Supabase reset 위험이 있으면 실행하지 않고 사유를 기록한다.

## 위험과 되돌리기
- 위험: 버튼 색상 대비가 낮아지면 상태 인지가 어려워질 수 있다.
- 위험: sticky 저장 UI가 콘텐츠를 가릴 수 있다.
- 롤백 방법: `/attendance` 화면 변경과 정렬 helper 변경을 되돌린다.

## 검증 결과
- 실행한 명령:
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
  - production 서버 임시 실행 후 Playwright 390×844 모바일 viewport 확인
- 결과:
  - 출석 명단용 `getAttendanceRosterChildren` helper 추가 및 가나다순 단위 테스트 통과
  - 출석/큐티 미선택 버튼이 회색 계열 상태로 표시되도록 변경
  - 모바일 sticky 저장 bar 추가, 공통 disabled 버튼 회색 상태 보강
  - 렌더 중 draft `setState` 패턴 제거
  - typecheck 통과
  - ESLint 통과
  - Vitest 3 files, 14 tests 통과
  - DB Vitest 1 file, 1 test 통과
  - Next.js production build 통과
  - 390×844 `/attendance` 확인: `scrollWidth = 390`, `innerWidth = 390`, 가로 스크롤 없음
- 남은 문제:
  - 로컬 확인 환경에서는 원격 데이터가 로드되지 않아 실제 아이 토글 DOM 색상은 화면에서 직접 확인하지 못했다.
  - Playwright E2E는 원격 Supabase 상태 초기화 위험 때문에 실행하지 않았다.
  - 이 변경은 아직 운영 배포에 반영되지 않았으므로 재배포가 필요하다.

# Goal Addendum

## 작업
- 한 문장으로 설명: 출석 체크 전체 보기 정렬을 반별 다음 가나다순으로 바꾸고, 모바일 출석/통계 화면의 날짜 입력 폭 넘침을 보정한다.
- 사용자에게 주는 가치: 교사가 전체 명단을 볼 때 반 단위로 빠르게 훑을 수 있고, 모바일 카드 안에서 날짜 입력이 화면을 밀어내지 않는다.

## 범위
### 포함
- `/attendance`에서 반 필터가 전체일 때 반 순서 후 이름 가나다순 정렬
- `/attendance`에서 특정 반 선택 시 기존처럼 이름 가나다순 정렬 유지
- `/attendance`, `/reports`의 날짜 입력과 같은 필터 컨트롤이 모바일 카드 폭을 넘지 않도록 보정
- 관련 단위 테스트, MVP 설계 문서, 진행 기록 갱신

### 제외
- DB schema 또는 운영 데이터 변경
- 출석 저장 로직 변경
- 원격 Supabase 상태를 초기화하는 E2E 실행

## 현재 상태
- 관련 화면/경로: `/attendance`, `/reports`
- 관련 테이블/마이그레이션: 변경 없음
- 관련 테스트: family stats unit, DB migration test, typecheck, ESLint, build, 모바일 viewport 확인

## 가정과 결정 기록
- [2026-06-27] 전체 반 보기는 현재 `classes` 배열 순서를 반 순서로 보고, 각 반 안에서 이름 가나다순으로 정렬한다.
- [2026-06-27] 특정 반 선택 시에는 반 정보가 이미 고정되어 있으므로 이름 가나다순을 유지한다.
- [2026-06-27] 모바일 날짜 입력 overflow는 레이아웃 폭 보정 문제로 보고 입력 요소와 그리드 자식에 `min-width: 0`/`max-width: 100%`를 적용한다.

## 완료 조건
- [x] 전체 반 출석 명단이 반별 정렬 후 가나다순으로 표시된다.
- [x] 특정 반 출석 명단은 가나다순으로 표시된다.
- [x] 모바일 출석 화면 날짜 입력이 카드 영역을 벗어나지 않는다.
- [x] 모바일 통계 화면 날짜 입력이 카드 영역을 벗어나지 않는다.
- [x] 관련 테스트와 build가 통과한다.
- [x] 진행 결과가 `docs/PROGRESS.md`에 기록된다.

## 테스트 계획
- 정적 검사: `pnpm run typecheck`, ESLint
- 단위 테스트: `.\node_modules\.bin\vitest.cmd run`
- DB 테스트: `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
- 빌드: `pnpm run build`
- 화면 확인: production 서버에서 390x844 viewport로 `/attendance`, `/reports` 날짜 입력과 가로 스크롤 여부 확인

## 위험과 되돌리기
- 위험: 반 순서가 DB의 `classes` 정렬 순서에 의존한다.
- 롤백 방법: `getAttendanceRosterChildren` 정렬 모드 변경과 날짜 입력 class 변경을 되돌린다.

## 검증 결과
- 실행한 명령:
  - `pnpm run typecheck`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
  - production 서버 임시 실행 후 Playwright 390×844 모바일 viewport에서 `/attendance`, `/reports` DOM 폭 확인
- 결과:
  - `getAttendanceRosterChildren`이 전체 반에서는 `class` 정렬, 특정 반에서는 `name` 정렬을 사용하도록 변경했다.
  - 관련 단위 테스트를 전체 반 반별 정렬 기대값으로 갱신했고 Vitest 3 files, 14 tests가 통과했다.
  - `/attendance` 모바일 확인: `documentScrollWidth = 390`, `innerWidth = 390`, 날짜 input `34..356`, 카드 `16..374`, overflow 없음.
  - `/reports` 모바일 확인: `documentScrollWidth = 390`, `innerWidth = 390`, 날짜 input `34..356`, 카드 `16..374`, overflow 없음.
  - typecheck, ESLint, DB Vitest, Next.js production build 통과.
- 남은 문제:
  - Playwright E2E 전체 스위트는 원격 Supabase 상태 초기화 위험 때문에 실행하지 않았다.
  - 이 변경은 아직 운영 배포에 반영되지 않았으므로 재배포가 필요하다.

---

# Goal Addendum

## 작업
- 한 문장으로 설명: 아이와 선생님 사진 선택 시 500KB를 넘는 휴대폰 사진을 브라우저에서 자동으로 줄여 저장한다.
- 사용자에게 주는 가치: 교사가 휴대폰으로 찍은 사진을 별도 편집 없이 바로 등록할 수 있다.

## 범위
### 포함
- 아이 상세/등록 모달 사진 선택 자동 축소
- 선생님 등록/수정 모달 사진 선택 자동 축소
- 저장되는 Data URL 크기를 500KB 이하로 제한
- 사진 처리 중/자동 축소 완료/오류 상태 표시
- 관련 단위 테스트, 설계 문서, 진행 기록 갱신

### 제외
- Supabase Storage 또는 외부 파일 저장 전환
- DB schema 변경
- 기존 저장 사진 일괄 재압축
- Auth/RLS 또는 공유 코드 권한 변경

## 현재 상태
- 관련 화면/경로: `/children`, `/attendance` 아이 상세 모달, `/teachers` 선생님 모달
- 관련 테이블/마이그레이션: `children.photo_data_url`, `teachers.photo_data_url`, migration 변경 없음
- 관련 테스트: photo helper unit, 기존 family stats unit, DB migration test, typecheck, ESLint, build

## 가정과 결정 기록
- [2026-06-27] 사진 저장 방식은 현재처럼 Data URL 텍스트를 유지한다. Storage 전환은 별도 제품 결정이 필요하다.
- [2026-06-27] 큰 사진은 프로필용 미리보기 품질을 우선해 긴 변 1024px 이하 JPEG로 시작하고, 500KB 이하가 될 때까지 품질과 크기를 단계적으로 낮춘다.
- [2026-06-27] 브라우저가 디코딩할 수 없는 이미지 형식은 자동 축소할 수 없으므로 JPG/PNG 등 일반 이미지 재선택 안내를 표시한다.

## 완료 조건
- [x] 500KB 초과 이미지 파일도 자동 축소 후 아이 사진으로 저장할 수 있다.
- [x] 500KB 초과 이미지 파일도 자동 축소 후 선생님 사진으로 저장할 수 있다.
- [x] 이미지가 아니거나 축소 후에도 제한을 넘으면 오류 메시지가 보인다.
- [x] 사진 처리 중 중복 제출을 막고 상태가 표시된다.
- [x] 모바일 기준 화면에서 사진 입력 UI가 가로 스크롤을 만들지 않는다.
- [x] 관련 테스트와 build가 통과한다.
- [x] 문서와 진행 기록이 현재 코드와 일치한다.

## 테스트 계획
- 정적 검사: `pnpm run typecheck`, ESLint
- 단위 테스트: 사진 Data URL 크기 계산과 축소 계획 helper
- 데이터베이스/RLS 테스트: migration 변경 없음 확인
- E2E 테스트: 원격 Supabase 상태 변경 위험이 있으므로 이번 작업에서는 기본적으로 실행하지 않고 사유를 기록한다.
- 빌드: `pnpm run build`
- 수동 확인 화면 크기: 가능하면 390x844 모바일 viewport에서 사진 입력 UI overflow 확인

## 위험과 되돌리기
- 위험: JPEG 변환으로 투명 PNG나 애니메이션 GIF의 원본 특성이 사라질 수 있다.
- 위험: 매우 특수한 이미지 형식은 브라우저 canvas에서 디코딩하지 못할 수 있다.
- 롤백 방법: photo helper와 두 모달의 사진 처리 변경을 되돌리면 기존 500KB 파일 선택 제한으로 복귀한다.

## 검증 결과
- 실행한 명령:
  - `pnpm run typecheck`
  - `pnpm run lint`
  - `.\node_modules\.bin\eslint.cmd .`
  - `.\node_modules\.bin\vitest.cmd run`
  - `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`
  - `pnpm run build`
  - 임시 Playwright 스크립트 `node tmp\check-photo-ui.mjs`
- 결과:
  - `preparePhotoDataUrl` helper 추가: 작은 사진은 기존 Data URL로 유지하고, 큰 사진은 canvas에서 JPEG로 축소해 500KB 이하 Data URL만 반환한다.
  - 아이 상세/등록 모달과 선생님 등록/수정 모달이 helper를 사용하도록 변경했다.
  - 사진 처리 중에는 저장 버튼이 비활성화되고, 처리 중/자동 축소 완료 메시지가 표시된다.
  - 비이미지 파일은 단위 테스트로 오류 메시지를 확인했다.
  - `pnpm run typecheck`: 통과
  - `pnpm run lint`: PowerShell `pnpm.exe` 접근 거부로 실패. 동일 lint 실행 파일인 `.\node_modules\.bin\eslint.cmd .`는 통과.
  - Vitest: 4 files, 18 tests 통과.
  - DB Vitest: 1 file, 1 test 통과.
  - `pnpm run build`: 통과.
  - 390×844 모바일 viewport 확인: `/children` 모달과 `/teachers` 모달 모두 `documentScrollWidth = 390`, `innerWidth = 390`, 사진 input `92..374`, overflow 없음.
- 남은 문제:
  - Playwright E2E 전체 스위트는 원격 Supabase 상태 초기화 위험 때문에 실행하지 않았다.
  - 기존 `goal.md`에는 이전 작업들의 미실행 E2E 항목이 남아 있어 파일은 삭제하지 않는다.
