# Seed Attendance

주일학교 교사가 모바일에서 출석과 큐티를 빠르게 기록하기 위한 패밀리 오픈 MVP 웹앱입니다.

## 현재 상태

- 로그인 없는 패밀리 오픈 MVP로 범위가 변경되었습니다.
- Next.js App Router, TypeScript strict, Tailwind CSS v4, pnpm 기반입니다.
- 데이터는 Supabase 정규화 업무 테이블(`organizations`, `teachers`, `classes`, `children`, `child_parents`, `attendance_sessions`, `attendance_records`)에 저장합니다.
- 앱 상태는 브라우저 `localStorage`에 저장하지 않고 Supabase DB를 기준으로 읽고 씁니다.
- 앱 시작 시 이전 localStorage 저장 키(`seed-family-open-store-v1`)가 남아 있으면 삭제합니다.
- 앱 런타임은 테스트용 기본 샘플 데이터를 초기 화면이나 빈 DB fallback으로 표시하지 않습니다. Supabase 로딩 중에는 로딩 상태를, 데이터가 없으면 빈 상태를 표시합니다.
- 기존 `family_open_app_state` 단일 JSON 테이블은 이관 원본과 백업 용도로 유지합니다.
- 아이 상세 정보와 보호자 연락처, 선택한 사진 Data URL도 Supabase 정규화 테이블에 저장합니다. 아이·선생님 사진은 `사진 찍기`와 `앨범에서 선택`을 분리해 제공하고, 160KB를 넘는 휴대폰 사진은 브라우저에서 자동 축소합니다. 기존 아이의 새 사진은 처리 직후 사진 한 필드만 바로 저장하며 실패하면 모달에서 재시도할 수 있습니다.
- 생년월일을 모르는 아이는 생일 필드를 비워 등록할 수 있으며, 월간 생일자 통계에서는 제외됩니다.
- 통계는 최근 4주 출석자와 최근 4개월 큐티 완료자·생일자를 막대그래프로 보여주고, 2026년 7월~2027년 6월 전체 추이를 라인그래프로 제공합니다. 최근 막대별 아바타/목록 상세와 모든 선생님 메모 통합 목록도 확인할 수 있습니다.
- 현재는 로그인 없는 기본 조직 1개 공개 쓰기 방식이며, 공개 운영 전에는 Supabase Auth 또는 공유 코드 기반 권한을 별도 설계해야 합니다.

## 개발 명령

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm test:e2e:mock
pnpm test:e2e
pnpm build
```

`test:e2e:mock`은 모든 Supabase REST 요청을 브라우저에서 가로채 운영 데이터를 변경하지 않습니다. 원격 Supabase 상태를 초기화하는 `app-shell` E2E는 `E2E_ALLOW_REMOTE_RESET=1`을 명시한 전용 테스트 프로젝트에서만 실행됩니다.

## 환경변수

실행에는 `.env.local`의 Supabase 공개 설정이 필요합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

원격 프로젝트에는 `supabase/migrations/20260626000100_family_open_app_state.sql`, `supabase/migrations/20260626000200_normalized_family_schema.sql`, `supabase/migrations/20260627000100_nullable_child_birth.sql`을 적용해야 합니다. 현재 구현은 로그인 없는 패밀리 오픈을 위해 기본 조직 1개에 대해 publishable key 공개 읽기/쓰기를 허용합니다.
