import 'package:flutter/material.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../app/themes.dart';

/// Shared async-state views so every screen presents consistent
/// loading / error+retry / empty states (and supports pull-to-refresh).
class AsyncStateView {
  AsyncStateView._();

  static Widget loading({String? message}) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: AppTheme.teal),
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(message, style: const TextStyle(color: AppTheme.textSecondary)),
          ],
        ],
      ),
    );
  }

  static Widget error(BuildContext context, String message, {VoidCallback? onRetry}) {
    final l10n = AppLocalizations.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.crimson),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.textSecondary)),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(l10n.commonRetry),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static Widget empty(BuildContext context, String message, {IconData icon = Icons.inbox}) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        Icon(icon, size: 64, color: AppTheme.textSecondary.withValues(alpha: 0.5)),
        const SizedBox(height: 16),
        Center(
          child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.textSecondary)),
        ),
      ],
    );
  }
}
