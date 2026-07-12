# Goal

## 작업
- 한 문장으로 설명: 출석 화면의 반 선택과 iPhone 사진 촬영 흐름을 개선하고, 통계 화면을 주별·월별 막대그래프와 아바타 상세 명단·통합 메모 중심으로 개편한다.
- 사용자에게 주는 가치: 교사가 현재 작업 중인 반을 즉시 확인하고 iPhone에서 바로 사진을 찍을 수 있으며, 출석·큐티·생일 추이와 선생님 메모를 모바일에서 빠르게 파악할 수 있다.

## 범위
### 포함
- 출석 반 선택 select 강조와 현재 선택 반 배지
- 전체 반 선택 시 메모 작성·목록 섹션 전체 숨김
- 반 전환 시 작성 중 메모가 다른 반으로 따라가지 않도록 draft 범위 보정
- 아이·선생님 사진 입력에 `사진 찍기`(후면 카메라)와 `앨범에서 선택` 경로 제공
- MIME이 비어 있는 모바일 이미지와 HEIC/HEIF를 안전하게 디코딩·JPEG 변환하도록 사진 helper 보강
- 최근 8주 출석자 수 막대그래프(0명 주 포함)와 막대별 출석자 상세
- 현재 연도 1~12월 큐티 완료 아동 수 막대그래프와 막대별 완료자 상세
- 1~12월 생일자 수 막대그래프와 막대별 생일자 상세
- 통계 상세 모달의 기본 아바타 grid와 목록 보기 토글, 명단 복사
- 통계 상단의 주간 기준일·생일/큐티 월 필터 제거
- 통계 화면의 전체 선생님 메모 최신순 통합 목록과 비밀 메모 가림
- 전체 store 저장이 동시 작성된 메모를 전량 삭제하지 않도록 ID 기준 보존 저장
- 관련 단위·mock E2E·문서 갱신

### 제외
- Supabase Auth/RLS 또는 서버 권한 경계 도입
- 운영 DB migration과 운영 데이터 직접 변경
- 과거 시점의 반 소속 snapshot을 새로 저장하는 스키마 변경
- 비활성 아이의 과거 기록을 통계에 다시 포함하는 정책 변경
- 구형 iOS용 외부 HEIC 디코더 의존성 추가
- 운영 Supabase를 초기화하는 전체 `app-shell.spec.ts` 실행

## 현재 상태
- 관련 화면/경로: `/attendance`, `/reports`, 아이 상세 모달, `/teachers` 선생님 상세 모달
- 관련 테이블/마이그레이션: `attendance_sessions`, `attendance_records`, `attendance_memos`, `children`, `teachers`; 새 migration 불필요
- 관련 테스트: `tests/unit/family-stats.test.ts`, `tests/unit/photo-data-url.test.ts`, `tests/unit/attendance-draft.test.ts`, `tests/unit/supabase-store.test.ts`, report/photo component tests, `tests/e2e/attendance-mock.spec.ts`, `tests/e2e/reports-mock.spec.ts`

## 가정과 결정 기록
- [2026-07-11] 주간 그래프는 현재 예배 주를 포함한 최근 8개 일요일을 표시하고 기록이 없는 주도 0명으로 표시한다 / 필터 없이도 추이를 비교할 수 있고 빈 주를 숨겨 오해시키지 않기 위함 / 사용자가 다른 기간을 원하면 기간 상수와 라벨을 변경한다.
- [2026-07-11] 월별 그래프는 현재 연도 1~12월을 표시한다 / 필터를 없애면서도 기준 연도를 명확히 유지하기 위함 / rolling 12개월 요구가 있으면 bucket 생성 기준을 바꾼다.
- [2026-07-11] 큐티 막대 값은 해당 월에 한 번 이상 완료한 활성 아동의 중복 제거 인원이며, 상세에는 아동별 완료 횟수를 표시한다 / “완료자” 요청과 기존 참여자·완료 횟수 지표를 함께 보존하기 위함.
- [2026-07-11] 통계와 상세 명단은 기존 정책대로 활성 아이만 집계하고 현재 반 이름을 표시한다 / 과거 반 snapshot이 현 스키마에 없고 비활성 아이 제외가 기존 테스트 기준이기 때문.
- [2026-07-11] 통합 메모는 전체 이력을 최신순 5개씩 표시하며 작성자/관리자 외 비밀 본문은 가린다 / 기존 메모를 누락하지 않고 출석 화면과 같은 UI 규칙을 유지하기 위함.
- [2026-07-11] 비밀 메모의 실제 서버 보안은 이번 작업에서 강화하지 않는다 / 현재 공개 anon DB와 localStorage 로그인 구조의 인증 방식 변경은 별도 제품 결정·migration이 필요한 범위이기 때문.
- [2026-07-11] iPhone 카메라는 후면 카메라 `capture="environment"` 경로와 앨범 경로를 분리하고, 외부 HEIC 라이브러리는 추가하지 않는다 / 새 서비스·의존성 없이 최신 iPhone Safari의 native 변환·디코딩을 활용하기 위함.

