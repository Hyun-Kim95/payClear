# payClear 2A 자체 목업

PRD v0.2.4 · 화면 스펙 v0.1.1 기준 **정적 프로토타입**(API 없음).

## 실행

```bash
cd mock-internal
npm install
npm run dev
```

브라우저: `http://localhost:5173`

## 목업 플로우

1. `/login` — 「이메일로 계속」→ PIN 설정
2. `/onboarding/pin` — 4자리 이상 입력 후 홈
3. `/` 홈 · `/debts` 목록 · `/debts/d1` 상세
4. 공유: `/s/demo` · PIN 필요: `/s/demo-pin` (PIN `1234`) · 만료: `/s/expired`

## 포함 상태

- 연체(d1), 합의 종료(d3), 완료(d4), 초과 상환(d5)
- 라이트/다크 토글(헤더)
- 필터·검색(목록)

## 범위 밖

- 실제 API·인증
- 상환/조정/공유 폼 제출
- PWA manifest·서비스워커

비교: [docs/design/mock-comparison-v0.1.md](../docs/design/mock-comparison-v0.1.md)
