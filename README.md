# Seed Attendance

주일학교 교사가 모바일에서 출석과 큐티를 빠르게 기록하기 위한 패밀리 오픈 MVP 웹앱입니다.

## 현재 상태

- 로그인 없는 패밀리 오픈 MVP로 범위가 변경되었습니다.
- Next.js App Router, TypeScript strict, Tailwind CSS v4, pnpm 기반입니다.
- 데이터는 Supabase `family_open_app_state` 단일 JSON 행에 저장합니다.
- 브라우저 `localStorage`는 원격 저장 실패 시 임시 백업으로만 사용합니다.
- 아이 상세 정보와 보호자 연락처, 선택한 사진 Data URL도 같은 Supabase JSON 상태에 저장합니다.
- Supabase Auth, 정규화된 업무 테이블, 조직/반 단위 RLS는 공개 배포 전 다시 설계합니다.

## 개발 명령

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm test:e2e
pnpm build
```

## 환경변수

실행에는 `.env.local`의 Supabase 공개 설정이 필요합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

원격 프로젝트에는 `supabase/migrations/20260626000100_family_open_app_state.sql`을 적용해야 합니다. 현재 구현은 로그인 없는 패밀리 오픈을 위해 publishable key로 공개 읽기/쓰기를 허용합니다.
