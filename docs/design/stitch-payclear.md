# payClear Stitch 산출물 (2B)

| 항목 | 내용 |
|------|------|
| 단계 | client-project-lifecycle 2B |
| PRD | [payclear-prd-v0.1.md](../requirements/payclear-prd-v0.1.md) v0.2.4 |
| 생성일 | 2026-06-05 |

## 프로젝트

| 필드 | 값 |
|------|-----|
| projectId | `4769319954386668817` |
| title | payClear v0.1 |
| visibility | PRIVATE |

## 디자인 시스템

| 필드 | 값 |
|------|-----|
| assetId | `assets/3437920573632442316` |
| displayName | payClear |
| primary | `#1a56db` |
| fonts | Plus Jakarta Sans |
| roundness | ROUND_EIGHT |

## 생성 화면

| 화면 | screenId | 제목 | device |
|------|----------|------|--------|
| 홈 | `2c9f0b8af391406a939ad8b092d82000` | payClear 홈 화면 | MOBILE |
| 채무 목록 | `a987268dae0447c4a3541d3f8ce6f797` | payClear 부채 내역 화면 | MOBILE |
| 채무 상세 | `6c87db3649504b4b9428c2ccf10369cc` | 채무 상세 내역 | MOBILE |

Stitch 콘솔에서 `projects/4769319954386668817` 로 열어 스크린샷·HTML을 확인한다.

## 제품 반영 (2026-06-05)

Stitch(B) 선택 후 `apps/web/src/styles/tokens.css`에 토큰 이전. 홈·목록·상세는 API 연동 제품 화면으로 구현.

## 미생성 (선택)

- 공유 보기 `/s/:token`
- 로그인·PIN 온보딩
- 설정·알림

디자인 선택 후 본 구현 전 추가 생성 가능.

## 재생성 명령(참고)

MCP `generate_screen_from_text` — `projectId`, `designSystem: assets/3437920573632442316`, `deviceType: MOBILE`.
