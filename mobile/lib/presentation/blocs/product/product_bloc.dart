import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sync/local_sync_store.dart';
import '../../../data/models/models.dart';

abstract class ProductEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadProducts extends ProductEvent {
  final String shopId;
  final bool lowStock;
  LoadProducts(this.shopId, {this.lowStock = false});
  @override
  List<Object?> get props => [shopId, lowStock];
}

class SearchProducts extends ProductEvent {
  final String shopId;
  final String query;
  SearchProducts(this.shopId, this.query);
  @override
  List<Object?> get props => [shopId, query];
}

abstract class ProductState extends Equatable {
  @override
  List<Object?> get props => [];
}

class ProductInitial extends ProductState {}
class ProductLoading extends ProductState {}
class ProductsLoaded extends ProductState {
  final List<ProductModel> products;
  final int total;
  ProductsLoaded({required this.products, required this.total});
}
class ProductError extends ProductState {
  final String message;
  ProductError(this.message);
}

class ProductBloc extends Bloc<ProductEvent, ProductState> {
  final ApiClient apiClient;

  ProductBloc(this.apiClient) : super(ProductInitial()) {
    on<LoadProducts>(_onLoadProducts);
    on<SearchProducts>(_onSearchProducts);
  }

  Future<void> _onLoadProducts(LoadProducts event, Emitter<ProductState> emit) async {
    emit(ProductLoading());
    try {
      final query = <String, dynamic>{'limit': '200'};
      if (event.lowStock) query['lowStock'] = 'true';
      final res = await apiClient.get('/shops/${event.shopId}/products', queryParameters: query);
      final List products = res['data'] ?? [];
      emit(ProductsLoaded(
        products: products.map((p) => ProductModel.fromJson(p)).toList(),
        total: res['pagination']?['total'] ?? products.length,
      ));
    } catch (e) {
      final cached = await LocalSyncStore.instance.records(event.shopId, 'products');
      final products = cached.map(ProductModel.fromJson).where((product) => !event.lowStock || product.isLowStock).toList();
      if (products.isNotEmpty) {
        emit(ProductsLoaded(products: products, total: products.length));
      } else {
        emit(ProductError(e.toString()));
      }
    }
  }

  Future<void> _onSearchProducts(SearchProducts event, Emitter<ProductState> emit) async {
    emit(ProductLoading());
    try {
      final res = await apiClient.get('/shops/${event.shopId}/products', queryParameters: {
        'search': event.query,
        'limit': '200',
      });
      final List products = res['data'] ?? [];
      emit(ProductsLoaded(
        products: products.map((p) => ProductModel.fromJson(p)).toList(),
        total: res['pagination']?['total'] ?? products.length,
      ));
    } catch (e) {
      final query = event.query.toLowerCase();
      final cached = await LocalSyncStore.instance.records(event.shopId, 'products');
      final products = cached
          .map(ProductModel.fromJson)
          .where((product) => product.name.toLowerCase().contains(query) || (product.sku ?? '').toLowerCase().contains(query))
          .toList();
      if (products.isNotEmpty) {
        emit(ProductsLoaded(products: products, total: products.length));
      } else {
        emit(ProductError(e.toString()));
      }
    }
  }
}
