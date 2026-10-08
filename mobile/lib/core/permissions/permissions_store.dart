import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../data/models/models.dart';

/// Persisted auth profile used to rehydrate client-side permission gating
/// after an app restart (and while offline) without requiring a network call.
class AuthProfile {
  final UserModel user;
  final Set<String> permissions;
  final String? shopId;

  const AuthProfile({required this.user, required this.permissions, this.shopId});

  Map<String, dynamic> toJson() => {
        'user': {
          'id': user.id,
          'phone': user.phone,
          'name': user.name,
          'email': user.email,
          'role': user.role,
          'avatarUrl': user.avatarUrl,
        },
        'permissions': permissions.toList(),
        'shopId': shopId,
      };

  factory AuthProfile.fromJson(Map<String, dynamic> json) => AuthProfile(
        user: UserModel.fromJson(json['user'] as Map<String, dynamic>? ?? {}),
        permissions: ((json['permissions'] as List?) ?? const [])
            .map((e) => e.toString())
            .toSet(),
        shopId: json['shopId'] as String?,
      );
}

/// Stores the signed-in user's role, permission set and active shop in
/// `flutter_secure_storage` so employees are correctly gated even after a
/// restart or when the `/users/me` fetch fails (offline).
class PermissionsStore {
  PermissionsStore._();

  static const _storage = FlutterSecureStorage();
  static const _key = 'auth_profile';

  static Future<void> save(AuthProfile profile) async {
    try {
      await _storage.write(key: _key, value: jsonEncode(profile.toJson()));
    } catch (_) {
      // Best-effort persistence; in-memory gating still applies this session.
    }
  }

  static Future<AuthProfile?> read() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw == null) return null;
      return AuthProfile.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  static Future<void> clear() async {
    try {
      await _storage.delete(key: _key);
    } catch (_) {
      // ignore
    }
  }
}
