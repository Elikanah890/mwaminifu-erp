import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/async_states.dart';
import '../../../app/themes.dart';
import '../../blocs/shop/shop_bloc.dart';

/// Business Owner only: manage shops and switch the active shop.
class ShopsPage extends StatefulWidget {
  const ShopsPage({super.key});

  @override
  State<ShopsPage> createState() => _ShopsPageState();
}

class _ShopsPageState extends State<ShopsPage> {
  final api = ApiClient();
  List<dynamic> _shops = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await api.get('/shops');
      if (mounted) {
        setState(() {
          _shops = res['data'] as List? ?? [];
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

  Future<void> _select(Map<String, dynamic> shop) async {
    context.read<ShopBloc>().add(SelectShop(shop['id'] as String));
  }

  void _showAddDialog() {
    final l10n = AppLocalizations.of(context);
    final nameCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final currencyCtrl = TextEditingController(text: 'TZS');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(l10n.shopAddShop, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 16),
            TextField(controller: nameCtrl, decoration: InputDecoration(labelText: l10n.shopName), autofocus: true),
            const SizedBox(height: 12),
            TextField(controller: addressCtrl, decoration: InputDecoration(labelText: l10n.shopAddress)),
            const SizedBox(height: 12),
            TextField(controller: currencyCtrl, decoration: InputDecoration(labelText: l10n.shopCurrency), maxLength: 3),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  if (nameCtrl.text.trim().isEmpty) return;
                  try {
                    await api.post('/shops', data: {
                      'name': nameCtrl.text.trim(),
                      'address': addressCtrl.text.trim(),
                      'currency': currencyCtrl.text.trim().toUpperCase(),
                    });
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    await _load();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.shopShopCreated), backgroundColor: AppTheme.teal),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.errorGeneric), backgroundColor: AppTheme.crimson),
                      );
                    }
                  }
                },
                child: Text(l10n.shopSaveShop),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _archive(Map<String, dynamic> shop) async {
    final l10n = AppLocalizations.of(context);
    try {
      await api.delete('/shops/${shop['id']}');
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.shopArchived), backgroundColor: AppTheme.teal),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.errorGeneric), backgroundColor: AppTheme.crimson),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final activeShopId = context.watch<ShopBloc>().state is ShopLoaded
        ? (context.read<ShopBloc>().state as ShopLoaded).activeShopId
        : null;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.shopTitle)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? AsyncStateView.loading()
            : _error != null
                ? AsyncStateView.error(context, l10n.errorGeneric, onRetry: _load)
                : _shops.isEmpty
                    ? AsyncStateView.empty(context, l10n.shopNoShops, icon: Icons.store)
                    : ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: _shops.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final s = _shops[i];
                          final isActive = s['id'] == activeShopId;
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: isActive ? AppTheme.teal.withValues(alpha: 0.15) : AppTheme.navy.withValues(alpha: 0.1),
                              child: Icon(Icons.store, color: isActive ? AppTheme.teal : AppTheme.navy, size: 20),
                            ),
                            title: Text(s['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.navy)),
                            subtitle: Text(s['address'] ?? '', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                            trailing: isActive
                                ? Chip(label: Text(l10n.shopCurrent), backgroundColor: AppTheme.teal.withValues(alpha: 0.1), labelStyle: const TextStyle(color: AppTheme.teal, fontSize: 11))
                                : null,
                            onTap: () => _select(s),
                            onLongPress: () => _archive(s),
                          );
                        },
                      ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.gold,
        onPressed: _showAddDialog,
        child: const Icon(Icons.add, color: AppTheme.navy),
      ),
    );
  }
}
