import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/async_states.dart';
import '../../../core/settings/app_settings.dart';
import '../../../app/themes.dart';
import '../../blocs/shop/shop_bloc.dart';

enum _ReportType {
  sales,
  inventory,
  profit,
  expenses,
  credit,
  loans,
  cashflow,
  employees,
  paymentMethods,
}

class _ReportPeriod {
  final DateTime from;
  final DateTime to;
  final String label;
  const _ReportPeriod(this.from, this.to, this.label);
}

class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key});

  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  final api = ApiClient();
  String _shopId = '';
  _ReportType _type = _ReportType.sales;
  late _ReportPeriod _period;
  Map<String, dynamic>? _result;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _period = _ReportPeriod(DateTime(now.year, now.month, 1), now, 'month');
    _resolveShop();
  }

  void _resolveShop() {
    final state = context.read<ShopBloc>().state;
    if (state is ShopLoaded) {
      _shopId = state.activeShopId ?? '';
      _loadReport();
    } else {
      context.read<ShopBloc>().add(LoadShops());
    }
  }

  String _dateStr(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _reportPath() {
    switch (_type) {
      case _ReportType.sales:
        return 'sales';
      case _ReportType.inventory:
        return 'inventory';
      case _ReportType.profit:
        return 'profit';
      case _ReportType.expenses:
        return 'expenses';
      case _ReportType.credit:
        return 'credit';
      case _ReportType.loans:
        return 'loans';
      case _ReportType.cashflow:
        return 'cashflow';
      case _ReportType.employees:
        return 'employees';
      case _ReportType.paymentMethods:
        return 'payment-methods';
    }
  }

  Future<void> _loadReport() async {
    if (_shopId.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final path = _reportPath();
    final isDated = _type != _ReportType.inventory &&
        _type != _ReportType.credit &&
        _type != _ReportType.loans;
    try {
      final res = await api.get('/shops/$_shopId/reports/$path', queryParameters: isDated ? {
        'from': _dateStr(_period.from),
        'to': _dateStr(_period.to),
      } : null);
      if (mounted) {
        setState(() {
        _result = res['data'] as Map<String, dynamic>? ?? {};
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return BlocListener<ShopBloc, ShopState>(
      listener: (context, state) {
        if (state is ShopLoaded && state.activeShopId != _shopId) {
          _shopId = state.activeShopId ?? '';
          _loadReport();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.reportsTitle),
          actions: [
            TextButton.icon(
              onPressed: () => _showPeriodPicker(l10n),
              icon: const Icon(Icons.date_range, color: Colors.white),
              label: Text(_periodLabel(l10n), style: const TextStyle(color: Colors.white)),
            ),
            IconButton(
              icon: const Icon(Icons.ios_share, color: Colors.white),
              tooltip: l10n.reportsExport,
              onPressed: _result == null ? null : () => _showExportSheet(l10n),
            ),
          ],
        ),
        body: Column(
          children: [
            _buildTypeSelector(l10n),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _loadReport,
                child: _buildBody(l10n),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _periodLabel(AppLocalizations l10n) {
    if (_period.label == 'month') return l10n.reportsThisMonth;
    if (_period.label == 'today') return l10n.reportsToday;
    if (_period.label == 'yesterday') return l10n.reportsYesterday;
    if (_period.label == 'week') return l10n.reportsThisWeek;
    if (_period.label == 'prevWeek') return l10n.reportsPreviousWeek;
    if (_period.label == 'year') return '${_period.from.year}';
    return '${_period.from.day}/${_period.from.month}/${_period.from.year} - ${_period.to.day}/${_period.to.month}/${_period.to.year}';
  }

  Widget _buildTypeSelector(AppLocalizations l10n) {
    final labels = <_ReportType, String>{
      _ReportType.sales: l10n.reportsSalesReport,
      _ReportType.profit: l10n.reportsProfitReport,
      _ReportType.expenses: l10n.reportsExpenseReport,
      _ReportType.inventory: l10n.reportsInventoryValuation,
      _ReportType.credit: l10n.reportsCreditReport,
      _ReportType.loans: l10n.reportsLoanReport,
      _ReportType.cashflow: l10n.reportsCashflowReport,
      _ReportType.employees: l10n.reportsEmployeeReport,
      _ReportType.paymentMethods: l10n.reportsPaymentMethodsReport,
    };
    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        children: labels.entries.map((e) {
          final selected = e.key == _type;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(e.value),
              selected: selected,
              onSelected: (_) {
                setState(() => _type = e.key);
                _loadReport();
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBody(AppLocalizations l10n) {
    if (_loading) return AsyncStateView.loading();
    if (_error != null) return AsyncStateView.error(context, l10n.reportsLoadError, onRetry: _loadReport);
    final result = _result;
    if (result == null) return AsyncStateView.empty(context, l10n.reportsNoData, icon: Icons.bar_chart);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSummary(l10n, result),
        const SizedBox(height: 24),
        _buildDataSection(l10n, result),
      ],
    );
  }

  Widget _buildSummary(AppLocalizations l10n, Map<String, dynamic> result) {
    final summary = result['summary'];
    if (summary is! Map) return const SizedBox.shrink();
    final cards = <_Card>[];
    String fmt(dynamic v) => AppSettings.instance.formatCurrency((v is num ? v : 0).toDouble());
    String numStr(dynamic v) => '${v ?? 0}';

    switch (_type) {
      case _ReportType.sales:
        cards.addAll([
          _Card(l10n.reportsTotalSales, fmt(summary['totalSales']), AppTheme.navy),
          _Card(l10n.reportsTransactions, numStr(summary['totalTransactions']), AppTheme.teal),
          _Card(l10n.reportsTotalItems, numStr(summary['totalItems']), AppTheme.gold),
          _Card(l10n.reportsAvgTicket, fmt(summary['averageTicket']), AppTheme.navy),
        ]);
        break;
      case _ReportType.inventory:
        cards.addAll([
          _Card(l10n.reportsTotalValue, fmt(summary['totalValue']), AppTheme.navy),
          _Card(l10n.reportsTotalRetailValue, fmt(summary['totalRetailValue']), AppTheme.teal),
          _Card(l10n.reportsTotalProducts, numStr(summary['totalProducts']), AppTheme.gold),
        ]);
        break;
      case _ReportType.profit:
        cards.addAll([
          _Card(l10n.reportsTotalRevenue, fmt(summary['totalRevenue']), AppTheme.navy),
          _Card(l10n.reportsTotalDiscounts, fmt(summary['totalDiscounts']), AppTheme.gold),
          _Card(l10n.reportsTotalExpenses, fmt(summary['totalExpenses']), AppTheme.crimson),
          _Card(l10n.reportsEstimatedProfit, fmt(summary['estimatedProfit']), AppTheme.teal),
        ]);
        break;
      case _ReportType.expenses:
        cards.addAll([
          _Card(l10n.reportsTotalExpenses, fmt(summary['totalExpenses']), AppTheme.crimson),
          _Card(l10n.reportsTransactions, numStr(summary['totalTransactions']), AppTheme.navy),
        ]);
        break;
      case _ReportType.credit:
        cards.addAll([
          _Card(l10n.reportsTotalOutstanding, fmt(summary['totalOutstanding']), AppTheme.crimson),
          _Card(l10n.reportsCustomersWithDebt, numStr(summary['customersWithDebt']), AppTheme.gold),
        ]);
        break;
      case _ReportType.loans:
        cards.addAll([
          _Card(l10n.reportsTotalBorrowed, fmt(summary['totalBorrowed']), AppTheme.navy),
          _Card(l10n.reportsTotalOutstanding, fmt(summary['totalOutstanding']), AppTheme.crimson),
          _Card(l10n.reportsTotalRepaid, fmt(summary['totalRepaid']), AppTheme.teal),
        ]);
        break;
      case _ReportType.cashflow:
        cards.addAll([
          _Card(l10n.reportsTotalInflow, fmt(summary['totalInflow']), AppTheme.teal),
          _Card(l10n.reportsTotalOutflow, fmt(summary['totalOutflow']), AppTheme.crimson),
          _Card(l10n.reportsNetCashFlow, fmt(summary['netCashFlow']), AppTheme.navy),
          _Card(l10n.reportsCreditCollections, fmt(summary['creditCollections']), AppTheme.gold),
        ]);
        break;
      case _ReportType.employees:
      case _ReportType.paymentMethods:
        break;
    }

    if (cards.isEmpty) return const SizedBox.shrink();
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: cards.map((c) => _summaryCard(c)).toList(),
    );
  }

  Widget _summaryCard(_Card c) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(c.title, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
          const SizedBox(height: 6),
          Text(c.value, style: TextStyle(color: c.color, fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildDataSection(AppLocalizations l10n, Map<String, dynamic> result) {
    switch (_type) {
      case _ReportType.sales:
        return _salesData(l10n, result['data']);
      case _ReportType.inventory:
        return _inventoryData(l10n, result['data']);
      case _ReportType.profit:
        return _categoryData(l10n, result['expensesByCategory'], l10n.reportsByCategory);
      case _ReportType.expenses:
        return _expensesData(l10n, result);
      case _ReportType.credit:
        return _creditData(l10n, result['data']);
      case _ReportType.loans:
        return _loansData(l10n, result['data']);
      case _ReportType.employees:
        return _employeesData(l10n, result['data']);
      case _ReportType.paymentMethods:
        return _paymentMethodsData(l10n, result['data']);
      case _ReportType.cashflow:
        return _cashflowData(l10n, result['data']);
    }
  }

  Widget _salesData(AppLocalizations l10n, dynamic data) {
    final sales = (data as List?) ?? [];
    if (sales.isEmpty) return _noData(l10n);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.reportsRecentSales, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
        const SizedBox(height: 8),
        ...sales.take(20).map((sale) {
          final grandTotal = ((sale['grandTotal'] ?? 0) as num).toDouble();
          final dt = DateTime.tryParse(sale['saleDate'] ?? '') ?? DateTime.now();
          return ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.receipt, color: AppTheme.teal),
            title: Text(sale['receiptNumber'] ?? 'N/A', style: const TextStyle(fontSize: 13)),
            subtitle: Text('${dt.day}/${dt.month}/${dt.year}', style: const TextStyle(fontSize: 11)),
            trailing: Text(AppSettings.instance.formatCurrency(grandTotal),
              style: const TextStyle(fontWeight: FontWeight.bold)),
          );
        }),
      ],
    );
  }

  Widget _inventoryData(AppLocalizations l10n, dynamic data) {
    final products = (data as List?) ?? [];
    if (products.isEmpty) return _noData(l10n);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: products.take(20).map((p) => ListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        title: Text(p['name'] ?? '', style: const TextStyle(fontSize: 13)),
        subtitle: Text('SKU: ${p['sku'] ?? '-'}  ·  ${l10n.inventoryInStock}: ${p['stockQuantity'] ?? 0}', style: const TextStyle(fontSize: 11)),
        trailing: Text(AppSettings.instance.formatCurrency(((p['totalValue'] ?? 0) as num).toDouble()),
          style: const TextStyle(fontWeight: FontWeight.bold)),
      )).toList(),
    );
  }

  Widget _categoryData(AppLocalizations l10n, dynamic data, String title) {
    final items = (data as List?) ?? [];
    if (items.isEmpty) return _noData(l10n);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
        const SizedBox(height: 8),
        ...items.map((c) => ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          title: Text(c['category'] ?? '', style: const TextStyle(fontSize: 13)),
          trailing: Text(AppSettings.instance.formatCurrency(((c['total'] ?? 0) as num).toDouble()),
            style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.crimson)),
        )),
      ],
    );
  }

  Widget _expensesData(AppLocalizations l10n, Map<String, dynamic> result) {
    return _categoryData(l10n, result['byCategory'], l10n.reportsByCategory);
  }

  Widget _creditData(AppLocalizations l10n, dynamic data) {
    final customers = (data as List?) ?? [];
    if (customers.isEmpty) return _noData(l10n);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: customers.take(20).map((c) => ListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.person, color: AppTheme.gold),
        title: Text(c['name'] ?? '', style: const TextStyle(fontSize: 13)),
        trailing: Text(AppSettings.instance.formatCurrency(((c['outstandingBalance'] ?? 0) as num).toDouble()),
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.crimson)),
      )).toList(),
    );
  }

  Widget _loansData(AppLocalizations l10n, dynamic data) {
    final loans = (data as List?) ?? [];
    if (loans.isEmpty) return _noData(l10n);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: loans.take(20).map((l) => ListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.account_balance, color: AppTheme.teal),
        title: Text(l['lender'] ?? '', style: const TextStyle(fontSize: 13)),
        trailing: Text(AppSettings.instance.formatCurrency(((l['remainingBalance'] ?? 0) as num).toDouble()),
          style: const TextStyle(fontWeight: FontWeight.bold)),
      )).toList(),
    );
  }

  Widget _employeesData(AppLocalizations l10n, dynamic data) {
    final employees = (data as List?) ?? [];
    if (employees.isEmpty) return _noData(l10n);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: employees.map((e) => ListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.person, color: AppTheme.navy),
        title: Text(e['name'] ?? '', style: const TextStyle(fontSize: 13)),
        subtitle: Text(e['role'] ?? '', style: const TextStyle(fontSize: 11)),
        trailing: Text(AppSettings.instance.formatCurrency(((e['totalSales'] ?? 0) as num).toDouble()),
          style: const TextStyle(fontWeight: FontWeight.bold)),
      )).toList(),
    );
  }

  Widget _paymentMethodsData(AppLocalizations l10n, dynamic data) {
    final map = (data as Map?) ?? {};
    if (map.isEmpty) return _noData(l10n);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: map.entries.map((e) => ListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.payment, color: AppTheme.teal),
        title: Text(e.key, style: const TextStyle(fontSize: 13)),
        trailing: Text(AppSettings.instance.formatCurrency(((e.value ?? 0) as num).toDouble()),
          style: const TextStyle(fontWeight: FontWeight.bold)),
      )).toList(),
    );
  }

  Widget _cashflowData(AppLocalizations l10n, dynamic data) {
    final rows = (data as List?) ?? [];
    if (rows.isEmpty) return _noData(l10n);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: rows.take(31).map((row) {
        final inflow = ((row['inflow'] ?? row['income'] ?? 0) as num).toDouble();
        final outflow = ((row['outflow'] ?? row['expenses'] ?? 0) as num).toDouble();
        final net = ((row['net'] ?? row['netCashFlow'] ?? inflow - outflow) as num).toDouble();
        return ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.account_balance_wallet, color: AppTheme.teal),
          title: Text(row['date']?.toString() ?? row['period']?.toString() ?? '', style: const TextStyle(fontSize: 13)),
          subtitle: Text(
            '${l10n.reportsTotalInflow}: ${AppSettings.instance.formatCurrency(inflow)} · '
            '${l10n.reportsTotalOutflow}: ${AppSettings.instance.formatCurrency(outflow)}',
            style: const TextStyle(fontSize: 11),
          ),
          trailing: Text(
            AppSettings.instance.formatCurrency(net),
            style: TextStyle(fontWeight: FontWeight.bold, color: net >= 0 ? AppTheme.teal : AppTheme.crimson),
          ),
        );
      }).toList(),
    );
  }

  Widget _noData(AppLocalizations l10n) {
    return Center(child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(l10n.reportsNoData, style: const TextStyle(color: AppTheme.textSecondary)),
    ));
  }

  void _showExportSheet(AppLocalizations l10n) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
              child: Text(l10n.reportsChooseFormat,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf, color: AppTheme.crimson),
              title: Text(l10n.reportsExportPdf),
              onTap: () {
                Navigator.pop(ctx);
                _export('pdf');
              },
            ),
            ListTile(
              leading: const Icon(Icons.table_chart, color: AppTheme.teal),
              title: Text(l10n.reportsExportExcel),
              onTap: () {
                Navigator.pop(ctx);
                _export('xlsx');
              },
            ),
            ListTile(
              leading: const Icon(Icons.description, color: AppTheme.navy),
              title: Text(l10n.reportsExportCsv),
              onTap: () {
                Navigator.pop(ctx);
                _export('csv');
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _export(String format) async {
    final l10n = AppLocalizations.of(context);
    if (_shopId.isEmpty) return;
    final path = _reportPath();
    final isDated = _type != _ReportType.inventory &&
        _type != _ReportType.credit &&
        _type != _ReportType.loans;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.reportsExporting), backgroundColor: AppTheme.navy),
    );

    try {
      final bytes = await api.downloadBytes(
        '/shops/$_shopId/reports/$path/export',
        queryParameters: {
          'format': format,
          if (isDated) 'from': _dateStr(_period.from),
          if (isDated) 'to': _dateStr(_period.to),
        },
      );
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/mwaminifu_${_type.name}_${DateTime.now().millisecondsSinceEpoch}.$format');
      await file.writeAsBytes(bytes);
      if (!mounted) return;
      await Share.shareXFiles([XFile(file.path)]);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.reportsExportError), backgroundColor: AppTheme.crimson),
        );
      }
    }
  }

  Future<void> _showPeriodPicker(AppLocalizations l10n) async {
    final selected = await showModalBottomSheet<_ReportPeriod>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _PeriodPickerSheet(l10n: l10n),
    );
    if (selected != null) {
      setState(() => _period = selected);
      _loadReport();
    }
  }
}

