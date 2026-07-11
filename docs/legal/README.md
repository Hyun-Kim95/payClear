# payClear 법무 문서 (초안)

| 항목 | 내용 |
|------|------|
| 상태 | **초안** — 법무 검토 전 |
| 구현 | `apps/web/src/pages/LegalTerms.tsx`, `LegalPrivacy.tsx` |
| 메타 | `apps/web/src/legal/config.ts` (`contactEmail` 등 **배포 전 수정**) |

## 공개 URL (Railway web 배포 후)

Play Console·스토어 등록에 아래 형식의 **고정 HTTPS URL**을 사용합니다.

| 문서 | 경로 |
|------|------|
| 개인정보 처리방침 | `https://<web-도메인>/privacy` |
| 이용약관 | `https://<web-도메인>/terms` |

예: `https://web-production-21be0.up.railway.app/privacy`

| 문서 | URL |
|------|-----|
| 개인정보 처리방침 | https://web-production-21be0.up.railway.app/privacy |
| 이용약관 | https://web-production-21be0.up.railway.app/terms |
| 계정 삭제 안내 (Play Console) | https://web-production-21be0.up.railway.app/delete-account |

Play Store 제출 체크리스트: [`docs/release/play-store-checklist.md`](../release/play-store-checklist.md)  
AAB 빌드: [`docs/release/android-aab.md`](../release/android-aab.md)

## 배포 전 체크

1. `apps/web/src/legal/config.ts` — `contactEmail`, 필요 시 `operatorLabel` 수정
2. Railway **web** 서비스 생성 (`rootDirectory`: `apps/web`)
3. 빌드 변수: `VITE_API_BASE=https://api-production-45e07.up.railway.app/api/v1` (실제 API 도메인)
4. Railway **api**에 `WEB_ORIGIN=https://<web-도메인>` 추가 (OAuth·CORS)
5. 로컬 확인: `npm run build && npm run start` → `/privacy`, `/terms` 열림

## 앱 내 링크

- 설정 → 이용약관 / 개인정보 처리방침
- 로그인 화면 하단 동의 문구 링크

앱(Capacitor) 번들에도 동일 경로가 포함되므로, 스토어 정책 URL은 **Railway web 공개 URL**을 우선 사용하는 것을 권장합니다(항상 최신 문서).

## 면책

본 초안은 제품 PRD·구현을 반영한 **작성 보조용**이며 법률 자문을 대체하지 않습니다. 출시 전 전문가 검토를 권장합니다.