## 완료 조건
- [x] 출석 화면에서 현재 선택 반이 select와 별도 텍스트 배지로 명확히 보인다. (WebKit mock E2E)
- [x] 전체 반을 선택하면 하단 메모 작성·목록이 렌더링되지 않고, 반 전환 draft가 섞이지 않는다. (WebKit mock E2E·복수 반 draft 단위 테스트)
- [x] 아이와 선생님 사진에서 iPhone용 촬영과 앨범 선택 경로가 각각 제공되고 처리 오류가 안내된다. (picker DOM·photo helper 단위 테스트)
- [x] 주별 출석, 월별 큐티 완료자, 월별 생일이 클릭 가능한 막대그래프로 표시된다. (집계·bar component 단위 테스트)
- [x] 막대를 누르면 해당 출석자/완료자/생일자의 아바타 grid가 열리고 목록 보기로 전환할 수 있다. (modal DOM 단위 테스트)
- [ ] 통계의 기준일·월 필터가 제거되고 로딩·빈 상태·오류 상태가 처리된다. (구현·정적 검사는 완료, reports mock E2E 미실행)
- [x] 모든 선생님 메모가 최신순으로 통합 표시되고 비밀 메모 내용은 기존 권한 규칙대로 가려진다. (helper 단위 테스트·UI 구현)
- [x] 관리 화면 전체 저장이 store에 없는 최신 메모를 삭제하지 않는다. (Supabase client mock 단위 테스트)
- [ ] 모바일 기준 화면에서 가로 스크롤 없이 사용할 수 있고 주요 조작 대상이 충분한 터치 영역을 가진다.
- [ ] 관련 단위·DB·안전한 mock E2E 테스트와 정적 검사·production build가 통과한다. (reports와 최종 attendance mock E2E 미실행)
- [x] `docs/MVP_DESIGN_SPEC.md`와 `docs/PROGRESS.md`가 실제 동작과 일치한다.

## 테스트 계획
- 정적 검사: `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`
- 단위 테스트: 주/월 bucket, present-only 상세, QT 중복 제거·횟수, 생일 12개월, 통합 메모 정렬, MIME 미상 사진, 메모 보존 upsert
- 데이터베이스/RLS 테스트: `pnpm run test:db` (migration 추가 없음과 기존 기준 회귀 확인)
- E2E 테스트: 운영 DB를 쓰지 않는 REST mock으로 전체 반 메모 미표시, 반 강조, 그래프 클릭, 아바타 grid/목록 토글, 통합 메모 가림, photo input의 capture 경로, WebKit 모바일 검증
- 수동 확인 화면 크기: 390×844 WebKit/Chromium, 1280px Chromium; 실제 iPhone Safari 촬영은 배포 후 사용자 확인 필요

## 위험과 되돌리기
- 위험: 실제 iPhone Safari/홈 화면 앱의 카메라 동작은 데스크톱 WebKit 에뮬레이션으로 완전히 재현할 수 없다.
- 위험: HEIC 웹 디코딩이 없는 구형 iOS에서는 앨범 HEIC 처리에 실패할 수 있다.
- 위험: 비밀 메모 원문은 현재 공개 Supabase 응답에 포함되므로 UI 가림이 실제 보안 경계는 아니다.
- 위험: 현재 데이터 모델은 출석 당시 반 snapshot을 저장하지 않아 과거 상세에 현재 반을 표시한다.
- 롤백 방법: UI/helper 변경을 되돌리고 기존 `StatCard` 및 file input 흐름으로 복원한다. DB migration과 운영 데이터 변경이 없어 데이터 롤백은 필요 없다.

## 검증 결과
- 실행한 명령: `pnpm run typecheck`; `.\node_modules\.bin\eslint.cmd .`; `.\node_modules\.bin\vitest.cmd run`; `.\node_modules\.bin\vitest.cmd run --config vitest.db.config.ts`; `pnpm run build`; `.\node_modules\.bin\playwright.cmd test tests/e2e/attendance-mock.spec.ts --project=webkit-mobile`; `git diff --check`
- 결과: typecheck/lint/build/diff 통과, 단위 8 files 43 tests 통과, DB 1 test 통과. attendance WebKit REST mock E2E는 반 강조·전체 반 메모 숨김 버전 1 test 통과
- 남은 문제: `tests/e2e/reports-mock.spec.ts`와 복수 반 draft assertion을 추가한 최종 `tests/e2e/attendance-mock.spec.ts`는 sandbox dev server 권한 재요청이 사용량 한도로 거절되어 최종 상태 미실행. 실제 iPhone Safari의 아이·선생님 촬영→미리보기→저장→새로고침도 배포 후 사용자 확인 필요
