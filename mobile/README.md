# Mwaminifu App (Mobile)

Flutter client for the Mwaminifu ERP system. Connects to the Node.js backend API.

## Getting Started

```bash
flutter pub get
flutter run
```

## Configuring the backend URL

The API base URL is read at build time from the `API_BASE_URL` dart-define.
It defaults to `http://localhost:5000/api/v1`.

```bash
# Android emulator (maps to host machine's localhost)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1

# iOS simulator
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1

# Physical device (use your machine's LAN IP)
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:5000/api/v1

# Production (HTTPS)
flutter run --dart-define=API_BASE_URL=https://api.mwaminifu.com/api/v1
```

The same flag applies to `flutter build apk` / `flutter build appbundle`.

## Test credentials

| Role           | Phone        | PIN    |
| -------------- | ------------ | ------ |
| Business Owner | 255712345678 | 123456 |
| Employee       | 255712345691 | 123456 |

OTP for testing is `123456` (when `MOCK_SMS=true` on the backend).
