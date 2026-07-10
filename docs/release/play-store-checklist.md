# Play Store 제출 체크리스트 (payClear)

**상태:** 준비 중 (debug APK 테스트 가능 · 스토어 제출 전 항목 남음)  
**패키지:** `com.khyun.payclear`  
**운영 API:** `https://api-production-45e07.up.railway.app/api/v1`  
**운영 웹(약관 URL):** `https://web-production-21be0.up.railway.app`

---

## 0) 이번 라운드 완료 여부

| 단계 | 내용 | 상태 |
|------|------|------|
| 1 | 코드 커밋·푸시 + API/web 배포 | 완료 (`c8b8cab`, api/web SUCCESS) |
| 2 | Release AAB 서명·빌드 절차 | [android-aab.md](./android-aab.md) |
| 3 | 본 체크리스트로 Console 제출 | 아래 항목 |

---

## 1) 계정·콘솔

- [ ] [Google Play Console](https://play.google.com/console) 개인/조직 개발자 등록 완료
- [ ] 등록비·신원 확인 완료
- [ ] 앱 생성: 앱 이름 `payClear`, 패키지 `com.khyun.payclear` (변경 불가에 가깝므로 확정)

---

## 2) 빌드 산출물

- [ ] 업로드 키스토어 생성·백업 (분실 시 업데이트 불가에 가깝음)
- [ ] `apps/web/android/keystore.properties` 로컬 설정 (커밋 금지)
- [ ] `npm run build:android` 후 `bundleRelease`로 **AAB** 생성 — [android-aab.md](./android-aab.md)
- [ ] Play Console → 프로덕션/내부 테스트에 AAB 업로드
- [ ] `versionCode` / `versionName` 증가 규칙 확정 (현재 `1` / `1.0`)

---

## 3) 정책 URL (필수)

Play Console·스토어에 **HTTPS 고정 URL**을 넣습니다. (앱 번들 경로보다 웹 공개 URL 권장)

| 문서 | URL |
|------|-----|
| 개인정보 처리방침 | https://web-production-21be0.up.railway.app/privacy |
| 이용약관 | https://web-production-21be0.up.railway.app/terms |

- [ ] 위 URL이 브라우저에서 열리는지 확인
- [ ] 제출 전 「법무 검토 전」 표기 제거 여부 결정 (`LegalLayout.tsx`)
- [ ] Railway **api** `WEB_ORIGIN` = `https://web-production-21be0.up.railway.app` (OAuth 웹 콜백·CORS)

---

## 4) 스토어 등록 정보

- [ ] 짧은 설명 / 긴 설명
- [ ] 앱 아이콘 (512×512)
- [ ] 기능 그래픽(선택) · 휴대폰 스크린샷 최소 2장
- [ ] 카테고리 (예: 금융/생산성 — 실제 심사 기준에 맞게 선택)
- [ ] 연락 이메일 (`LEGAL_META.contactEmail`과 일치 권장)

---

## 5) 데이터 안전(Data safety) · 콘텐츠

앱이 수집·공유하는 항목을 Console 양식에 맞게 기입합니다. (제품 기준 초안)

| 데이터 | 수집 | 비고 |
|--------|------|------|
| 이메일 | 예 | OAuth·알림 |
| 사용자 ID | 예 | 내부 UUID |
| 앱 활동/기타 | 예 | 채무·상대 등 이용자 입력 |
| 기기·푸시 토큰 | 예 | FCM/웹 푸시(설정 시) |

- [ ] Data safety 양식 작성
- [ ] 콘텐츠 등급 설문
- [ ] 대상 연령·광고 여부(현재 기본: 광고 없음 전제) 확인
- [ ] 민감 권한 설명: 알림, 생체(선택)

---

## 6) OAuth · 딥링크

- [ ] Google Cloud OAuth: 운영 redirect  
  `https://api-production-45e07.up.railway.app/api/v1/auth/google/callback`
- [ ] Kakao: 동일 패턴 `/auth/kakao/callback`
- [ ] 앱 로그인: `payclear://auth/callback` 딥링크 동작 (실기기)
- [ ] (권장) Google Play App Signing 사용 시 SHA-1을 Firebase/Google에 등록

---

## 7) 출시 전 스모크 (실기기 · release 또는 내부 테스트 트랙)

- [ ] 구글/카카오 로그인
- [ ] 홈·채무 생성·상환
- [ ] 공유 링크 생성·수신자 조회·만료 옵션(7/30/90/180)
- [ ] 설정 → 알림 / 잠금·PIN
- [ ] 회원 탈퇴 요청·재로그인 취소
- [ ] 이용약관·개인정보 → 뒤로가기
- [ ] 오프라인 시 안내(해당 시)

---

## 8) 제출 트랙 권장 순서

1. **내부 테스트** (본인 계정) → AAB 검증
2. **비공개/공개 테스트** (선택)
3. **프로덕션** 심사 제출

---

## 관련 문서

- [android-aab.md](./android-aab.md) — 키스토어·AAB 빌드
- [docs/legal/README.md](../legal/README.md) — 법무 URL
- [apps/web/README.md](../../apps/web/README.md) — Capacitor·FCM
