import 'package:flutter/material.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/app_error.dart';
import '../../../core/widgets/async_states.dart';
import '../../../app/themes.dart';

/// Business Owner support center: list, create and reply to support tickets.
/// Backed by the `/owner/support/*` endpoints.
class SupportPage extends StatefulWidget {
  const SupportPage({super.key});

  @override
  State<SupportPage> createState() => _SupportPageState();
}

class _SupportPageState extends State<SupportPage> {
  final api = ApiClient();
  List<dynamic> _tickets = [];
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
      final res = await api.get('/owner/support');
      if (mounted) {
        setState(() {
          _tickets = res['data'] as List? ?? [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = friendlyError(e, AppLocalizations.of(context));
          _loading = false;
        });
      }
    }
  }

  void _openCreate() {
    final l10n = AppLocalizations.of(context);
    final subjectCtrl = TextEditingController();
    final messageCtrl = TextEditingController();
    String priority = 'MEDIUM';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(l10n.supportNewTicket, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 16),
            TextField(controller: subjectCtrl, decoration: InputDecoration(labelText: '${l10n.supportSubject} *'), autofocus: true),
            const SizedBox(height: 12),
            TextField(
              controller: messageCtrl,
              decoration: InputDecoration(labelText: '${l10n.supportMessage} *'),
              maxLines: 4,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: priority,
              decoration: InputDecoration(labelText: l10n.supportPriority),
              items: const ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
                  .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                  .toList(),
              onChanged: (v) => priority = v ?? 'MEDIUM',
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  if (subjectCtrl.text.trim().isEmpty || messageCtrl.text.trim().isEmpty) return;
                  try {
                    await api.post('/owner/support', data: {
                      'subject': subjectCtrl.text.trim(),
                      'message': messageCtrl.text.trim(),
                      'priority': priority,
                    });
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    await _load();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.supportTicketCreated), backgroundColor: AppTheme.teal),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(friendlyError(e, l10n)), backgroundColor: AppTheme.crimson),
                      );
                    }
                  }
                },
                child: Text(l10n.supportSubmit, style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openTicket(Map<String, dynamic> ticket) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _TicketDetailPage(ticketId: ticket['id'] as String, subject: ticket['subject'] as String? ?? ''),
      ),
    ).then((_) => _load());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.supportMyTickets),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(l10n),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.gold,
        onPressed: _openCreate,
        child: const Icon(Icons.add, color: AppTheme.navy),
      ),
    );
  }

  Widget _buildBody(AppLocalizations l10n) {
    if (_loading) return AsyncStateView.loading();
    if (_error != null) return AsyncStateView.error(context, _error!, onRetry: _load);
    if (_tickets.isEmpty) {
      return AsyncStateView.empty(context, l10n.supportNoTickets, icon: Icons.support_agent);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _tickets.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final t = _tickets[i];
        final status = (t['status'] ?? 'OPEN').toString();
        final replies = (t['_count']?['messages'] ?? 0) as int;
        final createdAt = DateTime.tryParse(t['createdAt']?.toString() ?? '');
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: _statusColor(status).withValues(alpha: 0.15),
            child: Icon(Icons.support_agent, color: _statusColor(status), size: 20),
          ),
          title: Text(t['subject'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.navy)),
          subtitle: Text(
            [
              _statusLabel(l10n, status),
              '$replies ${l10n.supportReplies.toLowerCase()}',
              if (createdAt != null) '${createdAt.day}/${createdAt.month}/${createdAt.year}',
            ].join(' · '),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
          trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary),
          onTap: () => _openTicket(t),
        );
      },
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'RESOLVED':
        return AppTheme.teal;
      case 'CLOSED':
        return AppTheme.textSecondary;
      default:
        return AppTheme.gold;
    }
  }

  String _statusLabel(AppLocalizations l10n, String status) {
    switch (status) {
      case 'RESOLVED':
        return l10n.supportStatusResolved;
      case 'CLOSED':
        return l10n.supportStatusClosed;
      default:
        return l10n.supportStatusOpen;
    }
  }
}

class _TicketDetailPage extends StatefulWidget {
  final String ticketId;
  final String subject;
  const _TicketDetailPage({required this.ticketId, required this.subject});

  @override
  State<_TicketDetailPage> createState() => _TicketDetailPageState();
}

class _TicketDetailPageState extends State<_TicketDetailPage> {
  final api = ApiClient();
  Map<String, dynamic>? _ticket;
  List<dynamic> _messages = [];
  bool _loading = true;
  String? _error;
  final _replyCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await api.get('/owner/support/${widget.ticketId}');
      if (mounted) {
        setState(() {
          _ticket = res['data'] as Map<String, dynamic>? ?? {};
          _messages = _ticket!['messages'] as List? ?? [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = friendlyError(e, AppLocalizations.of(context));
          _loading = false;
        });
      }
    }
  }

  Future<void> _sendReply() async {
    final l10n = AppLocalizations.of(context);
    final content = _replyCtrl.text.trim();
    if (content.isEmpty) return;
    try {
      await api.post('/owner/support/${widget.ticketId}/messages', data: {'content': content});
      _replyCtrl.clear();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(e, l10n)), backgroundColor: AppTheme.crimson),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(widget.subject)),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? AsyncStateView.loading()
                : _error != null
                    ? AsyncStateView.error(context, _error!, onRetry: _load)
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, i) {
                          final m = _messages[i];
                          final senderRole = m['sender']?['role'] ?? '';
                          final isOwner = senderRole == 'BUSINESS_OWNER';
                          final dt = DateTime.tryParse(m['createdAt']?.toString() ?? '');
                          return Align(
                            alignment: isOwner ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.symmetric(vertical: 6),
                              padding: const EdgeInsets.all(12),
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                              decoration: BoxDecoration(
                                color: isOwner ? AppTheme.navy : Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(m['content'] ?? '',
                                    style: TextStyle(color: isOwner ? Colors.white : AppTheme.textPrimary, fontSize: 14)),
                                  if (dt != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Text(
                                        '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}',
                                        style: TextStyle(fontSize: 10, color: isOwner ? Colors.white70 : AppTheme.textSecondary),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _replyCtrl,
                      decoration: InputDecoration(hintText: l10n.supportTypeReply),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _sendReply,
                    icon: const Icon(Icons.send, color: AppTheme.teal),
                    tooltip: l10n.supportSendReply,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