class _Card {
  final String title;
  final String value;
  final Color color;
  _Card(this.title, this.value, this.color);
}

class _PeriodPickerSheet extends StatefulWidget {
  final AppLocalizations l10n;
  const _PeriodPickerSheet({required this.l10n});

  @override
  State<_PeriodPickerSheet> createState() => _PeriodPickerSheetState();
}

class _PeriodPickerSheetState extends State<_PeriodPickerSheet> {
  int _fromMonth = 0;
  int _fromYear = 2024;
  int _toMonth = 0;
  int _toYear = 2026;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _toMonth = now.month - 1;
    _toYear = now.year;
    _fromMonth = now.month - 1;
    _fromYear = now.year;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = widget.l10n;
    final now = DateTime.now();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final years = List.generate(7, (i) => now.year - 3 + i);

    return Padding(
      padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.reportsSelectPeriod, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _chip(l10n.reportsToday, () => _presetToday(now)),
              _chip(l10n.reportsYesterday, () => _presetYesterday(now)),
              _chip(l10n.reportsThisWeek, () => _presetThisWeek(now)),
              _chip(l10n.reportsPreviousWeek, () => _presetPrevWeek(now)),
              _chip(l10n.reportsThisMonth, () => _presetThisMonth(now)),
              _chip(l10n.reportsYearly, () => _presetThisYear(now)),
            ],
          ),
          const SizedBox(height: 20),
          Text(l10n.reportsMonthly, style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.navy)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _monthYearDropdown(_fromMonth, _fromYear, months, years, (m, y) => setState(() { _fromMonth = m; _fromYear = y; }))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(l10n.reportsTo, style: const TextStyle(color: AppTheme.textSecondary)),
              ),
              Expanded(child: _monthYearDropdown(_toMonth, _toYear, months, years, (m, y) => setState(() { _toMonth = m; _toYear = y; }))),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () {
                final from = DateTime(_fromYear, _fromMonth + 1, 1);
                final to = DateTime(_toYear, _toMonth + 1, 1);
                final toEnd = DateTime(to.year, to.month + 1, 0);
                Navigator.pop(context, _ReportPeriod(from, toEnd, 'monthRange'));
              },
              child: Text(l10n.commonConfirm),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () async {
                final range = await showDateRangePicker(
                  context: context,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                  builder: (context, child) => Theme(
                    data: Theme.of(context).copyWith(colorScheme: const ColorScheme.light(primary: AppTheme.navy)),
                    child: child!,
                  ),
                );
                if (!context.mounted) return;
                if (range != null) {
                  Navigator.pop(context, _ReportPeriod(range.start, range.end, 'custom'));
                }
              },
              child: Text(l10n.reportsCustom),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, VoidCallback onTap) {
    return ActionChip(label: Text(label), onPressed: onTap);
  }

  void _presetToday(DateTime now) {
    Navigator.pop(context, _ReportPeriod(DateTime(now.year, now.month, now.day), now, 'today'));
  }

  void _presetYesterday(DateTime now) {
    final y = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 1));
    Navigator.pop(context, _ReportPeriod(y, DateTime(y.year, y.month, y.day, 23, 59, 59), 'yesterday'));
  }

  void _presetThisWeek(DateTime now) {
    final monday = now.subtract(Duration(days: now.weekday - 1));
    Navigator.pop(context, _ReportPeriod(DateTime(monday.year, monday.month, monday.day), now, 'week'));
  }

  void _presetPrevWeek(DateTime now) {
    final thisMonday = now.subtract(Duration(days: now.weekday - 1));
    final prevMonday = thisMonday.subtract(const Duration(days: 7));
    final prevSunday = prevMonday.add(const Duration(days: 6));
    Navigator.pop(context, _ReportPeriod(DateTime(prevMonday.year, prevMonday.month, prevMonday.day),
        DateTime(prevSunday.year, prevSunday.month, prevSunday.day, 23, 59, 59), 'prevWeek'));
  }

  void _presetThisMonth(DateTime now) {
    Navigator.pop(context, _ReportPeriod(DateTime(now.year, now.month, 1), now, 'month'));
  }

  void _presetThisYear(DateTime now) {
    Navigator.pop(context, _ReportPeriod(DateTime(now.year, 1, 1), now, 'year'));
  }

  Widget _monthYearDropdown(int month, int year, List<String> months, List<int> years,
      void Function(int, int) onChanged) {
    return Row(
      children: [
        Expanded(
          child: DropdownButton<int>(
            value: month,
            isExpanded: true,
            items: List.generate(12, (i) => DropdownMenuItem(value: i, child: Text(months[i]))),
            onChanged: (m) => onChanged(m ?? month, year),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: DropdownButton<int>(
            value: year,
            isExpanded: true,
            items: years.map((y) => DropdownMenuItem(value: y, child: Text('$y'))).toList(),
            onChanged: (y) => onChanged(month, y ?? year),
          ),
        ),
      ],
    );
  }
}
