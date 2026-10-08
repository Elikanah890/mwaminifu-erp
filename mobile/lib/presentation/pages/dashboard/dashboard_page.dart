import 'package:flutter/material.dart';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/shop/shop_bloc.dart';
import '../../../core/network/api_client.dart';
import '../../../core/offline/offline_queue.dart';
import '../../../core/offline/sync_engine.dart';
import '../../../core/permissions/permissions.dart';
import '../../../core/settings/app_settings.dart';
import '../../../app/themes.dart';
import '../../../core/widgets/async_states.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  Map<String, dynamic>? _dashData;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initShops();
  }

  Future<void> _initShops() async {
    final auth = context.read<AuthBloc>();
    context.read<ShopBloc>().add(LoadShops(preferredShopId: auth.currentShopId));
  }

  Future<void> _loadDashboard(String shopId) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final api = ApiClient();
    try {
      final dash = await api.get('/shops/$shopId/dashboard');
      if (mounted) {
        setState(() {
          _dashData = dash['data'];
          _loading = false;
        });
      }
      _flushOffline(shopId);
    } catch (_) {
      if (mounted) {
        setState(() {
        _error = 'error';
        _loading = false;
      });
      }
    }
  }

  Future<void> _flushOffline(String shopId) async {
    if (await OfflineQueue.instance.count() == 0) return;
    final result = await SyncEngine(ApiClient()).flush(shopId: shopId);
    if (!mounted) return;
    final l10n = AppLocalizations.of(context);
    final pending = await OfflineQueue.instance.count();
    if (!mounted) return;
    if (result['error'] == null && result['pushed'] != 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.dashboardSyncedOffline(result['pushed'] as int? ?? 0)),
          backgroundColor: AppTheme.teal),
      );
    } else if (pending > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.dashboardPendingSync(pending)),
          backgroundColor: AppTheme.gold),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = context.read<AuthBloc>();
    final shopState = context.watch<ShopBloc>().state;

    String? activeShopId;
    if (shopState is ShopLoaded) activeShopId = shopState.activeShopId;

    return BlocListener<ShopBloc, ShopState>(
      listener: (context, state) {
        if (state is ShopLoaded && state.activeShopId != null) {
          setState(() {
            _dashData = null;
            _error = null;
          });
          _loadDashboard(state.activeShopId!);
        }
      },
      child: Scaffold(
        appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.asset('assets/images/mwaminifu-logo.jpg', width: 28, height: 28, fit: BoxFit.cover),
            ),
            const SizedBox(width: 8),
            Text(l10n.dashboardTitle),
          ],
        ),
        actions: [
          if (shopState is ShopLoaded && shopState.shops.isNotEmpty)
            _buildShopSwitcher(context, shopState, auth.isOwner),
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: activeShopId == null ? null : () => _loadDashboard(activeShopId!),
            tooltip: l10n.commonRefresh,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              context.read<AuthBloc>().add(Logout());
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.commonLogout)));
            },
            tooltip: l10n.commonLogout,
          ),
        ],
      ),
        body: _buildBody(context, activeShopId),
      ),
    );
  }

  Widget _buildShopSwitcher(BuildContext context, ShopLoaded shopState, bool isOwner) {
    if (!isOwner || shopState.shops.length <= 1) {
      return Center(
        child: Text(shopState.activeShop?.name ?? '', style: const TextStyle(color: Colors.white, fontSize: 13)),
      );
    }
    return Center(
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: shopState.activeShopId,
          dropdownColor: AppTheme.navy,
          iconEnabledColor: Colors.white,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          items: shopState.shops
              .map((s) => DropdownMenuItem(value: s.id, child: Text(s.name, overflow: TextOverflow.ellipsis)))
              .toList(),
          onChanged: (id) {
            if (id != null) {
              context.read<ShopBloc>().add(SelectShop(id));
            }
          },
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, String? activeShopId) {
    final l10n = AppLocalizations.of(context);
    if (activeShopId == null) {
      return AsyncStateView.empty(context, l10n.shopNoShops, icon: Icons.store);
    }
    if (_loading) return AsyncStateView.loading();
    if (_error != null) {
      return AsyncStateView.error(context, l10n.errorGeneric,
        onRetry: () => _loadDashboard(activeShopId));
    }
    return RefreshIndicator(
      onRefresh: () => _loadDashboard(activeShopId),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildGreeting(l10n),
          const SizedBox(height: 16),
          _buildKpiCards(l10n),
          const SizedBox(height: 24),
          _buildQuickActions(context, l10n),
          const SizedBox(height: 24),
          _buildRecentSection(l10n),
        ],
      ),
    );
  }

  Widget _buildGreeting(AppLocalizations l10n) {
    final user = context.read<AuthBloc>().currentUser;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.dashboardWelcomeBack, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
        Text(user?.name ?? 'User', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.navy)),
      ],
    );
  }

  Widget _buildKpiCards(AppLocalizations l10n) {
    String tzs(value) => AppSettings.instance.formatCurrency((value ?? 0));
    return RepaintBoundary(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _kpiCard(l10n.dashboardTodaySales, tzs(_dashData?['todaySales']), Icons.shopping_cart, AppTheme.navy),
            _kpiCard(l10n.dashboardProfit, tzs(_dashData?['todayProfit']), Icons.trending_up, AppTheme.teal),
            _kpiCard(l10n.dashboardCredit, tzs(_dashData?['creditGivenToday']), Icons.credit_card, AppTheme.gold),
            _kpiCard(l10n.dashboardLowStock, '${_dashData?['lowStockItems'] ?? 0} ${l10n.dashboardItems}', Icons.warning, AppTheme.crimson),
            _kpiCard(l10n.dashboardExpensesToday, tzs(_dashData?['expensesToday']), Icons.money_off, AppTheme.crimson),
          ],
        ),
      ),
    );
  }

  Widget _kpiCard(String title, String value, IconData icon, Color color) {
    return Container(
      width: 160,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.navy)),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context, AppLocalizations l10n) {
    final auth = context.read<AuthBloc>();
    final actions = <_QuickAction>[];
    if (auth.hasPermission(Permission.posWrite)) {
      actions.add(_QuickAction(l10n.dashboardNewSale, Icons.shopping_cart, AppTheme.gold, () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Navigation to POS disabled")))));
    }
    if (auth.hasPermission(Permission.inventoryWrite)) {
      actions.add(_QuickAction(l10n.dashboardAddProduct, Icons.add_circle, AppTheme.navy, () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Navigation to Inventory disabled")))));
    }
    if (auth.hasPermission(Permission.expensesWrite)) {
      actions.add(_QuickAction(l10n.dashboardAddExpense, Icons.money_off, AppTheme.teal, () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.dashboardAddExpense)))));
    }
    if (auth.hasPermission(Permission.reportsRead)) {
      actions.add(_QuickAction(l10n.dashboardReports, Icons.bar_chart, AppTheme.navy, () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Navigation to Reports disabled")))));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.dashboardQuickActions, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 4,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          children: actions.map((a) => _quickActionButton(a)).toList(),
        ),
      ],
    );
  }

  Widget _quickActionButton(_QuickAction action) {
    return Material(
      color: action.color.withValues(alpha: 0.1),
      clipBehavior: Clip.antiAlias,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: action.onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(action.icon, color: action.color, size: 28),
              const SizedBox(height: 6),
              Text(action.label, textAlign: TextAlign.center, style: TextStyle(
                fontSize: 11, color: action.color, fontWeight: FontWeight.w600,
              )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentSection(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.dashboardRecentActivity, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
        const SizedBox(height: 12),
        Column(
          children: [
            _ActivityItem(icon: Icons.shopping_cart, title: l10n.dashboardSalesToday, value: l10n.dashboardViewReports, color: AppTheme.navy),
            const Divider(),
            _ActivityItem(icon: Icons.inventory, title: l10n.dashboardInventoryStatus, value: l10n.dashboardCheckStockLevels, color: AppTheme.teal),
            const Divider(),
            _ActivityItem(icon: Icons.sync, title: l10n.dashboardSyncStatus, value: l10n.dashboardAllDataSynced, color: AppTheme.gold),
          ],
        ),
      ],
    );
  }
}

class _QuickAction {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  _QuickAction(this.label, this.icon, this.color, this.onTap);
}

class _ActivityItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color color;
  const _ActivityItem({required this.icon, required this.title, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: 12),
          Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w500, color: AppTheme.navy))),
          Text(value, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}