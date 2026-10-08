import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/network/api_client.dart';
import '../../../app/themes.dart';
import '../../blocs/auth/auth_bloc.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final api = ApiClient();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  bool _saving = false;
  bool _editing = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthBloc>().currentUser;
    _nameCtrl.text = user?.name ?? '';
    _emailCtrl.text = user?.email ?? '';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    setState(() => _saving = true);
    try {
      final res = await api.put('/users/me', data: {
        'name': _nameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
      });
      final data = res['data']?['user'];
      if (data is Map && mounted) {
        // Refresh the in-memory user on the auth bloc.
        context.read<AuthBloc>().add(LoadUser());
      }
      if (!mounted) return;
      setState(() {
        _saving = false;
        _editing = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.profileUpdated), backgroundColor: AppTheme.teal),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric), backgroundColor: AppTheme.crimson),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final user = context.read<AuthBloc>().currentUser;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.profileTitle),
        actions: [
          TextButton.icon(
            onPressed: () => setState(() => _editing = !_editing),
            icon: Icon(_editing ? Icons.close : Icons.edit, color: Colors.white, size: 18),
            label: Text(_editing ? l10n.commonCancel : l10n.commonEdit,
              style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: AppTheme.teal.withValues(alpha: 0.15),
              child: const Icon(Icons.person, size: 48, color: AppTheme.teal),
            ),
          ),
          const SizedBox(height: 24),
          if (_editing) ...[
            TextField(
              controller: _nameCtrl,
              decoration: InputDecoration(labelText: l10n.profileName),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emailCtrl,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(l10n.commonSave),
              ),
            ),
          ] else ...[
            _infoRow(l10n.profileName, user?.name ?? '—'),
            const Divider(height: 24),
            _infoRow(l10n.commonPhone, user?.phone ?? '—'),
            const Divider(height: 24),
            _infoRow('Email', user?.email ?? '—'),
            const Divider(height: 24),
            _infoRow(l10n.profileRole,
              user?.isOwner == true ? l10n.authBusinessOwner : l10n.authEmployee),
          ],
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.textSecondary)),
        const SizedBox(width: 12),
        Flexible(child: Text(value, textAlign: TextAlign.right,
          style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.navy))),
      ],
    );
  }
}
