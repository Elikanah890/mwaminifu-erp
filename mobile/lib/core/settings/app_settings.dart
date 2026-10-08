import 'package:flutter/foundation.dart';
import '../network/api_client.dart';

/// Holds runtime settings fetched from the backend `/config` endpoint.
/// Falls back to bundled defaults when the network is unavailable so the app
/// never blocks startup on a failed config fetch.
class AppSettings {
  static final AppSettings instance = AppSettings._();
  AppSettings._();

  static const Map<String, dynamic> _defaults = {
    'appName': 'Mwaminifu',
    'currency': 'TZS',
    'supportEmail': 'support@mwaminifu.app',
    'supportPhone': '',
    'maintenanceMode': false,
    'otpLifetimeMinutes': 5,
    'syncIntervalSeconds': 30,
  };

  Map<String, dynamic> _data = Map.of(_defaults);
  bool _loaded = false;

  Map<String, dynamic> get data => _data;

  String get appName => _read('appName', 'Mwaminifu') as String;
  String get currency => _read('currency', 'TZS') as String;
  String get supportEmail => _read('supportEmail', 'support@mwaminifu.app') as String;
  String get supportPhone => _read('supportPhone', '') as String;
  bool get maintenanceMode => _read('maintenanceMode', false) as bool;
  int get otpLifetimeMinutes => _read('otpLifetimeMinutes', 5) as int;
  int get syncIntervalSeconds => _read('syncIntervalSeconds', 30) as int;

  bool get isLoaded => _loaded;

  dynamic _read(String key, dynamic fallback) {
    final v = _data[key];
    if (v == null) return fallback;
    if (v is String && v.isEmpty && fallback is String) return fallback;
    return v;
  }

  /// Fetches public config from the backend. Never throws — on failure it keeps
  /// the previous (or default) values so startup/login is never blocked.
  Future<void> fetch() async {
    try {
      final res = await ApiClient().get('/config');
      final data = res['data'] as Map<String, dynamic>?;
      if (data != null) {
        _data = Map.of(_defaults);
        _data.addAll(data);
        _loaded = true;
      }
    } catch (e) {
      debugPrint('AppSettings: config fetch failed, using defaults: $e');
    }
  }

  /// Formats an amount with the configured currency symbol.
  String formatCurrency(num value, {int decimals = 0}) {
    final symbol = currency;
    final v = value.toStringAsFixed(decimals);
    return '$symbol $v';
  }

  /// Formats a support line (email/phone) for display.
  String supportLine() {
    final parts = <String>[];
    if (supportPhone.isNotEmpty) parts.add(supportPhone);
    if (supportEmail.isNotEmpty) parts.add(supportEmail);
    return parts.isEmpty ? 'No support contact configured' : parts.join(' · ');
  }
}
