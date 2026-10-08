import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/app_error.dart';
import '../../../core/widgets/async_states.dart';
import '../../../core/settings/app_settings.dart';
import '../../../app/themes.dart';
import '../../blocs/shop/shop_bloc.dart';

class LoansPage extends StatefulWidget {
  const LoansPage({super.key});

  @override
  State<LoansPage> createState() => _LoansPageState();
}

class _LoansPageState extends State<LoansPage> {
  final api = ApiClient();
  String _shopId = '';
  List<dynamic> _loans = [];
  bool _loading = true;
  String? _error;

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
      final res = await api.get('/shops/$shopId/loans');
      if (mounted) {
        setState(() {
        _loans = res['data'] as List? ?? [];
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
        appBar: AppBar(title: Text(l10n.loansTitle)),
        body: RefreshIndicator(
          onRefresh: () => _load(_shopId),
          child: _buildBody(l10n),
        ),
        floatingActionButton: FloatingActionButton(
          backgroundColor: AppTheme.gold,
          onPressed: () => _showAddDialog(l10n),
          child: const Icon(Icons.add, color: AppTheme.navy),
        ),
      ),
    );
  }

  Widget _buildBody(AppLocalizations l10n) {
    if (_loading) return AsyncStateView.loading();
    if (_error != null) return AsyncStateView.error(context, l10n.errorGeneric, onRetry: () => _load(_shopId));
    if (_loans.isEmpty) {
      return AsyncStateView.empty(context, l10n.loansNoLoans, icon: Icons.account_balance);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _loans.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final l = _loans[i];
        final status = l['status'] ?? 'ACTIVE';
        final remaining = (l['remainingBalance'] ?? 0) as num;
        final isActive = status == 'ACTIVE';
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: isActive ? AppTheme.gold.withValues(alpha: 0.15) : AppTheme.teal.withValues(alpha: 0.15),
            child: Icon(isActive ? Icons.account_balance : Icons.check_circle,
              color: isActive ? AppTheme.gold : AppTheme.teal, size: 20),
          ),
          title: Text(l['lender'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.navy)),
          subtitle: Text(
            '${l10n.loansBalance}: ${_fmt(remaining)}  ·  ${isActive ? l10n.loansActive : l10n.loansPaid}',
            style: TextStyle(fontSize: 12, color: isActive ? AppTheme.crimson : AppTheme.teal),
          ),
          trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary, size: 20),
          onTap: () => _showDetail(l, l10n),
        );
      },
    );
  }

  void _showAddDialog(AppLocalizations l10n) {
    final lenderCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final interestCtrl = TextEditingController();
    final dueDateCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(l10n.loansAddLoan, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 16),
            TextField(controller: lenderCtrl, decoration: InputDecoration(labelText: '${l10n.loansLender} *'), autofocus: true),
            const SizedBox(height: 12),
            TextField(controller: amountCtrl, decoration: InputDecoration(labelText: '${l10n.loansAmount} *'), keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: TextField(controller: interestCtrl, decoration: InputDecoration(labelText: l10n.loansInterest), keyboardType: TextInputType.number)),
                const SizedBox(width: 12),
                Expanded(child: TextField(controller: dueDateCtrl, decoration: InputDecoration(labelText: '${l10n.loansDueDate} (yyyy-mm-dd)'))),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  if (lenderCtrl.text.isEmpty || amountCtrl.text.isEmpty) return;
                  try {
                    await api.post('/shops/$_shopId/loans', data: {
                      'lender': lenderCtrl.text,
                      'amount': double.tryParse(amountCtrl.text) ?? 0,
                      'interestRate': double.tryParse(interestCtrl.text) ?? 0,
                      'dueDate': dueDateCtrl.text.isNotEmpty ? dueDateCtrl.text : null,
                    });
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    await _load(_shopId);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.loansLoanCreated), backgroundColor: AppTheme.teal),
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
                child: Text(l10n.loansSaveLoan, style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showDetail(Map<String, dynamic> loan, AppLocalizations l10n) async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(loan['lender'] ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 8),
            Text('${l10n.loansAmount}: ${_fmt(loan['amount'])}', style: const TextStyle(color: AppTheme.textSecondary)),
            Text('${l10n.loansRemaining}: ${_fmt(loan['remainingBalance'])}', style: const TextStyle(color: AppTheme.crimson, fontWeight: FontWeight.bold)),
            if (loan['dueDate'] != null)
              Text('${l10n.loansDueDate}: ${(loan['dueDate'] as String).split('T').first}', style: const TextStyle(color: AppTheme.textSecondary)),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.teal),
                onPressed: () => _showRepayDialog(ctx, loan, l10n),
                child: Text(l10n.loansRecordRepayment),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showRepayDialog(BuildContext parentCtx, Map<String, dynamic> loan, AppLocalizations l10n) {
    final amountCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.loansRecordRepayment),
        content: TextField(
          controller: amountCtrl,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: InputDecoration(
            labelText: l10n.loansAmount,
            prefixText: '${l10n.loansRemaining}: ${_fmt(loan['remainingBalance'])}\n',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.commonCancel)),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountCtrl.text);
              if (amount == null || amount <= 0) return;
              try {
                await api.post('/loans/${loan['id']}/repay', data: {'amount': amount});
                if (!ctx.mounted || !parentCtx.mounted) return;
                Navigator.pop(ctx);
                Navigator.pop(parentCtx);
                await _load(_shopId);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.loansRepaymentRecorded), backgroundColor: AppTheme.teal),
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
