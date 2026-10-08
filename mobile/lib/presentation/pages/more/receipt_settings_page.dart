import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/app_error.dart';
import '../../../core/widgets/async_states.dart';
import '../../../app/themes.dart';
import '../../blocs/shop/shop_bloc.dart';

/// Business Owner receipt/shop settings backed by `GET/PUT /shops/:id/settings`.
class ReceiptSettingsPage extends StatefulWidget {
  const ReceiptSettingsPage({super.key});

  @override
  State<ReceiptSettingsPage> createState() => _ReceiptSettingsPageState();
}

class _ReceiptSettingsPageState extends State<ReceiptSettingsPage> {
  final api = ApiClient();
  String _shopId = '';
  bool _loading = true;
  String? _error;
  bool _saving = false;

  final _headerCtrl = TextEditingController();
  final _footerCtrl = TextEditingController();
  final _taxCtrl = TextEditingController();
  final _currencyCtrl = TextEditingController(text: 'TZS');
  String _language = 'sw';
  String _printerType = 'none';

  @override
  void initState() {
    super.initState();
    _resolveShop();
  }

  @override
  void dispose() {
    _headerCtrl.dispose();
    _footerCtrl.dispose();
    _taxCtrl.dispose();
    _currencyCtrl.dispose();
    super.dispose();
  }

  void _resolveShop() {
    final state = context.read<ShopBloc>().state;
    if (state is ShopLoaded && state.activeShopId != null) {
      _load(state.activeShopId!);
    } else {
      context.read<ShopBloc>().add(LoadShops());
    }
  }

  Future<void> _load(String shopId) async {
    _shopId = shopId;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await api.get('/shops/$shopId/settings');
      final data = res['data'] as Map<String, dynamic>? ?? {};
      if (!mounted) return;
      setState(() {
        _headerCtrl.text = data['receiptHeader']?.toString() ?? '';
        _footerCtrl.text = data['receiptFooter']?.toString() ?? '';
        _taxCtrl.text = data['taxNumber']?.toString() ?? '';
        _currencyCtrl.text = data['currency']?.toString() ?? 'TZS';
        _language = data['language']?.toString() ?? 'sw';
        final printer = data['printerSettings'];
        _printerType = printer is Map && printer['type'] != null
            ? printer['type'].toString()
            : 'none';
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = friendlyError(e, AppLocalizations.of(context));
          _loading = false;
        });
      }
    }
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    if (_shopId.isEmpty) return;
    setState(() => _saving = true);
    try {
      await api.put('/shops/$_shopId/settings', data: {
        'receiptHeader': _headerCtrl.text.trim(),
        'receiptFooter': _footerCtrl.text.trim(),
        'taxNumber': _taxCtrl.text.trim(),
        'currency': _currencyCtrl.text.trim().toUpperCase(),
        'language': _language,
        'printerSettings': _printerType == 'none' ? null : {'type': _printerType},
      });
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.receiptUpdated), backgroundColor: AppTheme.teal),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyError(e, l10n)), backgroundColor: AppTheme.crimson),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return BlocListener<ShopBloc, ShopState>(
      listener: (context, state) {
        if (state is ShopLoaded && state.activeShopId != null && state.activeShopId != _shopId) {
          _load(state.activeShopId!);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.receiptTitle),
          actions: [
            TextButton.icon(
              onPressed: _saving || _loading ? null : _save,
              icon: const Icon(Icons.save, color: Colors.white, size: 18),
              label: Text(l10n.commonSave, style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
        body: _loading
            ? AsyncStateView.loading()
            : _error != null
                ? AsyncStateView.error(context, _error!, onRetry: () => _load(_shopId))
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _sectionTitle(l10n.receiptHeader),
                      const SizedBox(height: 8),
                      TextField(controller: _headerCtrl, decoration: const InputDecoration(hintText: 'Mwaminifu Shop')),
                      const SizedBox(height: 16),
                      _sectionTitle(l10n.receiptFooter),
                      const SizedBox(height: 8),
                      TextField(controller: _footerCtrl, maxLines: 2),
                      const SizedBox(height: 16),
                      _sectionTitle(l10n.receiptTaxNumber),
                      const SizedBox(height: 8),
                      TextField(controller: _taxCtrl, keyboardType: TextInputType.text),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _sectionTitle(l10n.receiptCurrency),
                                const SizedBox(height: 8),
                                TextField(
                                  controller: _currencyCtrl,
                                  maxLength: 3,
                                  textCapitalization: TextCapitalization.characters,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _sectionTitle(l10n.receiptLanguage),
                                const SizedBox(height: 8),
                                DropdownButtonFormField<String>(
                                  initialValue: _language,
                                  decoration: const InputDecoration(counterText: ''),
                                  items: const [
                                    DropdownMenuItem(value: 'sw', child: Text('Kiswahili')),
                                    DropdownMenuItem(value: 'en', child: Text('English')),
                                  ],
                                  onChanged: (v) => setState(() => _language = v ?? 'sw'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _sectionTitle(l10n.receiptPrinter),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _printerType,
                        decoration: const InputDecoration(counterText: ''),
                        items: [
                          DropdownMenuItem(value: 'none', child: Text(l10n.receiptPrinterNone)),
                          DropdownMenuItem(value: 'bluetooth', child: Text(l10n.receiptPrinterBluetooth)),
                        ],
                        onChanged: (v) => setState(() => _printerType = v ?? 'none'),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary));
  }
}
