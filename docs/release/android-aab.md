# Android Release AAB (Play Store 업로드용)

debug APK는 내부 테스트용입니다. Play Console에는 **서명된 AAB**를 올립니다.

## 사전 조건

- JDK 17+, Android SDK, `apps/web/.env.production`에 `VITE_API_BASE` 설정
- 패키지명: `com.payclear.app`

## 1) 업로드 키스토어 생성 (최초 1회)

프로젝트 밖 안전한 경로에 보관하세요. **Git에 커밋하지 마세요.**

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore payclear-upload.keystore \
  -alias payclear \
  -keyalg RSA -keysize 2048 -validity 10000
```

비밀번호·alias·파일을 비밀번호 관리자에 백업합니다. 분실 시 앱 업데이트에 큰 장애가 납니다.

## 2) `keystore.properties` (로컬만)

`apps/web/android/keystore.properties` 생성 (이미 `.gitignore` 대상):

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=payclear
storeFile=C:/path/to/payclear-upload.keystore
```

Windows 경로는 `/` 또는 이스케이프된 `\\` 사용.

## 3) Gradle 서명

`apps/web/android/app/build.gradle`은 `keystore.properties`가 있을 때만 release 서명을 적용합니다.  
파일이 없으면 debug와 같이 서명되지 않은/기본 설정으로 release 빌드가 실패하거나 Play 업로드에 부적합할 수 있으니, 스토어용은 반드시 properties를 둡니다.

## 4) 빌드

```bash
cd apps/web
npm run build:android
npm run android:bundle
```

산출물:

```
apps/web/android/app/build/outputs/bundle/release/app-release.aab
```

복사 예:

```bash
# PowerShell
Copy-Item apps\web\android\app\build\outputs\bundle\release\app-release.aab releases\payclear-v0.1-release.aab
```

## 5) 버전 올리기

다음 스토어 업로드 전 `apps/web/android/app/build.gradle`의 `defaultConfig`에서:

- `versionCode` — 정수, **매번 증가** (예: 1 → 2)
- `versionName` — 표시용 (예: `1.0` → `1.0.1`)

## 6) Play Console

1. 앱 → 테스트 → 내부 테스트(권장) → 새 버전 만들기
2. AAB 업로드
3. [play-store-checklist.md](./play-store-checklist.md) 나머지 항목 진행

## 보안

| 파일 | Git |
|------|-----|
| `*.keystore` / `*.jks` | 커밋 금지 |
| `keystore.properties` | 커밋 금지 |
| `google-services.json` | 커밋 금지(기존) |
| AAB/APK | `android/.gitignore`에 의해 제외 |
