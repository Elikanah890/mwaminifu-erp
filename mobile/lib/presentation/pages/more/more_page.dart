import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/product/product_bloc.dart';
import '../../blocs/shop/shop_bloc.dart';
import '../../../app/themes.dart';
import '../../../core/network/api_client.dart';
import '../../../core/offline/offline_queue.dart';
import '../../../core/offline/sync_engine.dart';
import '../../../core/settings/app_settings.dart';
import '../../../core/settings/locale_settings.dart';
import '../../../core/permissions/permissions.dart';

class MorePage extends StatelessWidget {
  const MorePage({super.key});

  void _toast(BuildContext context, String message, {Color? color}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: color ?? AppTheme.teal),
    );
  }

  Future<void> _showSyncStatus(BuildContext context) async {
    final l10n = AppLocalizations.of(context);
    final api = ApiClient();
    final shopId = context.read<ShopBloc>().state is ShopLoaded
        ? (context.read<ShopBloc>().state as ShopLoaded).activeShopId
        : null;
    if (shopId == null) {
      _toast(context, l10n.moreNoShop, color: AppTheme.crimson);
      return;
    }
    final pendingCount = await OfflineQueue.instance.count();
    final engine = SyncEngine(api);
    try {
      final res = await api.get('/sync/status', queryParameters: {'shopId': shopId});
      final data = res['data'] ?? {};
      final localLastPull = await engine.lastSyncTimestamp(shopId);
      String fmt(dynamic ts) {
        final dt = DateTime.tryParse((ts ?? '').toString());
        return dt == null ? '—' : '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
      }

      if (!context.mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l10n.moreSyncStatus),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _statusRow(l10n.morePendingOffline, '$pendingCount'),
              _statusRow(l10n.moreLastPull, fmt(localLastPull ?? data['lastPullTimestamp'])),
              _statusRow(l10n.moreLastPush, fmt(data['lastPushTimestamp'])),
              const Divider(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.teal),
                  onPressed: () => _runSync(context, ctx, api, shopId),
                  icon: const Icon(Icons.sync),
                  label: Text(l10n.moreSyncNow),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.commonClose)),
          ],
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      _toast(context, l10n.moreCouldNotReachSync, color: AppTheme.crimson);
    }
  }

  Future<void> _runSync(BuildContext pageCtx, BuildContext dialogCtx, ApiClient api, String shopId) async {
    final l10n = AppLocalizations.of(pageCtx);
    final engine = SyncEngine(api);
    final result = await engine.sync(shopId: shopId);
    final pending = await OfflineQueue.instance.count();
    if (!dialogCtx.mounted) return;

    final message = result['error'] != null
        ? l10n.moreSyncFailed(pending)
        : l10n.moreSyncedCount(result['pushed'] as int? ?? 0, result['failed'] as int? ?? 0);
    final color = result['error'] != null ? AppTheme.crimson : AppTheme.teal;

    Navigator.of(dialogCtx, rootNavigator: true).pop();
    ScaffoldMessenger.of(pageCtx).showSnackBar(
      SnackBar(content: Text(message, textAlign: TextAlign.center), backgroundColor: color),
    );
    if (pageCtx.mounted && result['error'] == null) {
      pageCtx.read<ProductBloc>().add(LoadProducts(shopId));
    }
    if (pageCtx.mounted) _showSyncStatus(pageCtx);
  }

  Widget _statusRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textSecondary)),
          const SizedBox(width: 12),
          Flexible(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = context.read<AuthBloc>();
    final user = auth.currentUser;
    final isOwner = auth.isOwner;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.moreTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (isOwner) ...[
            _buildSection(
              l10n.moreBusiness,
              [
                _MoreItem(Icons.people, l10n.moreEmployees, () => context.go('/employees')),
                _MoreItem(Icons.store, l10n.moreManageShops, () => context.go('/shops')),
                _MoreItem(Icons.receipt, l10n.moreReceiptSettings, () => context.go('/receipt-settings')),
                _MoreItem(Icons.backup, l10n.moreBackup, () => _backupShop(context)),
              ],
            ),
            const SizedBox(height: 16),
          ],
          _buildSection(
            l10n.moreFinancial,
            [
              if (auth.hasPermission(Permission.expensesWrite))
                _MoreItem(Icons.money_off, l10n.moreExpenses, () => context.go('/expenses')),
              if (auth.hasPermission(Permission.creditWrite))
                _MoreItem(Icons.people_outline, l10n.moreCustomersCredit, () => context.go('/customers')),
              if (isOwner || auth.hasPermission(Permission.loansRead))
                _MoreItem(Icons.account_balance, l10n.moreLoans, () => context.go('/loans')),
            ],
          ),
          const SizedBox(height: 16),
          _buildSection(
            l10n.moreSystem,
            [
              _MoreItem(Icons.notifications, l10n.moreNotifications, () => context.go('/notifications')),
              _MoreItem(Icons.sync, l10n.moreSyncStatus, () => _showSyncStatus(context)),
              if (isOwner || auth.isEmployee)
                _MoreItem(Icons.support_agent, l10n.moreSupport, () => context.go('/support')),
              _MoreItem(Icons.language, l10n.moreLanguage, () => _showLanguageDialog(context)),
            ],
          ),
          const SizedBox(height: 16),
          _buildSection(
            l10n.moreAccount,
            [
              _MoreItem(Icons.person, l10n.profileTitle, () => context.go('/profile')),
              _MoreItem(Icons.lock, l10n.moreChangePin, () => context.go('/change-pin')),
              _MoreItem(Icons.info_outline, l10n.moreAbout, () {
                showAboutDialog(
                  context: context,
                  applicationName: AppSettings.instance.appName,
                  applicationVersion: 'v1.0.0',
                  applicationLegalese: 'Business Management Platform\n\nSupport: ${AppSettings.instance.supportLine()}',
                );
              }),
              _MoreItem(Icons.logout, l10n.moreLogout, () {
                context.read<AuthBloc>().add(Logout());
                context.go('/login');
              }, color: AppTheme.crimson),
            ],
          ),
          const SizedBox(height: 32),
          Center(
            child: Column(
              children: [
                Text('${AppSettings.instance.appName} v1.0.0', style: TextStyle(color: AppTheme.textSecondary.withValues(alpha: 0.5), fontSize: 12)),
                const SizedBox(height: 4),
                Text(l10n.moreLoggedInAs(user?.name ?? 'User'),
                  style: TextStyle(color: AppTheme.textSecondary.withValues(alpha: 0.5), fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showLanguageDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    showDialog(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: Text(l10n.moreLanguage),
        children: [
          SimpleDialogOption(
            onPressed: () {
              LocaleSettings.instance.setLocale('sw');
              Navigator.pop(ctx);
            },
            child: Row(
              children: [
                Icon(LocaleSettings.instance.locale.languageCode == 'sw'
                    ? Icons.radio_button_checked : Icons.radio_button_off, color: AppTheme.teal),
                const SizedBox(width: 12),
                Text(l10n.languageKiswahili),
              ],
            ),
          ),
          SimpleDialogOption(
            onPressed: () {
              LocaleSettings.instance.setLocale('en');
              Navigator.pop(ctx);
            },
            child: Row(
              children: [
                Icon(LocaleSettings.instance.locale.languageCode == 'en'
                    ? Icons.radio_button_checked : Icons.radio_button_off, color: AppTheme.teal),
                const SizedBox(width: 12),
                Text(l10n.languageEnglish),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _backupShop(BuildContext context) async {
    final shopState = context.read<ShopBloc>().state;
    final shopId = shopState is ShopLoaded ? shopState.activeShopId : null;
    if (shopId == null) return;
    final l10n = AppLocalizations.of(context);
    try {
      final responses = await Future.wait([
        ApiClient().get('/shops/$shopId'),
        ApiClient().get('/shops/$shopId/settings'),
        ApiClient().get('/shops/$shopId/products', queryParameters: {'limit': '1000'}),
        ApiClient().get('/shops/$shopId/customers', queryParameters: {'limit': '1000'}),
        ApiClient().get('/shops/$shopId/expenses', queryParameters: {'limit': '1000'}),
        ApiClient().get('/shops/$shopId/loans', queryParameters: {'limit': '1000'}),
        ApiClient().get('/shops/$shopId/employees'),
      ]);
      final backup = <String, dynamic>{
        'formatVersion': 1,
        'exportedAt': DateTime.now().toUtc().toIso8601String(),
        'shop': responses[0]['data'],
        'settings': responses[1]['data'],
        'products': responses[2]['data'],
        'customers': responses[3]['data'],
        'expenses': responses[4]['data'],
        'loans': responses[5]['data'],
        'employees': responses[6]['data'],
      };
      final directory = await getTemporaryDirectory();
      final file = File('${directory.path}/mwaminifu_backup_${DateTime.now().millisecondsSinceEpoch}.json');
      await file.writeAsString(const JsonEncoder.withIndent('  ').convert(backup));
      if (!context.mounted) return;
      await Share.shareXFiles([XFile(file.path)], text: l10n.moreBackup);
    } catch (error) {
      if (context.mounted) _toast(context, error.toString(), color: AppTheme.crimson);
    }
  }

  Widget _buildSection(String title, List<_MoreItem> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(title, style: const TextStyle(
            fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary,
            letterSpacing: 0.5,
          )),
        ),
        Material(
          color: Colors.white,
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: items.map((item) {
              final isLast = items.last == item;
              return Column(
                children: [
                  ListTile(
                    leading: Icon(item.icon, color: item.color ?? AppTheme.navy, size: 22),
                    title: Text(item.label, style: TextStyle(
                      color: item.color ?? AppTheme.textPrimary,
                      fontSize: 14,
                    )),
                    trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary, size: 20),
                    onTap: item.onTap,
                    dense: true,
                  ),
                  if (!isLast) const Divider(height: 1, indent: 56),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _MoreItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  _MoreItem(this.icon, this.label, this.onTap, {this.color});
}
