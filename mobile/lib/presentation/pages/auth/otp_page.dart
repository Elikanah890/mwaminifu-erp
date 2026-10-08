import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../../app/themes.dart';
import '../../../core/settings/app_settings.dart';

class OtpPage extends StatefulWidget {
  const OtpPage({super.key});

  @override
  State<OtpPage> createState() => _OtpPageState();
}

class _OtpPageState extends State<OtpPage> {
  final _otpController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _otpController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.authVerifyOtpTitle)),
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is Authenticated) {
            context.go('/dashboard');
          } else if (state is NeedPinSetup) {
            context.go('/pin-setup');
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
                Text(l10n.authEnterOtp, style: const TextStyle(
                  fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.navy,
                )),
                const SizedBox(height: 8),
                Text(
                  l10n.authOtpSentTo(AppSettings.instance.otpLifetimeMinutes),
                  style: const TextStyle(color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: _phoneController,
                  decoration: InputDecoration(
                    labelText: l10n.authPhoneNumber,
                    prefixIcon: const Icon(Icons.phone, color: AppTheme.teal),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _otpController,
                  decoration: InputDecoration(
                    labelText: l10n.authOtpCode,
                    hintText: '123456',
                    prefixIcon: const Icon(Icons.message, color: AppTheme.teal),
                  ),
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, letterSpacing: 8),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: state is AuthLoading ? null : () {
                    context.read<AuthBloc>().add(VerifyOtp(
                      _phoneController.text.trim(),
                      _otpController.text.trim(),
                    ));
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: state is AuthLoading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(l10n.authVerify, style: const TextStyle(fontSize: 16)),
                ),
                const SizedBox(height: 16),
                Center(
                  child: TextButton(
                    onPressed: () {
                      context.read<AuthBloc>().add(RequestOtp(_phoneController.text.trim()));
                    },
                    child: Text(l10n.authResendOtp, style: const TextStyle(color: AppTheme.teal)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
