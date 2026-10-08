import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class AppColors {
  static const Color navy = Color(0xFF0A1E3F);
  static const Color navyLight = Color(0xFFE8EDF5);
  static const Color teal = Color(0xFF0D9488);
  static const Color gold = Color(0xFFD4AF37);
  static const Color white = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFF8F9FA);
  static const Color crimson = Color(0xFFE74C3C);
  static const Color textPrimary = Color(0xFF1A2A3A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color border = Color(0xFFE2E8F0);
}

class AppConfig {
  static const String _definedBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// Backend API base URL.
  ///
  /// Override at build/run time with:
  ///   flutter run --dart-define=API_BASE_URL=http://`<host>`:5000/api/v1
  ///
  /// Defaults (Android):
  ///   http://127.0.0.1:5000/api/v1 via `adb reverse tcp:5000 tcp:5000`.
  ///   This reaches the host backend over USB on BOTH physical devices and
  ///   emulators. (The emulator-only alias 10.0.2.2 does NOT work on physical
  ///   devices and yields "Network is unreachable".)
  ///
  /// Alternatives (pass --dart-define to override):
  ///   - Android emulator without adb reverse : http://10.0.2.2:5000/api/v1
  ///   - iOS simulator                         : http://localhost:5000/api/v1
  ///   - Physical device on same Wi-Fi         : http://`<host-LAN-IP>`:5000/api/v1
  static String get apiBaseUrl {
    if (_definedBaseUrl.isNotEmpty) return _definedBaseUrl;
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://127.0.0.1:5000/api/v1';
    }
    return 'http://localhost:5000/api/v1';
  }

  static const String appName = 'Mwaminifu';
  static const String appVersion = '1.0.0';
}
