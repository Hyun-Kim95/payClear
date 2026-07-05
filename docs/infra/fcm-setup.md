# FCM(안드로이드 푸시) 설정 가이드

앱의 "Push 알림 등록"은 Firebase Cloud Messaging(FCM)을 사용한다.
`google-services.json` 미배치 상태에서 네이티브 푸시 등록을 호출하면 앱이 크래시하므로,
아래 설정을 완료하기 전에는 `VITE_FCM_ENABLED`를 켜지 않는다(기본 false → 앱은 "준비 중" 안내만 표시).

## 1. Firebase 콘솔 (HUMAN)
1. https://console.firebase.google.com → 프로젝트 생성(또는 기존 선택).
2. Android 앱 추가:
   - 패키지명: `com.payclear.app` (반드시 일치)
   - 앱 닉네임/SHA-1은 선택(푸시만 쓰면 SHA-1 불필요).
3. `google-services.json` 다운로드.

## 2. 클라이언트 배치 (앱 빌드)
1. 받은 파일을 다음 경로에 둔다:
   - `apps/web/android/app/google-services.json`
   - 이 파일이 있으면 `apps/web/android/app/build.gradle`이 google-services 플러그인을 자동 적용한다.
2. **재빌드** (`google-services.json`이 있으면 `VITE_FCM_ENABLED=true`가 자동 주입됨):
   - `cd apps/web && npm run cap:sync`
   - `cd android && ./gradlew assembleDebug`
3. 수동으로 env를 쓸 때만 `apps/web/.env.production`에 `VITE_FCM_ENABLED=true` 추가.

> `VITE_FCM_ENABLED`는 **빌드 타임** 변수다. json 배치·env 변경 후 **반드시** `cap:sync`+APK 재빌드해야 "준비 중"이 사라진다.

> 보안: `google-services.json`은 커밋하지 않는다(`.gitignore` 확인). API 키가 포함된다.

## 3. 서버(크론) 발송 자격증명 — Railway 환경변수 (HUMAN)
서버가 예약 알림을 FCM으로 보내려면 서비스 계정 자격증명이 필요하다.
Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성(JSON) 후 아래 중 하나를 주입:

- `FIREBASE_SERVICE_ACCOUNT` = (받은 JSON 전체 문자열)

또는 분리해서:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (줄바꿈은 `\n` 리터럴로 넣어도 서버가 복원함)

코드는 이미 [`apps/api/src/notify/send.ts`](../../apps/api/src/notify/send.ts)에 구현되어 있어 환경변수만 채우면 된다.

## 4. 검증
- 앱에서 설정 → 알림 → "Push 알림 등록" → 권한 허용 → "FCM 푸시가 등록되었습니다." 표시, 크래시 없음.
- 서버: `npm run notify:cron`(또는 크론)으로 예정 알림 발송 시 `sent_fcm` 증가 확인.

## 5. 운영 크론 (Railway)
- API 서버는 `ALLOW_DEV_TOKEN=false`(운영)이면 **매일 09:00 KST**에 `runDueReminders`를 자동 실행한다.
- `FIREBASE_*` 미설정 시 FCM은 skip되므로, Android 푸시를 받으려면 §3 자격증명을 Railway에 주입한다.
- 오늘 알림을 놓친 경우: Railway에 `NOTIFY_CRON_SECRET` 설정 후  
  `POST /api/v1/internal/notify/run` + 헤더 `X-Notify-Cron-Secret: <secret>` 으로 수동 발송 가능.
