import 'package:dio/dio.dart';

/// True when the failure looks like a connectivity problem (no server response),
/// as opposed to a business/validation error returned by the API.
bool isOfflineError(Object? error) {
  if (error is DioException) {
    return error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.unknown;
  }
  return false;
}