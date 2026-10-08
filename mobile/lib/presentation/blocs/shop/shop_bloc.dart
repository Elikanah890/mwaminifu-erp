import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/models.dart';

abstract class ShopEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadShops extends ShopEvent {
  final String? preferredShopId;
  LoadShops({this.preferredShopId});
  @override
  List<Object?> get props => [preferredShopId];
}

class SelectShop extends ShopEvent {
  final String shopId;
  SelectShop(this.shopId);
  @override
  List<Object?> get props => [shopId];
}

abstract class ShopState extends Equatable {
  @override
  List<Object?> get props => [];
}

class ShopInitial extends ShopState {}

class ShopLoading extends ShopState {}

class ShopLoaded extends ShopState {
  final List<ShopModel> shops;
  final String? activeShopId;
  ShopLoaded({required this.shops, this.activeShopId});

  ShopModel? get activeShop => activeShopId == null
      ? null
      : shops.where((s) => s.id == activeShopId).firstOrNull;

  @override
  List<Object?> get props => [shops, activeShopId];
}

class ShopError extends ShopState {
  final String message;
  ShopError(this.message);
  @override
  List<Object?> get props => [message];
}

/// Holds the shops visible to the signed-in user and the currently selected
/// (active) shop. Business Owners see all their shops; employees see their
/// assigned shop(s). Every shop-scoped screen reads its `shopId` from here.
class ShopBloc extends Bloc<ShopEvent, ShopState> {
  final ApiClient apiClient;
  static const _storage = FlutterSecureStorage();
  static const _activeShopKey = 'active_shop_id';

  ShopBloc(this.apiClient) : super(ShopInitial()) {
    on<LoadShops>(_onLoadShops);
    on<SelectShop>(_onSelectShop);
  }

  Future<void> _onLoadShops(LoadShops event, Emitter<ShopState> emit) async {
    emit(ShopLoading());
    try {
      final res = await apiClient.get('/shops');
      final shops = (res['data'] as List? ?? [])
          .map((e) => ShopModel.fromJson(e as Map<String, dynamic>))
          .where((s) => !s.isArchived)
          .toList();

      final active = await _resolveActiveShopId(shops, event.preferredShopId);
      emit(ShopLoaded(shops: shops, activeShopId: active));
    } catch (e) {
      emit(ShopError(_extractError(e)));
    }
  }

  Future<void> _onSelectShop(SelectShop event, Emitter<ShopState> emit) async {
    final current = state;
    if (current is! ShopLoaded) return;
    emit(ShopLoaded(shops: current.shops, activeShopId: event.shopId));
    try {
      await _storage.write(key: _activeShopKey, value: event.shopId);
    } catch (_) {
      // Persistence is best-effort; the in-memory selection still applies.
    }
  }

Future<String?> _resolveActiveShopId(
    List<ShopModel> shops,
    String? preferredShopId,
  ) async {
    if (shops.isEmpty) return null;

    // First try the preferredShopId from AuthState.
    if (preferredShopId != null && shops.any((s) => s.id == preferredShopId)) {
      return preferredShopId;
    }

    // Restore the owner's last selection after an app restart. Employees do
    // not reach this branch with a different shop because their assigned ID
    // is always supplied as preferredShopId by AuthBloc.
    final storedShopId = await _storage.read(key: _activeShopKey);
    if (storedShopId != null && shops.any((s) => s.id == storedShopId)) {
      return storedShopId;
    }

    // Fall back to the first available shop (not archived, filtered in LoadShops).
    return shops.first.id;
  }

  String _extractError(dynamic e) {
    if (e is Map && e.containsKey('error')) {
      return e['error']?['message'] ?? 'An error occurred';
    }
    return e.toString();
  }
}
