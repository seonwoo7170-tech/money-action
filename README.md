# 머니액션 / MoneyAction

AI가 사용자의 경험·기술·시간·시장 정보를 분석해 90일 수익계획을 만들고, 오늘 실행할 행동을 하나씩 보여주는 글로벌 안드로이드 앱입니다.

## v0.1.1 Global Beta

- 한국어 / English / 日本語 / Español / Português (Brasil)
- 국가·시장별 통화 및 수익모델 힌트
- AI 맞춤 수익모델 3개 추천
- 7일 행동계획 + 90일 이정표
- 오늘의 액션, 완료율, 수익 기록
- Cloudflare Workers + D1 + Gemini 백엔드 구조
- GitHub Actions 안드로이드 Debug APK 자동 빌드

## 로컬 실행

```bash
npm install
npm run dev
```

## Android

```bash
npm run build
npm run cap:sync
cd android
./gradlew assembleDebug
```

## Backend

`backend/` 폴더의 Cloudflare Worker를 사용합니다. Gemini 키는 앱 코드가 아니라 Worker secret으로 관리합니다.
