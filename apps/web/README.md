# payClear Web (제품)

Stitch(B) 디자인 토큰 기반 PWA 프론트엔드.

## 실행

```bash
# 터미널 1 — API
cd apps/api && npm run dev

# 터미널 2 — Web
cd apps/web && npm run dev
```

1. http://localhost:5173 접속
2. 「데모 계정으로 시작」→ API `dev-token` 연동

## Stitch 토큰

- Primary `#1a56db`
- Font Plus Jakarta Sans + Noto Sans KR
- [stitch-payclear.md](../../docs/design/stitch-payclear.md)

## v0.1 진행 상태

- [x] 홈·목록·상세·상대·설정 (읽기)
- [x] **채무 등록** · **상환** (초과 상환 확인 모달)
- [x] 로딩·오류·빈·폼 검증
- [x] 다크모드
- [ ] 조정·공유
- [ ] PWA manifest·서비스워커
- [ ] SNS OAuth (Google/Kakao) — [ADR-002](../../docs/decisions/ADR-002-sns-auth-local-postgres.md)
