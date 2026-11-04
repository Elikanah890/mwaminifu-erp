import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../../app/themes.dart';
import '../../../core/settings/app_settings.dart';
import '../../../core/settings/locale_settings.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _phoneController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    context.read<AuthBloc>().add(LoginWithPin(
      _phoneController.text.trim(),
      _pinController.text.trim(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is Authenticated) {
            context.go('/dashboard');
          } else if (state is NeedPasswordChange) {
            context.go('/change-password');
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppTheme.crimson),
            );
          }
        },
        builder: (context, state) {
          if (AppSettings.instance.maintenanceMode) {
            return SafeArea(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.build_circle, size: 64, color: AppTheme.gold),
                      const SizedBox(height: 16),
                      Text(l10n.authMaintenanceTitle(AppSettings.instance.appName),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy),
                      ),
                      const SizedBox(height: 8),
                      Text(l10n.authMaintenanceDesc,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () => AppSettings.instance.fetch().then((_) {
                          if (context.mounted) setState(() {});
                        }),
                        child: Text(l10n.authTryAgain),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }
          return SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(32),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildLanguageSelector(l10n),
                      const SizedBox(height: 16),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: Image.asset(
                          'assets/images/mwaminifu-logo.jpg',
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(AppSettings.instance.appName, style: const TextStyle(
                        fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.navy,
                      )),
                      Text(l10n.businessManagement, style: const TextStyle(
                        fontSize: 14, color: AppTheme.textSecondary,
                      )),
                      const SizedBox(height: 32),
                      TextFormField(
                        controller: _phoneController,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          hintText: 'you@example.com',
                          prefixIcon: Icon(Icons.mail_outline, color: AppTheme.teal),
                        ),
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) => v == null || !v.contains('@') ? 'Enter a valid email' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _pinController,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          prefixIcon: Icon(Icons.lock, color: AppTheme.teal),
                        ),
                        obscureText: true,
                        validator: (v) => v == null || v.isEmpty ? 'Enter your password' : null,
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: state is AuthLoading ? null : _handleLogin,
                          child: state is AuthLoading
                              ? const SizedBox(
                                  width: 24, height: 24,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : Text(l10n.authLogin, style: const TextStyle(fontSize: 16)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLanguageSelector(AppLocalizations l10n) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.language, color: AppTheme.teal, size: 18),
          const SizedBox(width: 8),
          Text(l10n.languageLabel, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          const SizedBox(width: 12),
          _langOption(l10n.languageKiswahili, 'sw'),
          const SizedBox(width: 8),
          _langOption(l10n.languageEnglish, 'en'),
        ],
      ),
    );
  }

  Widget _langOption(String label, String code) {
    final selected = LocaleSettings.instance.locale.languageCode == code;
    return InkWell(
      onTap: () => LocaleSettings.instance.setLocale(code),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? AppTheme.navy : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            color: selected ? Colors.white : AppTheme.textPrimary,
          ),
        ),
      ),
    );
  }
}
