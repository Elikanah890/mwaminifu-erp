import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/product/product_bloc.dart';
import '../../blocs/shop/shop_bloc.dart';
import '../../../core/network/api_client.dart';
import '../../../core/permissions/permissions.dart';
import '../../../core/utils/app_error.dart';
import '../../../core/widgets/async_states.dart';
import '../../../core/settings/app_settings.dart';
import '../../../app/themes.dart';
import '../../../data/models/models.dart';

class InventoryPage extends StatefulWidget {
  const InventoryPage({super.key});

  @override
  State<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends State<InventoryPage> {
  final api = ApiClient();
  String _shopId = '';
  bool _lowStockOnly = false;

  bool get _canWrite =>
      context.read<AuthBloc>().hasPermission(Permission.inventoryWrite);

  @override
  void initState() {
    super.initState();
    _resolveShop();
  }

  void _resolveShop() {
    final state = context.read<ShopBloc>().state;
    if (state is ShopLoaded) {
      _loadProducts(state.activeShopId);
    } else {
      context.read<ShopBloc>().add(LoadShops());
    }
  }

  void _loadProducts(String? shopId) {
    if (shopId == null || shopId.isEmpty) return;
    _shopId = shopId;
    context.read<ProductBloc>().add(LoadProducts(shopId, lowStock: _lowStockOnly));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return BlocListener<ShopBloc, ShopState>(
      listener: (context, state) {
        if (state is ShopLoaded) _loadProducts(state.activeShopId);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.inventoryTitle),
          actions: [
            IconButton(
              icon: Icon(_lowStockOnly ? Icons.warning_amber : Icons.warning_amber_outlined, color: Colors.white),
              tooltip: l10n.inventoryLowStock,
              onPressed: () {
                setState(() => _lowStockOnly = !_lowStockOnly);
                _loadProducts(_shopId);
              },
            ),
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: () => _showSearchDialog(l10n),
            ),
            PopupMenuButton<String>(
              onSelected: (v) {
                if (v == 'categories') _showCategories(l10n);
                if (v == 'value') _showStockValue(l10n);
              },
              itemBuilder: (context) => [
                PopupMenuItem(value: 'categories', child: Text(l10n.inventoryCategories)),
                PopupMenuItem(value: 'value', child: Text(l10n.inventoryStockValue)),
              ],
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () async => _loadProducts(_shopId),
          child: BlocBuilder<ProductBloc, ProductState>(
            builder: (context, state) {
              if (state is ProductLoading) return AsyncStateView.loading();
              if (state is ProductError) {
                return AsyncStateView.error(context, state.message, onRetry: () => _loadProducts(_shopId));
              }
              if (state is ProductsLoaded) {
                if (state.products.isEmpty) {
                  return AsyncStateView.empty(context, l10n.inventoryNoProducts, icon: Icons.inventory_2_outlined);
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: state.products.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final p = state.products[index];
                    return _ProductTile(product: p, onTap: () => _showProductActions(l10n, p));
                  },
                );
              }
              return Center(child: Text(l10n.commonLoading, style: const TextStyle(color: AppTheme.textSecondary)));
            },
          ),
        ),
        floatingActionButton: _canWrite
            ? FloatingActionButton(
                backgroundColor: AppTheme.gold,
                onPressed: () => _showProductDialog(l10n),
                child: const Icon(Icons.add, color: AppTheme.navy),
              )
            : null,
      ),
    );
  }

  void _showSearchDialog(AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.inventorySearchProducts),
        content: TextField(
          autofocus: true,
          decoration: InputDecoration(
            hintText: l10n.inventorySearchHint,
            prefixIcon: const Icon(Icons.search, color: AppTheme.teal),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          onSubmitted: (v) {
            if (_shopId.isNotEmpty) {
              context.read<ProductBloc>().add(SearchProducts(_shopId, v));
            }
            Navigator.pop(ctx);
          },
        ),
      ),
    );
  }

  Future<void> _showCategories(AppLocalizations l10n) async {
    if (_shopId.isEmpty) return;
    List<dynamic> categories = [];
    try {
      final res = await api.get('/shops/$_shopId/categories');
      categories = res['data'] as List? ?? [];
    } catch (_) {}

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(l10n.inventoryCategories, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
          ),
          ...categories.map((c) => ListTile(
            leading: const Icon(Icons.category, color: AppTheme.teal),
            title: Text(c['name'] ?? ''),
            subtitle: Text('${c['_count']?['products'] ?? 0}', style: const TextStyle(fontSize: 11)),
          )),
        ],
      ),
    );
  }

  Future<void> _showStockValue(AppLocalizations l10n) async {
    if (_shopId.isEmpty) return;
    try {
      final res = await api.get('/shops/$_shopId/inventory/valuation');
      final data = res['data'] ?? {};
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l10n.inventoryStockValue),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _valueRow(l10n.inventoryTotalValue, AppSettings.instance.formatCurrency((data['totalValue'] ?? 0).toDouble())),
              _valueRow(l10n.inventoryTotalProducts, '${data['totalProducts'] ?? 0}'),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.commonClose)),
          ],
        ),
      );
    } catch (_) {}
  }

  Widget _valueRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textSecondary)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.navy)),
        ],
      ),
    );
  }

  void _showProductActions(AppLocalizations l10n, ProductModel p) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.navy)),
            subtitle: Text('${l10n.inventoryInStock}: ${p.stockQuantity} ${p.unit}'),
          ),
          const Divider(height: 1),
          if (_canWrite) ...[
            ListTile(
              leading: const Icon(Icons.edit, color: AppTheme.teal),
              title: Text(l10n.inventoryEditProduct),
              onTap: () {
                Navigator.pop(ctx);
                _showProductDialog(l10n, product: p);
              },
            ),
            ListTile(
              leading: const Icon(Icons.swap_vert, color: AppTheme.gold),
              title: Text(l10n.inventoryAdjustStock),
              onTap: () {
                Navigator.pop(ctx);
                _showAdjustStockDialog(l10n, p);
              },
            ),
          ],
          ListTile(
            leading: const Icon(Icons.history, color: AppTheme.navy),
            title: Text(l10n.inventoryStockHistory),
            onTap: () {
              Navigator.pop(ctx);
              _showStockHistory(l10n, p);
            },
          ),
          if (_canWrite)
            ListTile(
              leading: const Icon(Icons.archive, color: AppTheme.crimson),
              title: Text(l10n.inventoryArchive),
              onTap: () {
                Navigator.pop(ctx);
                _archiveProduct(l10n, p);
              },
            ),
        ],
      ),
    );
  }

  Future<void> _archiveProduct(AppLocalizations l10n, ProductModel p) async {
    try {
      await api.delete('/products/${p.id}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.inventoryArchive), backgroundColor: AppTheme.teal),
        );
        _loadProducts(_shopId);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.errorGeneric), backgroundColor: AppTheme.crimson),
        );
      }
    }
  }

  Future<void> _showStockHistory(AppLocalizations l10n, ProductModel p) async {
    try {
      final res = await api.get('/products/${p.id}/stock-history');
      final data = res['data'] as Map? ?? {};
      final adjustments = data['adjustments'] as List? ?? [];
      if (!mounted) return;
      showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (ctx) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.inventoryStockHistory, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.navy)),
              const SizedBox(height: 12),
              if (adjustments.isEmpty)
                Text(l10n.reportsNoData, style: const TextStyle(color: AppTheme.textSecondary))
              else
                ...adjustments.take(20).map((a) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(a['quantityChange'] >= 0 ? Icons.add_circle : Icons.remove_circle,
                    color: (a['quantityChange'] ?? 0) >= 0 ? AppTheme.teal : AppTheme.crimson),
                  title: Text('${a['quantityChange']} · ${a['reason'] ?? ''}', style: const TextStyle(fontSize: 13)),
                  subtitle: Text(a['performer']?['name'] ?? '', style: const TextStyle(fontSize: 11)),
                )),
            ],
          ),
        ),
      );
    } catch (_) {}
  }

  void _showAdjustStockDialog(AppLocalizations l10n, ProductModel p) {
    final qtyCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.inventoryAdjustStock),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('${l10n.inventoryCurrentStock}: ${p.stockQuantity}', style: const TextStyle(color: AppTheme.textSecondary)),
            const SizedBox(height: 12),
            TextField(
              controller: qtyCtrl,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: InputDecoration(labelText: '${l10n.commonAmount} (+/-)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              decoration: InputDecoration(labelText: l10n.inventoryReason),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.commonCancel)),
          ElevatedButton(
            onPressed: () async {
              final change = int.tryParse(qtyCtrl.text);
              if (change == null || change == 0) return;
              try {
                await api.post('/products/${p.id}/adjust-stock', data: {
                  'quantityChange': change,
                  'reason': reasonCtrl.text.isNotEmpty ? reasonCtrl.text : l10n.inventoryAdjustStock,
                });
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l10n.inventoryStockAdjusted), backgroundColor: AppTheme.teal),
                  );
                  _loadProducts(_shopId);
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

  void _showProductDialog(AppLocalizations l10n, {ProductModel? product}) {
    final nameCtrl = TextEditingController(text: product?.name ?? '');
    final skuCtrl = TextEditingController(text: product?.sku ?? '');
    final costCtrl = TextEditingController(text: product != null ? product.costPrice.toString() : '');
    final sellingCtrl = TextEditingController(text: product != null ? product.sellingPrice.toString() : '');
    final stockCtrl = TextEditingController(text: product != null ? product.stockQuantity.toString() : '0');
    final reorderCtrl = TextEditingController(text: product != null ? product.reorderLevel.toString() : '10');
    final unitCtrl = TextEditingController(text: product?.unit ?? 'piece');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(product == null ? l10n.inventoryAddProduct : l10n.inventoryEditProduct,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 16),
            TextField(controller: nameCtrl, decoration: InputDecoration(labelText: '${l10n.inventoryProductName} *'), autofocus: true),
            const SizedBox(height: 12),
            TextField(controller: skuCtrl, decoration: InputDecoration(labelText: l10n.inventorySku)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: TextField(controller: costCtrl, decoration: InputDecoration(labelText: l10n.inventoryCostPrice), keyboardType: TextInputType.number)),
                const SizedBox(width: 12),
                Expanded(child: TextField(controller: sellingCtrl, decoration: InputDecoration(labelText: '${l10n.inventorySellingPrice} *'), keyboardType: TextInputType.number)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: TextField(controller: stockCtrl, decoration: InputDecoration(labelText: '${l10n.inventoryStockQty} *'), keyboardType: TextInputType.number)),
                const SizedBox(width: 12),
                Expanded(child: TextField(controller: reorderCtrl, decoration: InputDecoration(labelText: l10n.inventoryReorderLevel), keyboardType: TextInputType.number)),
              ],
            ),
            const SizedBox(height: 12),
            TextField(controller: unitCtrl, decoration: InputDecoration(labelText: l10n.inventoryUnit)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  if (nameCtrl.text.isEmpty || sellingCtrl.text.isEmpty) return;
                  final payload = {
                    'name': nameCtrl.text,
                    'sku': skuCtrl.text,
                    'costPrice': double.tryParse(costCtrl.text) ?? 0,
                    'sellingPrice': double.tryParse(sellingCtrl.text) ?? 0,
                    'stockQuantity': int.tryParse(stockCtrl.text) ?? 0,
                    'reorderLevel': int.tryParse(reorderCtrl.text) ?? 10,
                    'unit': unitCtrl.text,
                  };
                  try {
                    if (product == null) {
                      await api.post('/shops/$_shopId/products', data: payload);
                    } else {
                      await api.put('/products/${product.id}', data: payload);
                    }
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(product == null ? l10n.inventoryProductAdded : l10n.inventoryProductUpdated),
                          backgroundColor: AppTheme.teal),
                      );
                      _loadProducts(_shopId);
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(friendlyError(e, l10n)), backgroundColor: AppTheme.crimson),
                      );
                    }
                  }
                },
                child: Text(l10n.inventorySaveProduct, style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  final ProductModel product;
  final VoidCallback onTap;
  const _ProductTile({required this.product, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      leading: CircleAvatar(
        backgroundColor: product.isLowStock
            ? AppTheme.crimson.withValues(alpha: 0.1)
            : AppTheme.teal.withValues(alpha: 0.1),
        child: Icon(
          product.isLowStock ? Icons.warning : Icons.inventory,
          color: product.isLowStock ? AppTheme.crimson : AppTheme.teal,
          size: 20,
        ),
      ),
      title: Text(product.name, style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.navy)),
      subtitle: Text('SKU: ${product.sku ?? '-'}  |  ${AppLocalizations.of(context).inventoryInStock}: ${product.stockQuantity}',
        style: TextStyle(
          color: product.isLowStock ? AppTheme.crimson : AppTheme.textSecondary,
          fontSize: 12,
        )),
      trailing: Text(AppSettings.instance.formatCurrency(product.sellingPrice),
        style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.gold)),
      onTap: onTap,
    );
  }
}
