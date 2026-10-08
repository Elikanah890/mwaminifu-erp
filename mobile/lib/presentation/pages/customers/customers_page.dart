import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/network/api_client.dart';
import '../../../core/permissions/permissions.dart';
import '../../../core/utils/app_error.dart';
import '../../../core/widgets/async_states.dart';
import '../../../core/settings/app_settings.dart';
import '../../../app/themes.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/shop/shop_bloc.dart';

class CustomersPage extends StatefulWidget {
  const CustomersPage({super.key});

  @override
  State<CustomersPage> createState() => _CustomersPageState();
}

class _CustomersPageState extends State<CustomersPage> {
  final api = ApiClient();
  String _shopId = '';
  List<dynamic> _customers = [];
  bool _loading = true;
  String? _error;

  bool get _canWrite =>
      context.read<AuthBloc>().hasPermission(Permission.creditWrite);

  @override
  void initState() {
    super.initState();
    _resolveShop();
  }

  void _resolveShop() {
    final state = context.read<ShopBloc>().state;
    if (state is ShopLoaded) {
      _load(state.activeShopId);
    } else {
      context.read<ShopBloc>().add(LoadShops());
    }
  }

  Future<void> _load(String? shopId) async {
    if (shopId == null || shopId.isEmpty) return;
    _shopId = shopId;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await api.get('/shops/$shopId/customers');
      if (mounted) {
        setState(() {
        _customers = res['data'] as List? ?? [];
        _loading = false;
      });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
        _error = 'error';
        _loading = false;
      });
      }
    }
  }

  String _fmt(dynamic v) => AppSettings.instance.formatCurrency((v is num ? v : 0));

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return BlocListener<ShopBloc, ShopState>(
      listener: (context, state) {
        if (state is ShopLoaded) _load(state.activeShopId);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.customersTitle),
          actions: [
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: () => _showSearchDialog(l10n),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () => _load(_shopId),
          child: _buildBody(l10n),
        ),
        floatingActionButton: _canWrite
            ? FloatingActionButton(
                backgroundColor: AppTheme.gold,
                onPressed: () => _showForm(l10n),
                child: const Icon(Icons.add, color: AppTheme.navy),
              )
            : null,
      ),
    );
  }

  Widget _buildBody(AppLocalizations l10n) {
    if (_loading) return AsyncStateView.loading();
    if (_error != null) return AsyncStateView.error(context, l10n.errorGeneric, onRetry: () => _load(_shopId));
    if (_customers.isEmpty) {
      return AsyncStateView.empty(context, l10n.customersNoCustomers, icon: Icons.people_outline);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _customers.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final c = _customers[i];
        final balance = (c['outstandingBalance'] ?? 0) as num;
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: balance > 0 ? AppTheme.gold.withValues(alpha: 0.15) : AppTheme.navy.withValues(alpha: 0.1),
            child: Icon(Icons.person, color: balance > 0 ? AppTheme.gold : AppTheme.navy, size: 20),
          ),
          title: Text(c['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.navy)),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if ((c['phone'] ?? '').toString().isNotEmpty)
                Text(c['phone'].toString(), style: const TextStyle(fontSize: 12)),
              Text(l10n.customersOutstanding(_fmt(balance)),
                style: TextStyle(
                  fontSize: 12,
                  color: balance > 0 ? AppTheme.crimson : AppTheme.teal,
                  fontWeight: FontWeight.w500,
                )),
            ],
          ),
          trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary, size: 20),
          onTap: () => _showDetail(c),
        );
      },
    );
  }

  void _showSearchDialog(AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.customersSearch),
        content: TextField(
          autofocus: true,
          decoration: InputDecoration(
            hintText: l10n.commonSearch,
            prefixIcon: const Icon(Icons.search, color: AppTheme.teal),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          onSubmitted: (v) async {
            Navigator.pop(ctx);
            try {
              final res = await api.get('/shops/$_shopId/customers', queryParameters: {'search': v});
              if (mounted) {
                setState(() {
                _customers = res['data'] as List? ?? [];
              });
              }
            } catch (_) {}
          },
        ),
      ),
    );
  }

  void _showForm(AppLocalizations l10n, {Map<String, dynamic>? customer}) {
    final nameCtrl = TextEditingController(text: customer?['name'] ?? '');
    final phoneCtrl = TextEditingController(text: customer?['phone'] ?? '');
    final addressCtrl = TextEditingController(text: customer?['address'] ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(customer == null ? l10n.customersAddCustomer : l10n.customersEditCustomer,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 16),
            TextField(controller: nameCtrl, decoration: InputDecoration(labelText: '${l10n.customersFullName} *'), autofocus: true),
            const SizedBox(height: 12),
            TextField(controller: phoneCtrl, decoration: InputDecoration(labelText: l10n.customersPhone), keyboardType: TextInputType.phone),
            const SizedBox(height: 12),
            TextField(controller: addressCtrl, decoration: InputDecoration(labelText: l10n.customersAddress)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  if (nameCtrl.text.isEmpty) return;
                  final payload = {
                    'name': nameCtrl.text,
                    'phone': phoneCtrl.text,
                    'address': addressCtrl.text,
                  };
                  try {
                    if (customer == null) {
                      await api.post('/shops/$_shopId/customers', data: payload);
                    } else {
                      await api.put('/customers/${customer['id']}', data: payload);
                    }
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    await _load(_shopId);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(customer == null ? l10n.customersCustomerAdded : l10n.customersCustomerUpdated),
                          backgroundColor: AppTheme.teal),
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
                child: Text(l10n.customersSaveCustomer, style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showDetail(Map<String, dynamic> customer) async {
    final l10n = AppLocalizations.of(context);
    List<dynamic> history = [];
    List<dynamic> creditHistory = [];
    try {
      final res = await api.get('/customers/${customer['id']}/purchase-history');
      history = res['data']?['sales'] as List? ?? [];
    } catch (_) {}
    try {
      final res = await api.get('/customers/${customer['id']}/credit-history');
      creditHistory = res['data']?['payments'] as List? ?? [];
    } catch (_) {}

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.all(20),
          child: ListView(
            controller: scrollController,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(customer['name'] ?? '',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit, color: AppTheme.teal),
                    onPressed: _canWrite
                        ? () {
                            Navigator.pop(ctx);
                            _showForm(l10n, customer: customer);
                          }
                        : null,
                  ),
                ],
              ),
              if ((customer['phone'] ?? '').toString().isNotEmpty)
                Text(customer['phone'].toString(), style: const TextStyle(color: AppTheme.textSecondary)),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppTheme.navy.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.customersOutstandingBalance, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                    Text(_fmt(customer['outstandingBalance']),
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.crimson)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (_canWrite)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.teal),
                    onPressed: () => _showPaymentDialog(ctx, customer),
                    child: Text(l10n.customersRecordPayment),
                  ),
                ),
              const SizedBox(height: 20),
              Text(l10n.customersPurchaseHistory, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
              const SizedBox(height: 8),
              if (history.isEmpty)
                Text(l10n.customersNoPurchases, style: const TextStyle(color: AppTheme.textSecondary))
              else
                ...history.take(20).map((s) {
                  final dt = DateTime.tryParse(s['saleDate'] ?? '') ?? DateTime.now();
                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.receipt, color: AppTheme.teal, size: 20),
                    title: Text(s['receiptNumber'] ?? 'Sale', style: const TextStyle(fontSize: 13)),
                    subtitle: Text('${dt.day}/${dt.month}/${dt.year}  ·  ${s['paymentMethod'] ?? ''}',
                      style: const TextStyle(fontSize: 11)),
                    trailing: Text(_fmt(s['grandTotal']), style: const TextStyle(fontWeight: FontWeight.bold)),
                  );
                }),
              const SizedBox(height: 20),
              Text(l10n.customersCreditHistory, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
              const SizedBox(height: 8),
              if (creditHistory.isEmpty)
                Text(l10n.reportsNoData, style: const TextStyle(color: AppTheme.textSecondary))
              else
                ...creditHistory.take(20).map((p) {
                  final dt = DateTime.tryParse(p['paymentDate'] ?? '') ?? DateTime.now();
                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.payments, color: AppTheme.gold, size: 20),
                    title: Text('${dt.day}/${dt.month}/${dt.year}', style: const TextStyle(fontSize: 13)),
                    trailing: Text(_fmt(p['amount']), style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.teal)),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }

  void _showPaymentDialog(BuildContext parentCtx, Map<String, dynamic> customer) {
    final l10n = AppLocalizations.of(context);
    final amountCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.customersRecordPayment),
        content: TextField(
          controller: amountCtrl,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: InputDecoration(
            labelText: l10n.customersAmount,
            prefixText: '${l10n.customersOwes(customer['name'] ?? '', _fmt(customer['outstandingBalance']))}\n',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.commonCancel)),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountCtrl.text);
              if (amount == null || amount <= 0) return;
              try {
                await api.post('/customers/${customer['id']}/credit-payment', data: {'amount': amount});
                if (!ctx.mounted || !parentCtx.mounted) return;
                Navigator.pop(ctx);
                Navigator.pop(parentCtx);
                await _load(_shopId);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.customersPaymentRecorded), backgroundColor: AppTheme.teal),
                  );
                }
              } catch (e) {
                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(friendlyError(e, l10n)), backgroundColor: AppTheme.crimson),
                  );
                }
              }
            },
            child: Text(l10n.commonSave),
          ),
        ],
      ),
    );
  }
}
