import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import 'package:mwaminifu_app/core/network/api_client.dart';
import 'package:mwaminifu_app/core/settings/locale_settings.dart';
import 'package:mwaminifu_app/presentation/blocs/auth/auth_bloc.dart';
import 'package:mwaminifu_app/presentation/pages/auth/login_page.dart';

Widget _wrap() {
  return MultiBlocProvider(
    providers: [
      BlocProvider<AuthBloc>(create: (_) => AuthBloc(ApiClient())),
    ],
    child: ListenableBuilder(
      listenable: LocaleSettings.instance,
      builder: (context, _) => MaterialApp(
        locale: LocaleSettings.instance.locale,
        supportedLocales: LocaleSettings.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const LoginPage(),
      ),
    ),
  );
}

void main() {
  setUp(() async {
    // Ensure a deterministic starting locale (Kiswahili default).
    await LocaleSettings.instance.setLocale('sw');
  });

  testWidgets('login screen renders in Kiswahili by default', (tester) async {
    await tester.pumpWidget(_wrap());
    await tester.pumpAndSettle();

    expect(find.text('Mwaminifu'), findsOneWidget);
    expect(find.text('Ingia'), findsOneWidget); // login button
    expect(find.text('Mmiliki wa Biashara'), findsOneWidget);
    expect(find.text('Mfanyakazi'), findsOneWidget);
    expect(find.text('Lugha'), findsOneWidget);
  });

  testWidgets('switching language to English updates the login screen', (tester) async {
    await tester.pumpWidget(_wrap());
    await tester.pumpAndSettle();

    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();

    expect(find.text('Login'), findsOneWidget);
    expect(find.text('Business Owner'), findsOneWidget);
    expect(find.text('Employee'), findsOneWidget);
  });
}
