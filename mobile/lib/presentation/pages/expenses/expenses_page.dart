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

class ExpensesPage extends StatefulWidget {
  const ExpensesPage({super.key});

  @override
  State<ExpensesPage> createState() => _ExpensesPageState();
}

class _ExpensesPageState extends State<ExpensesPage> {
  final api = ApiClient();
  String _shopId = '';
  List<dynamic> _expenses = [];
  bool _loading = true;
  String? _error;

  bool get _canWrite =>
      context.read<AuthBloc>().hasPermission(Permission.expensesWrite);

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
      final res = await api.get('/shops/$shopId/expenses');
      if (mounted) {
        setState(() {
        _expenses = res['data'] as List? ?? [];
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

  double get _total => _expenses.fold(0, (s, e) => s + ((e['amount'] ?? 0) as num).toDouble());

  String _date(String d) {
    final dt = DateTime.tryParse(d);
    if (dt == null) return '';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return BlocListener<ShopBloc, ShopState>(
      listener: (context, state) {
        if (state is ShopLoaded) _load(state.activeShopId);
      },
      child: Scaffold(
        appBar: AppBar(title: Text(l10n.expensesTitle)),
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
    if (_expenses.isEmpty) {
      return AsyncStateView.empty(context, l10n.expensesNoExpenses, icon: Icons.money_off);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _expenses.length + 1,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, i) {
        if (i == 0) {
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.navy,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(l10n.expensesTotal, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                Text(_fmt(_total), style: const TextStyle(color: AppTheme.gold, fontWeight: FontWeight.bold, fontSize: 18)),
              ],
            ),
          );
        }
        final e = _expenses[i - 1];
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: AppTheme.crimson.withValues(alpha: 0.1),
            child: const Icon(Icons.money_off, color: AppTheme.crimson, size: 20),
          ),
          title: Text(e['category'] ?? 'Expense', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.navy)),
          subtitle: Text('${_date(e['expenseDate'] ?? '')}  ·  ${e['user']?['name'] ?? '—'}'),
          trailing: Text(_fmt(e['amount']), style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.crimson)),
          onTap: _canWrite ? () => _showForm(l10n, expense: e) : null,
        );
      },
    );
  }

  void _showForm(AppLocalizations l10n, {Map<String, dynamic>? expense}) {
    final categoryCtrl = TextEditingController(text: expense?['category'] ?? '');
    final amountCtrl = TextEditingController(text: expense != null ? expense['amount'].toString() : '');
    final descCtrl = TextEditingController(text: expense?['description'] ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(expense == null ? l10n.expensesAddExpense : l10n.expensesEditExpense,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 16),
            TextField(controller: categoryCtrl, decoration: InputDecoration(labelText: '${l10n.expensesCategory} *'), autofocus: true),
            const SizedBox(height: 12),
            TextField(controller: amountCtrl, decoration: InputDecoration(labelText: '${l10n.expensesAmount} *'), keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            TextField(controller: descCtrl, decoration: InputDecoration(labelText: l10n.expensesDescription)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  if (categoryCtrl.text.isEmpty || amountCtrl.text.isEmpty) return;
                  final payload = {
                    'category': categoryCtrl.text,
                    'amount': double.tryParse(amountCtrl.text) ?? 0,
                    'description': descCtrl.text,
                  };
                  try {
                    if (expense == null) {
                      await api.post('/shops/$_shopId/expenses', data: payload);
                    } else {
                      await api.put('/expenses/${expense['id']}', data: payload);
                    }
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    await _load(_shopId);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(expense == null ? l10n.expensesExpenseRecorded : l10n.expensesExpenseUpdated),
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
                child: Text(l10n.expensesSaveExpense, style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
