import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../core/network/api_client.dart';
import '../core/permissions/permissions.dart';
import '../core/settings/app_settings.dart';
import '../core/settings/locale_settings.dart';
import '../core/sync/sync_engine.dart';
import 'themes.dart';
import '../presentation/blocs/auth/auth_bloc.dart';
import '../presentation/blocs/product/product_bloc.dart';
import '../presentation/blocs/shop/shop_bloc.dart';
import '../presentation/pages/auth/login_page.dart';
import '../presentation/pages/auth/otp_page.dart';
import '../presentation/pages/auth/pin_setup_page.dart';
import '../presentation/pages/auth/change_pin_page.dart';
import '../presentation/pages/dashboard/dashboard_page.dart';
import 'package:mwaminifu_app/presentation/pages/pos/pos_page.dart' as pos;
import '../presentation/pages/inventory/inventory_page.dart';
import '../presentation/pages/reports/reports_page.dart';
import '../presentation/pages/more/more_page.dart';
import '../presentation/pages/more/receipt_settings_page.dart';
import '../presentation/pages/expenses/expenses_page.dart';
import '../presentation/pages/customers/customers_page.dart';
import '../presentation/pages/loans/loans_page.dart';
import '../presentation/pages/employees/employees_page.dart';
import '../presentation/pages/shops/shops_page.dart';
import '../presentation/pages/notifications/notifications_page.dart';
import '../presentation/pages/support/support_page.dart';
import '../presentation/pages/profile/profile_page.dart';

class MwaminifuApp extends StatefulWidget {
  const MwaminifuApp({super.key});

  @override
  State<MwaminifuApp> createState() => _MwaminifuAppState();
}

class _MwaminifuAppState extends State<MwaminifuApp> {
  late Future<void> _configFuture;
  late final ApiClient _apiClient;
  GoRouter? _router;

  @override
  void initState() {
    super.initState();
    _apiClient = ApiClient();
    _router = _buildRouter(_apiClient);
    _configFuture = AppSettings.instance.fetch();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _configFuture,
      builder: (context, snapshot) {
        return MultiBlocProvider(
          providers: [
            BlocProvider(create: (_) => AuthBloc(_apiClient)..add(LoadUser())),
            BlocProvider(create: (_) => ProductBloc(_apiClient)),
            BlocProvider(create: (_) => ShopBloc(_apiClient)),
          ],
          child: SyncLifecycle(
            child: ListenableBuilder(
            listenable: LocaleSettings.instance,
            builder: (context, _) {
              return MaterialApp.router(
                onGenerateTitle: (context) =>
                    AppLocalizations.of(context).appTitle,
                debugShowCheckedModeBanner: false,
                theme: AppTheme.lightTheme,
                locale: LocaleSettings.instance.locale,
                supportedLocales: LocaleSettings.supportedLocales,
                localizationsDelegates: const [
                  AppLocalizations.delegate,
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                routerConfig: _router,
              );
            },
            ),
          ),
        );
      },
    );
  }

  GoRouter _buildRouter(ApiClient apiClient) {
    return GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(path: '/login', builder: (_, _) => const LoginPage()),
        GoRoute(path: '/otp', builder: (_, _) => const OtpPage()),
        GoRoute(path: '/pin-setup', builder: (_, _) => const PinSetupPage()),
        ShellRoute(
          builder: (_, _, child) => MainShell(child: child),
          routes: [
            GoRoute(path: '/dashboard', builder: (_, _) => DashboardPage()),
            GoRoute(path: '/pos', builder: (_, _) => pos.PosPage()),
            GoRoute(path: '/inventory', builder: (_, _) => const InventoryPage()),
            GoRoute(path: '/reports', builder: (_, _) => const ReportsPage()),
            GoRoute(path: '/expenses', builder: (_, _) => const ExpensesPage()),
            GoRoute(path: '/customers', builder: (_, _) => const CustomersPage()),
            GoRoute(path: '/loans', builder: (_, _) => const LoansPage()),
            GoRoute(path: '/employees', builder: (_, _) => const EmployeesPage()),
            GoRoute(path: '/shops', builder: (_, _) => const ShopsPage()),
            GoRoute(path: '/notifications', builder: (_, _) => const NotificationsPage()),
            GoRoute(path: '/support', builder: (_, _) => const SupportPage()),
            GoRoute(path: '/profile', builder: (_, _) => const ProfilePage()),
            GoRoute(path: '/change-pin', builder: (_, _) => const ChangePinPage()),
            GoRoute(path: '/more', builder: (_, _) => const MorePage()),
            GoRoute(path: '/receipt-settings', builder: (_, _) => const ReceiptSettingsPage()),
          ],
        ),
      ],
    );
  }
}

