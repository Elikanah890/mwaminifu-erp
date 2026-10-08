import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../../app/themes.dart';

class PinSetupPage extends StatefulWidget {
  const PinSetupPage({super.key});

  @override
  State<PinSetupPage> createState() => _PinSetupPageState();
}

class _PinSetupPageState extends State<PinSetupPage> {
  final _pinController = TextEditingController();
  final _confirmController = TextEditingController();

  @override
  void dispose() {
    _pinController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.authCreatePin)),
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is Authenticated) {
            context.go('/dashboard');
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppTheme.crimson),
            );
          }
        },
        builder: (context, state) {
          return Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 40),
                Text(l10n.authCreatePin, style: const TextStyle(
                  fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.navy,
                )),
                const SizedBox(height: 8),
                Text(l10n.authCreatePinDesc,
                  style: const TextStyle(color: AppTheme.textSecondary)),
                const SizedBox(height: 32),
                TextField(
                  controller: _pinController,
                  decoration: InputDecoration(
                    labelText: l10n.authNewPin,
                    prefixIcon: const Icon(Icons.lock, color: AppTheme.teal),
                  ),
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  maxLength: 6,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _confirmController,
                  decoration: InputDecoration(
                    labelText: l10n.authConfirmPin,
                    prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.teal),
                  ),
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  maxLength: 6,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: state is AuthLoading ? null : () {
                    if (_pinController.text != _confirmController.text) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.authPinsDoNotMatch), backgroundColor: AppTheme.crimson),
                      );
                      return;
                    }
                    context.read<AuthBloc>().add(SetPin(_pinController.text));
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: AppTheme.gold,
                    foregroundColor: AppTheme.navy,
                  ),
                  child: state is AuthLoading
                      ? const CircularProgressIndicator(color: AppTheme.navy)
                      : Text(l10n.authSavePin, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
