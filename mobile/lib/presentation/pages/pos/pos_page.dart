import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:share_plus/share_plus.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/product/product_bloc.dart';
import '../../blocs/shop/shop_bloc.dart';
import '../../../core/network/api_client.dart';
import '../../../core/offline/offline_queue.dart';
import '../../../core/utils/network_utils.dart';
import '../../../core/utils/app_error.dart';
import '../../../core/settings/app_settings.dart';
import '../../../app/themes.dart';
import '../../../data/models/models.dart';

class PosPage extends StatefulWidget {
  const PosPage({super.key});

  @override
  State<PosPage> createState() => _PosPageState();
}

class _PosPageState extends State<PosPage> {
  final List<CartItem> _cart = [];
  String _shopId = '';
  Map<String, dynamic>? _customer;

  @override
  void initState() {
    super.initState();
    _loadShop();
  }

  Future<void> _loadShop() async {
    final shopState = context.read<ShopBloc>().state;
    String? shopId;
    if (shopState is ShopLoaded) {
      shopId = shopState.activeShopId;
    }
    if (shopId == null || shopId.isEmpty) return;
    _shopId = shopId;
    if (mounted) {
      context.read<ProductBloc>().add(LoadProducts(_shopId));
    }
  }

  double get _total => _cart.fold(0, (s, i) => s + i.total);

  void _addToCart(ProductModel product) {
    setState(() {
      final idx = _cart.indexWhere((c) => c.product.id == product.id);
      if (idx >= 0) {
        _cart[idx].quantity++;
      } else {
        _cart.add(CartItem(product: product, unitPrice: product.sellingPrice));
      }
    });
  }

  void _changeQuantity(int index, int delta) {
    setState(() {
      final next = _cart[index].quantity + delta;
      if (next < 1) {
        _cart.removeAt(index);
      } else {
        _cart[index].quantity = next;
      }
    });
  }

  List<Map<String, dynamic>> _buildItems() {
    return _cart.map((c) => {
      'productId': c.product.id,
      'quantity': c.quantity,
      'unit': c.product.unit,
    }).toList();
  }

  List<Map<String, dynamic>> _buildOfflineItems() {
    return _cart.map((c) => {
      'productId': c.product.id,
      'quantity': c.quantity,
      'unit': c.product.unit,
      'unitPrice': c.unitPrice,
      'total': c.total,
    }).toList();
  }

