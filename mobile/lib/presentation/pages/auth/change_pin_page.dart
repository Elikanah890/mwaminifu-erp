import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/permissions/permissions_store.dart';
import '../../../core/network/api_client.dart';
import '../../../app/themes.dart';

class ChangePinPage extends StatefulWidget {
  const ChangePinPage({super.key});

  @override
  State<ChangePinPage> createState() => _ChangePinPageState();
}

class _ChangePinPageState extends State<ChangePinPage> {
  final api = ApiClient();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;

  @override
  void dispose() {
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await api.post('/auth/change-password', data: {
        'newPassword': _newCtrl.text,
      });
      await api.clearTokens();
      await PermissionsStore.clear();
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.authPinChanged), backgroundColor: AppTheme.teal),
      );
      context.go('/login');
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_errorText(e)), backgroundColor: AppTheme.crimson),
      );
    }
  }

  String _errorText(dynamic e) {
    if (e is Map && e.containsKey('error')) {
      return e['error']?['message'] ?? AppLocalizations.of(context).errorGeneric;
    }
    return AppLocalizations.of(context).errorGeneric;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change Password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Set a new password before continuing.',
                  style: TextStyle(color: AppTheme.textSecondary)),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _newCtrl,
                  decoration: const InputDecoration(labelText: 'New Password', prefixIcon: Icon(Icons.lock_outline, color: AppTheme.teal)),
                  obscureText: true,
                  validator: (v) => v == null || v.length < 8 ? 'Password must be at least 8 characters' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmCtrl,
                  decoration: const InputDecoration(labelText: 'Confirm Password', prefixIcon: Icon(Icons.lock_reset, color: AppTheme.teal)),
                  obscureText: true,
                  validator: (v) => v != _newCtrl.text ? 'Passwords do not match' : null,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Update Password', style: TextStyle(fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
