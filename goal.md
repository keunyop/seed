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
