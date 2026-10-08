import 'package:mwaminifu_app/l10n/app_localizations.dart';
import 'network_utils.dart';

/// Converts a raw API/network failure into a user-friendly, localized message.
/// Never surfaces raw exception strings, stack traces, or HTTP status codes.
String friendlyError(Object? error, AppLocalizations l10n) {
  if (isOfflineError(error)) {
    return l10n.errorNetwork;
  }

  if (error is Map) {
    final err = error['error'];
    if (err is Map) {
      final code = err['code']?.toString();
      final message = err['message']?.toString();
      switch (code) {
        case 'UNAUTHORIZED':
          return l10n.errorUnauthorized;
        case 'FORBIDDEN':
          return l10n.errorForbidden;
        case 'NOT_FOUND':
          return l10n.errorNotFound;
        case 'BUSINESS_RULE_VIOLATION':
        case 'VALIDATION_ERROR':
        case 'CONFLICT':
        case 'RATE_LIMITED':
          if (message != null && message.isNotEmpty) {
            return _localizeBusinessMessage(message, l10n);
          }
          return l10n.errorValidation;
      }
    }
  }

  return l10n.errorGeneric;
}

String _localizeBusinessMessage(String message, AppLocalizations l10n) {
  final m = message.toLowerCase();
  if (m.contains('insufficient stock')) return l10n.errorInsufficientStock;
  if (m.contains('stock cannot be negative')) return l10n.errorStockNegative;
  return message;
}
