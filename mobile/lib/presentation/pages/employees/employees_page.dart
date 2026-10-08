import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mwaminifu_app/l10n/app_localizations.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/app_error.dart';
import '../../../core/widgets/async_states.dart';
import '../../../app/themes.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/shop/shop_bloc.dart';

class EmployeesPage extends StatefulWidget {
  const EmployeesPage({super.key});

  @override
  State<EmployeesPage> createState() => _EmployeesPageState();
}

class _EmployeesPageState extends State<EmployeesPage> {
  final api = ApiClient();
  String _shopId = '';
  List<dynamic> _employees = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _resolveShop();
  }

  bool get _isOwner => context.read<AuthBloc>().isOwner;

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
      final res = await api.get('/shops/$shopId/employees');
      if (mounted) {
        setState(() {
        _employees = res['data'] as List? ?? [];
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
        if (state is ShopLoaded) _load(state.activeShopId);
      },
      child: Scaffold(
        appBar: AppBar(title: Text(l10n.employeesTitle)),
        body: _buildBody(l10n),
        floatingActionButton: _isOwner
            ? FloatingActionButton(
                backgroundColor: AppTheme.gold,
                onPressed: () => _showAddDialog(l10n),
                child: const Icon(Icons.person_add, color: AppTheme.navy),
              )
            : null,
      ),
    );
  }

  Widget _buildBody(AppLocalizations l10n) {
    if (_loading) return AsyncStateView.loading();
    if (_error != null) return AsyncStateView.error(context, l10n.errorGeneric, onRetry: () => _load(_shopId));
    if (_employees.isEmpty) {
      return AsyncStateView.empty(context, l10n.employeesNoEmployees, icon: Icons.people_outline);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _employees.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final e = _employees[i];
        final active = e['isActive'] == true;
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: (active ? AppTheme.teal : AppTheme.textSecondary).withValues(alpha: 0.15),
            child: Icon(active ? Icons.person : Icons.person_off,
              color: active ? AppTheme.teal : AppTheme.textSecondary, size: 20),
          ),
          title: Text(e['user']?['name'] ?? e['role'] ?? 'Employee',
            style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.navy)),
          subtitle: Text(e['role'] ?? l10n.employeesShopEmployee,
            style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
          trailing: _isOwner
            ? Switch(
                value: active,
                activeThumbColor: AppTheme.teal,
                onChanged: (_) => _toggle(e),
              )
            : const Icon(Icons.check, color: AppTheme.teal, size: 20),
          onTap: _isOwner ? () => _showActions(l10n, e) : null,
        );
      },
    );
  }

  void _showAddDialog(AppLocalizations l10n) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final roleCtrl = TextEditingController(text: l10n.employeesCashier);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(l10n.employeesAddEmployee, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
            const SizedBox(height: 16),
            TextField(controller: nameCtrl, decoration: InputDecoration(labelText: '${l10n.employeesFullName} *'), autofocus: true),
            const SizedBox(height: 12),
            TextField(controller: phoneCtrl, decoration: InputDecoration(labelText: '${l10n.employeesPhone} *'), keyboardType: TextInputType.phone),
            const SizedBox(height: 12),
            TextField(controller: roleCtrl, decoration: InputDecoration(labelText: l10n.employeesRole)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  if (nameCtrl.text.isEmpty || phoneCtrl.text.length < 10) return;
                  try {
                    await api.post('/shops/$_shopId/employees', data: {
                      'name': nameCtrl.text,
                      'phone': phoneCtrl.text,
                      'role': roleCtrl.text,
                    });
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    await _load(_shopId);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.employeesEmployeeAdded), backgroundColor: AppTheme.teal),
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
                child: Text(l10n.employeesAdd, style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showActions(AppLocalizations l10n, Map<String, dynamic> employee) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            title: Text(employee['user']?['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.navy)),
            subtitle: Text(employee['role'] ?? l10n.employeesShopEmployee),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.edit, color: AppTheme.teal),
            title: Text(l10n.commonEdit),
            onTap: () {
              Navigator.pop(ctx);
              _showEditDialog(l10n, employee);
            },
          ),
          ListTile(
            leading: const Icon(Icons.admin_panel_settings, color: AppTheme.teal),
            title: Text('${l10n.employeesRole} / permissions'),
            onTap: () {
              Navigator.pop(ctx);
              _showEditDialog(l10n, employee);
            },
          ),
          ListTile(
            leading: const Icon(Icons.lock_reset, color: AppTheme.teal),
            title: Text(l10n.employeesResetPin),
            onTap: () {
              Navigator.pop(ctx);
              _resetPin(l10n, employee);
            },
          ),
          ListTile(
            leading: const Icon(Icons.delete, color: AppTheme.crimson),
            title: Text(l10n.employeesRemove),
            onTap: () {
              Navigator.pop(ctx);
              _remove(l10n, employee);
            },
          ),
        ],
      ),
    );
  }

  void _showEditDialog(AppLocalizations l10n, Map<String, dynamic> employee) {
    final nameCtrl = TextEditingController(text: employee['user']?['name']?.toString() ?? '');
    final roleCtrl = TextEditingController(text: employee['role']?.toString() ?? '');
    const availablePermissions = [
      'pos:write',
      'pos:refund',
      'pos:void',
      'inventory:read',
      'inventory:write',
      'expenses:write',
      'credit:write',
      'reports:read',
    ];
    final selected = ((employee['permissions'] as List?) ?? const []).map((p) => p.toString()).toSet();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: ListView(
            shrinkWrap: true,
            children: [
              Text(l10n.commonEdit, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.navy)),
              const SizedBox(height: 12),
              TextField(controller: nameCtrl, decoration: InputDecoration(labelText: l10n.employeesFullName)),
              const SizedBox(height: 12),
              TextField(controller: roleCtrl, decoration: InputDecoration(labelText: l10n.employeesRole)),
              const SizedBox(height: 12),
              ...availablePermissions.map((permission) => CheckboxListTile(
                    dense: true,
                    value: selected.contains(permission),
                    title: Text(permission),
                    onChanged: (enabled) => setSheetState(() {
                      if (enabled == true) {
                        selected.add(permission);
                      } else {
                        selected.remove(permission);
                      }
                    }),
                  )),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () async {
                  try {
                    await api.put('/employees/${employee['id']}', data: {
                      'name': nameCtrl.text.trim(),
                      'role': roleCtrl.text.trim(),
                    });
                    await api.put('/employees/${employee['id']}/permissions', data: {
                      'permissions': selected.toList(),
                    });
                    if (ctx.mounted) Navigator.pop(ctx);
                    await _load(_shopId);
                  } catch (error) {
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(friendlyError(error, l10n)), backgroundColor: AppTheme.crimson),
                      );
                    }
                  }
                },
                child: Text(l10n.commonSave),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _toggle(Map<String, dynamic> employee) async {
    final l10n = AppLocalizations.of(context);
    try {
      await api.put('/employees/${employee['id']}/toggle');
      await _load(_shopId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(e, l10n)), backgroundColor: AppTheme.crimson),
        );
      }
    }
  }

  Future<void> _resetPin(AppLocalizations l10n, Map<String, dynamic> employee) async {
    try {
      await api.post('/employees/${employee['id']}/reset-pin');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.employeesResetPin), backgroundColor: AppTheme.teal),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(e, l10n)), backgroundColor: AppTheme.crimson),
        );
      }
    }
  }

  Future<void> _remove(AppLocalizations l10n, Map<String, dynamic> employee) async {
    try {
      await api.delete('/employees/${employee['id']}');
      await _load(_shopId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.employeesRemove), backgroundColor: AppTheme.teal),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(e, l10n)), backgroundColor: AppTheme.crimson),
        );
      }
    }
  }
}
