import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_config.dart';

class ApiClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (!options.headers.containsKey('Authorization')) {
          final token = await _storage.read(key: 'accessToken');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        handler.next(options);
      },
      onError: (error, handler) {
        handler.next(error);
      },
    ));
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? queryParameters, String? token}) async {
    final response = await _dio.get(path, queryParameters: queryParameters, options: _authOptions(token));
    return response.data;
  }

  Future<Map<String, dynamic>> post(String path, {dynamic data, String? token}) async {
    final response = await _dio.post(path, data: data, options: _authOptions(token));
    return response.data;
  }

  Future<Map<String, dynamic>> put(String path, {dynamic data, String? token}) async {
    final response = await _dio.put(path, data: data, options: _authOptions(token));
    return response.data;
  }

  Future<Map<String, dynamic>> delete(String path, {dynamic data, String? token}) async {
    final response = await _dio.delete(path, data: data, options: _authOptions(token));
    return response.data;
  }

  /// Downloads a binary response (e.g. report export) as raw bytes.
  /// The stored access token is attached automatically by the interceptor.
  Future<List<int>> downloadBytes(String path, {Map<String, dynamic>? queryParameters}) async {
    final response = await _dio.get<List<int>>(
      path,
      queryParameters: queryParameters,
      options: Options(responseType: ResponseType.bytes),
    );
    return response.data ?? const [];
  }

  Options _authOptions(String? token) {
    if (token == null) return Options();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'accessToken', value: token);
  }

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: 'refreshToken', value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'accessToken');
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
  }
}