  Future<void> _checkout() async {
    if (_cart.isEmpty || _shopId.isEmpty) return;
    final l10n = AppLocalizations.of(context);
    final userId = context.read<AuthBloc>().currentUser?.id;
    final result = await _showPaymentSheet();
    if (result == null || !mounted) return;

    final method = result['method'] as String;
    final items = _buildItems();

    final api = ApiClient();
    try {
      final res = await api.post('/shops/$_shopId/sales', data: {
        'items': items,
        'customerId': _customer?['id'],
        'payments': [
          {'method': method, 'amount': _total},
        ],
      });
      final sale = res['data'] as Map<String, dynamic>? ?? {};
      setState(() {
        _cart.clear();
        _customer = null;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.posSaleCompleted), backgroundColor: AppTheme.teal),
        );
        _showReceipt(sale);
        context.read<ProductBloc>().add(LoadProducts(_shopId));
      }
    } catch (e) {
      if (isOfflineError(e)) {
        await OfflineQueue.instance.add('sales', {
          'shopId': _shopId,
          'userId': userId,
          'customerId': _customer?['id'],
          'items': _buildOfflineItems(),
          'payments': [
            {'method': method, 'amount': _total},
          ],
          'paymentDetails': [
            {'method': method, 'amount': _total},
          ],
          'totalAmount': _total,
          'grandTotal': _total,
          'paymentMethod': method,
          'status': 'COMPLETED',
        });
        setState(() {
          _cart.clear();
          _customer = null;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(l10n.posNoNetwork), backgroundColor: AppTheme.gold),
          );
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(e, l10n)), backgroundColor: AppTheme.crimson),
        );
      }
    }
  }

  Future<Map<String, dynamic>?> _showPaymentSheet() async {
    final l10n = AppLocalizations.of(context);
    String method = 'cash';
    final tenderedCtrl = TextEditingController(text: _total.toStringAsFixed(0));

    return showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.posPaymentMethod, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
              const SizedBox(height: 8),
              Row(
                children: [
                  _methodChip(l10n.posCash, 'cash', method, setSheetState, (v) => method = v),
                  const SizedBox(width: 8),
                  _methodChip(l10n.posMobileMoney, 'mpesa', method, setSheetState, (v) => method = v),
                  const SizedBox(width: 8),
                  _methodChip(l10n.posCredit, 'credit', method, setSheetState, (v) => method = v),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(l10n.posTotal, style: const TextStyle(fontSize: 16, color: AppTheme.textSecondary)),
                  Text(AppSettings.instance.formatCurrency(_total),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.navy)),
                ],
              ),
              if (method == 'cash') ...[
                const SizedBox(height: 16),
                TextField(
                  controller: tenderedCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: l10n.posTendered),
                  onChanged: (_) => setSheetState(() {}),
                ),
                const SizedBox(height: 8),
                Text(
                  '${l10n.posChange}: ${AppSettings.instance.formatCurrency(_changeFor(tenderedCtrl.text))}',
                  style: const TextStyle(color: AppTheme.teal, fontWeight: FontWeight.w600),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.gold, foregroundColor: AppTheme.navy),
                  onPressed: () {
                    final tendered = double.tryParse(tenderedCtrl.text) ?? _total;
                    if (method == 'cash' && tendered < _total) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        SnackBar(content: Text(l10n.posPaymentInsufficient), backgroundColor: AppTheme.crimson),
                      );
                      return;
                    }
                    Navigator.pop(ctx, {'method': method, 'tendered': tendered});
                  },
                  child: Text(l10n.posCompleteSale, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  double _changeFor(String tenderedText) {
    final tendered = double.tryParse(tenderedText) ?? 0;
    return (tendered - _total).clamp(0, double.infinity).toDouble();
  }

  Widget _methodChip(String label, String value, String selected,
      StateSetter setSheetState, void Function(String) onChanged) {
    final isSelected = selected == value;
    return Expanded(
      child: Material(
        color: isSelected ? AppTheme.navy : Colors.white,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: isSelected ? AppTheme.navy : const Color(0xFFE2E8F0)),
        ),
        child: InkWell(
          onTap: () {
            onChanged(value);
            setSheetState(() {});
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Text(label, textAlign: TextAlign.center,
              style: TextStyle(color: isSelected ? Colors.white : AppTheme.textPrimary, fontSize: 13)),
          ),
        ),
      ),
    );
  }

  Future<void> _showReceipt(Map<String, dynamic> sale) async {
    final l10n = AppLocalizations.of(context);
    final shop = context.read<ShopBloc>().state is ShopLoaded
        ? (context.read<ShopBloc>().state as ShopLoaded).activeShop
        : null;
    final receiptText = _buildReceiptText(sale, shop?.name ?? '');

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
            Text(l10n.posReceipt, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Text(receiptText, style: const TextStyle(fontSize: 13, height: 1.5)),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.share),
                onPressed: () => Share.share(receiptText),
                label: Text(l10n.posShareReceipt),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _buildReceiptText(Map<String, dynamic> sale, String shopName) {
    final items = (sale['items'] as List?) ?? [];
    final buffer = StringBuffer();
    buffer.writeln(shopName);
    buffer.writeln('${AppLocalizations.of(context).posReceipt}: ${sale['receiptNumber'] ?? ''}');
    buffer.writeln('${sale['saleDate'] ?? ''}'.split('T').first);
    buffer.writeln('--------------------------------');
    for (final item in items) {
      final name = item['product']?['name'] ?? item['name'] ?? '';
      buffer.writeln('${item['quantity']} x $name  ${AppSettings.instance.formatCurrency((item['total'] ?? 0).toDouble())}');
    }
    buffer.writeln('--------------------------------');
    buffer.writeln('${AppLocalizations.of(context).posTotal}: ${AppSettings.instance.formatCurrency((sale['grandTotal'] ?? 0).toDouble())}');
    return buffer.toString();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.posTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_search),
            onPressed: () => _selectCustomer(l10n),
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => showSearch(
              context: context,
              delegate: _ProductSearchDelegate(context.read<ProductBloc>(), _shopId, _addToCart),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: BlocBuilder<ProductBloc, ProductState>(
              builder: (context, state) {
                if (state is ProductLoading) {
                  return const Center(child: CircularProgressIndicator(color: AppTheme.teal));
                }
                if (state is ProductError) {
                  return Center(child: Text(state.message, style: const TextStyle(color: AppTheme.textSecondary)));
                }
                if (state is ProductsLoaded) {
                  if (state.products.isEmpty) {
                    return Center(child: Text(l10n.posNoProducts, style: const TextStyle(color: AppTheme.textSecondary)));
                  }
                  return RepaintBoundary(
                    child: GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        childAspectRatio: 0.8,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemCount: state.products.length,
                      itemBuilder: (context, index) {
                        final product = state.products[index];
                        return Material(
                          color: Colors.white,
                          clipBehavior: Clip.antiAlias,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          child: InkWell(
                            onTap: () => _addToCart(product),
                            child: Padding(
                              padding: const EdgeInsets.all(8),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(product.isLowStock ? Icons.warning : Icons.inventory,
                                    color: product.isLowStock ? AppTheme.crimson : AppTheme.teal),
                                  const SizedBox(height: 6),
                                  Text(product.name, textAlign: TextAlign.center,
                                    maxLines: 2, overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
                                  const SizedBox(height: 4),
                                  Text(AppSettings.instance.formatCurrency(product.sellingPrice),
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.gold)),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  );
                }
                return Center(child: Text(l10n.commonLoading, style: const TextStyle(color: AppTheme.textSecondary)));
              },
            ),
          ),
          Container(height: 1, color: const Color(0xFFE2E8F0)),
          Expanded(
            flex: 2,
            child: Container(
              color: Colors.white,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('${l10n.posCart} (${_cart.length})',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.navy)),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('${l10n.posTotal}: ${AppSettings.instance.formatCurrency(_total)}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.navy)),
                            if (_customer != null)
                              Text(_customer!['name'] ?? '', style: const TextStyle(fontSize: 11, color: AppTheme.teal)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: _cart.isEmpty
                        ? Center(child: Text(l10n.posTapProducts,
                            style: const TextStyle(color: AppTheme.textSecondary)))
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _cart.length,
                            itemBuilder: (context, i) {
                              final item = _cart[i];
                              return ListTile(
                                dense: true,
                                contentPadding: EdgeInsets.zero,
                                leading: CircleAvatar(
                                  backgroundColor: AppTheme.navy.withValues(alpha: 0.1),
                                  child: Text('${item.quantity}', style: const TextStyle(color: AppTheme.navy, fontWeight: FontWeight.bold)),
                                ),
                                title: Text(item.product.name, style: const TextStyle(fontSize: 13)),
                                subtitle: Text(AppSettings.instance.formatCurrency(item.total)),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(icon: const Icon(Icons.add_circle, color: AppTheme.teal, size: 22), onPressed: () => _changeQuantity(i, 1)),
                                    IconButton(icon: const Icon(Icons.remove_circle, color: AppTheme.crimson, size: 22), onPressed: () => _changeQuantity(i, -1)),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                  if (_cart.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.gold,
                            foregroundColor: AppTheme.navy,
                          ),
                          onPressed: _checkout,
                          child: Text(l10n.posCompleteSale, style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold,
                          )),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _selectCustomer(AppLocalizations l10n) async {
    if (_shopId.isEmpty) return;
    List<dynamic> customers = [];
    try {
      final res = await ApiClient().get('/shops/$_shopId/customers');
      customers = res['data'] as List? ?? [];
    } catch (_) {}

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          ListTile(
            leading: const Icon(Icons.person_off, color: AppTheme.textSecondary),
            title: Text(l10n.posNoCustomer),
            onTap: () {
              setState(() => _customer = null);
              Navigator.pop(ctx);
            },
          ),
          ...customers.map((c) => ListTile(
            leading: const Icon(Icons.person, color: AppTheme.teal),
            title: Text(c['name'] ?? ''),
            subtitle: Text(c['phone'] ?? '', style: const TextStyle(fontSize: 11)),
            onTap: () {
              setState(() => _customer = c as Map<String, dynamic>);
              Navigator.pop(ctx);
            },
          )),
        ],
      ),
    );
  }
}

class _ProductSearchDelegate extends SearchDelegate {
  final ProductBloc bloc;
  final String shopId;
  final Function(ProductModel) onAdd;

  _ProductSearchDelegate(this.bloc, this.shopId, this.onAdd);

  @override
  List<Widget> buildActions(BuildContext context) => [
    if (query.isNotEmpty)
      IconButton(icon: const Icon(Icons.clear), onPressed: () => query = ''),
  ];

  @override
  Widget buildLeading(BuildContext context) => IconButton(
    icon: const Icon(Icons.arrow_back),
    onPressed: () => close(context, null),
  );

  @override
  Widget buildResults(BuildContext context) {
    bloc.add(SearchProducts(shopId, query));
    final l10n = AppLocalizations.of(context);
    return BlocBuilder<ProductBloc, ProductState>(
      bloc: bloc,
      builder: (context, state) {
        if (state is ProductsLoaded) {
          return ListView.builder(
            itemCount: state.products.length,
            itemBuilder: (context, i) {
              final p = state.products[i];
              return ListTile(
                leading: const Icon(Icons.inventory, color: AppTheme.teal),
                title: Text(p.name),
                subtitle: Text(AppSettings.instance.formatCurrency(p.sellingPrice)),
                trailing: TextButton(
                  onPressed: () {
                    onAdd(p);
                    close(context, null);
                  },
                  child: Text(l10n.posAdd, style: const TextStyle(color: AppTheme.teal)),
                ),
              );
            },
          );
        }
        return const Center(child: CircularProgressIndicator());
      },
    );
  }

  @override
  Widget buildSuggestions(BuildContext context) => buildResults(context);
}
