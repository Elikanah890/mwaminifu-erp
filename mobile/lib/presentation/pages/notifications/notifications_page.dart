import 'package:flutter/material.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/async_states.dart';
import '../../../app/themes.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final api = ApiClient();
  List<dynamic> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await api.get('/notifications');
      if (mounted) {
        setState(() {
          _items = res['data'] as List? ?? [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'error';
          _loading = false;
        });
      }
    }
  }

  Future<void> _markRead(String id) async {
    try {
      await api.put('/notifications/$id/read');
      if (mounted) {
        setState(() {
        final idx = _items.indexWhere((n) => n['id'] == id);
        if (idx >= 0) _items[idx]['isRead'] = true;
      });
      }
    } catch (_) {}
  }

  Future<void> _markAllRead() async {
    try {
      await api.put('/notifications/read-all');
      if (mounted) {
        setState(() {
        for (final n in _items) {
          n['isRead'] = true;
        }
      });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.notificationsTitle),
        actions: [
          if (_items.any((n) => n['isRead'] != true))
            TextButton.icon(
              onPressed: _markAllRead,
              icon: const Icon(Icons.done_all, color: Colors.white, size: 18),
              label: Text(l10n.notificationsMarkAllRead, style: const TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(l10n),
      ),
    );
  }

  Widget _buildBody(AppLocalizations l10n) {
    if (_loading) return AsyncStateView.loading();
    if (_error != null) {
      return AsyncStateView.error(context, l10n.errorGeneric, onRetry: _load);
    }
    if (_items.isEmpty) {
      return AsyncStateView.empty(context, l10n.notificationsNoNotifications, icon: Icons.notifications_none);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _items.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final n = _items[i];
        final read = n['isRead'] == true;
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: (read ? AppTheme.textSecondary : AppTheme.teal).withValues(alpha: 0.12),
            child: Icon(Icons.notifications, color: read ? AppTheme.textSecondary : AppTheme.teal, size: 20),
          ),
          title: Text(n['title'] ?? '', style: TextStyle(
            fontWeight: read ? FontWeight.w400 : FontWeight.w600,
            color: AppTheme.navy,
          )),
          subtitle: Text(n['body'] ?? '', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          trailing: read ? null : const Icon(Icons.circle, color: AppTheme.teal, size: 10),
          onTap: read ? null : () => _markRead(n['id'] as String),
        );
      },
    );
  }
}
