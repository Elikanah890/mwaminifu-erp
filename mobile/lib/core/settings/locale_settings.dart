import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Holds the user's selected UI language.
///
/// Defaults to Kiswahili (the V1 default). The selection persists across
/// restarts and works offline (bundled resources only, no network required).
class LocaleSettings extends ChangeNotifier {
  LocaleSettings._();

  static final LocaleSettings instance = LocaleSettings._();

  static const _storage = FlutterSecureStorage();
  static const _key = 'app_locale';

  static const Locale kiswahili = Locale('sw');
  static const Locale english = Locale('en');

  static const List<Locale> supportedLocales = [kiswahili, english];

  Locale _locale = kiswahili;
  bool _loaded = false;

  Locale get locale => _locale;
  bool get isLoaded => _loaded;

  /// Loads the persisted locale. Never throws — falls back to Kiswahili.
  Future<void> load() async {
    if (_loaded) return;
    try {
      final stored = await _storage.read(key: _key);
      _locale = stored == 'en' ? english : kiswahili;
    } catch (_) {
      _locale = kiswahili;
    }
    _loaded = true;
    notifyListeners();
  }

  /// Persists and applies a new locale. `code` is 'sw' or 'en'.
  Future<void> setLocale(String code) async {
    final next = code == 'en' ? english : kiswahili;
    if (next == _locale) return;
    _locale = next;
    notifyListeners();
    try {
      await _storage.write(key: _key, value: next.languageCode);
    } catch (_) {
      // Best-effort persistence; the in-memory value still applies this session.
    }
  }
}
