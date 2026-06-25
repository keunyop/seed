# Seed Attendance

주일학교 교사가 모바일에서 출석과 큐티를 빠르게 기록하기 위한 패밀리 오픈 MVP 웹앱입니다.

## 현재 상태

- 로그인 없는 패밀리 오픈 MVP로 범위가 변경되었습니다.
- Next.js App Router, TypeScript strict, Tailwind CSS v4, pnpm 기반입니다.
- 데이터는 이번 MVP에서 브라우저 `localStorage`에 저장합니다.
- Supabase Auth, 업무 테이블, RLS는 여러 기기 공유가 필요해질 때 다시 설계합니다.

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

이번 MVP는 `.env.local` 없이 실행됩니다. Supabase 관련 환경변수는 향후 중앙 저장 전환을 위해 예시만 남겨둡니다.