class SyncLifecycle extends StatefulWidget {
  final Widget child;

  const SyncLifecycle({super.key, required this.child});

  @override
  State<SyncLifecycle> createState() => _SyncLifecycleState();
}

class _SyncLifecycleState extends State<SyncLifecycle> {
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen(_onConnectivityChanged);
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  Future<void> _onConnectivityChanged(List<ConnectivityResult> results) async {
    if (_syncing || results.every((result) => result == ConnectivityResult.none)) return;
    final shopState = context.read<ShopBloc>().state;
    if (shopState is! ShopLoaded || shopState.activeShopId == null) return;

    _syncing = true;
    try {
      final result = await SyncEngine(ApiClient()).sync(shopId: shopState.activeShopId!);
      if (mounted && result['error'] == null) {
        context.read<ProductBloc>().add(LoadProducts(shopState.activeShopId!));
      }
    } finally {
      _syncing = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ShopBloc, ShopState>(
      listener: (context, state) {
        if (state is ShopLoaded && state.activeShopId != null) {
          _onConnectivityChanged(const [ConnectivityResult.wifi]);
        }
      },
      child: widget.child,
    );
  }
}

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final currentRoute = GoRouterState.of(context).uri.path;
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final l10n = AppLocalizations.of(context);
        final auth = context.read<AuthBloc>();
        final showPos = auth.isEmployee || auth.hasPermission(Permission.posWrite);
        final showReports = auth.canViewReports;

        return Scaffold(
          body: child,
          bottomNavigationBar: BottomNavigationBar(
            type: BottomNavigationBarType.fixed,
            currentIndex: _getIndex(currentRoute, showPos, showReports),
            onTap: (index) => _navigate(context, index, showPos, showReports),
            selectedItemColor: const Color(0xFF0A1E3F),
            unselectedItemColor: const Color(0xFF64748B),
            items: _buildItems(l10n, showPos, showReports),
          ),
        );
      },
    );
  }

  List<BottomNavigationBarItem> _buildItems(
    AppLocalizations l10n,
    bool showPos,
    bool showReports,
  ) {
    final items = <BottomNavigationBarItem>[
      BottomNavigationBarItem(
        icon: const Icon(Icons.dashboard),
        label: l10n.dashboardTitle,
      ),
    ];
    if (showPos) {
      items.add(BottomNavigationBarItem(
        icon: const Icon(Icons.shopping_cart),
        label: l10n.posTitle,
      ));
    }
    items.add(BottomNavigationBarItem(
      icon: const Icon(Icons.inventory),
      label: l10n.inventoryTitle,
    ));
    if (showReports) {
      items.add(BottomNavigationBarItem(
        icon: const Icon(Icons.bar_chart),
        label: l10n.reportsTitle,
      ));
    }
    items.add(BottomNavigationBarItem(
      icon: const Icon(Icons.more_horiz),
      label: l10n.moreTitle,
    ));
    return items;
  }

  List<String> _routes(bool showPos, bool showReports) {
    final routes = <String>['/dashboard'];
    if (showPos) routes.add('/pos');
    routes.add('/inventory');
    if (showReports) routes.add('/reports');
    routes.add('/more');
    return routes;
  }

  int _getIndex(String route, bool showPos, bool showReports) {
    if (route.startsWith('/dashboard')) return 0;
    if (showPos && route.startsWith('/pos')) return 1;
    if (route.startsWith('/inventory')) return showPos ? 2 : 1;
    if (showReports && route.startsWith('/reports')) return showPos ? 3 : 2;
    return _routes(showPos, showReports).length - 1;
  }

  void _navigate(BuildContext context, int index, bool showPos, bool showReports) {
    final routes = _routes(showPos, showReports);
    if (index < 0 || index >= routes.length) return;
    context.go(routes[index]);
  }
}
