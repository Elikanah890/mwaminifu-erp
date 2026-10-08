import 'package:flutter/material.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/network/api_client.dart';
import '../../../app/themes.dart';

class ChangePinPage extends StatefulWidget {
  const ChangePinPage({super.key});

  @override
  State<ChangePinPage> createState() => _ChangePinPageState();
}

class _ChangePinPageState extends State<ChangePinPage> {
  final api = ApiClient();
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await api.post('/auth/employee/change-pin', data: {
        'currentPin': _currentCtrl.text,
        'pin': _newCtrl.text,
      });
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.authPinChanged), backgroundColor: AppTheme.teal),
      );
      Navigator.of(context).pop();
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
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.authChangePin)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.authChangePinDesc,
                  style: const TextStyle(color: AppTheme.textSecondary)),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _currentCtrl,
                  decoration: InputDecoration(labelText: l10n.authCurrentPin, prefixIcon: const Icon(Icons.lock, color: AppTheme.teal)),
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  maxLength: 6,
                  validator: (v) => v == null || v.length != 6 ? l10n.authEnterCurrentPin : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _newCtrl,
                  decoration: InputDecoration(labelText: l10n.authNewPin, prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.teal)),
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  maxLength: 6,
                  validator: (v) {
                    if (v == null || v.length != 6) return l10n.authEnterValidPin;
                    if (v == _currentCtrl.text) return l10n.authNewPinMustDiffer;
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmCtrl,
                  decoration: InputDecoration(labelText: l10n.authConfirmPin, prefixIcon: const Icon(Icons.lock_reset, color: AppTheme.teal)),
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  maxLength: 6,
                  validator: (v) => v != _newCtrl.text ? l10n.authPinsDoNotMatch : null,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(l10n.authUpdatePin, style: const TextStyle(fontSize: 16)),
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
