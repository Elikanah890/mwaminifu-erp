import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final String id;
  final String? phone;
  final String name;
  final String? email;
  final String role;
  final String? avatarUrl;
  final List<String> permissions;

  const UserModel({
    required this.id,
    this.phone,
    required this.name,
    this.email,
    required this.role,
    this.avatarUrl,
    this.permissions = const [],
  });

  bool get isOwner => role == 'BUSINESS_OWNER';
  bool get isEmployee => role == 'EMPLOYEE';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      phone: json['phone'],
      name: json['name'] ?? '',
      email: json['email'],
      role: json['role'] ?? 'EMPLOYEE',
      avatarUrl: json['avatarUrl'],
      permissions: (json['permissions'] as List?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }

  @override
  List<Object?> get props => [id, phone, name, email, role, avatarUrl, permissions];
}

class ProductModel extends Equatable {
  final String id;
  final String name;
  final String? sku;
  final String? categoryId;
  final String? categoryName;
  final double costPrice;
  final double sellingPrice;
  final int stockQuantity;
  final int reorderLevel;
  final String unit;
  final bool isActive;

  const ProductModel({
    required this.id,
    required this.name,
    this.sku,
    this.categoryId,
    this.categoryName,
    required this.costPrice,
    required this.sellingPrice,
    required this.stockQuantity,
    required this.reorderLevel,
    required this.unit,
    required this.isActive,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      sku: json['sku'],
      categoryId: json['categoryId'],
      categoryName: json['category'] != null ? json['category']['name'] : null,
      costPrice: (json['costPrice'] ?? 0).toDouble(),
      sellingPrice: (json['sellingPrice'] ?? 0).toDouble(),
      stockQuantity: json['stockQuantity'] ?? 0,
      reorderLevel: json['reorderLevel'] ?? 10,
      unit: json['unit'] ?? 'piece',
      isActive: json['isActive'] ?? true,
    );
  }

  bool get isLowStock => stockQuantity <= reorderLevel;

  @override
  List<Object?> get props => [id, name, sellingPrice, stockQuantity, isActive];
}

class ShopModel extends Equatable {
  final String id;
  final String name;
  final String? address;
  final String currency;
  final bool isArchived;

  const ShopModel({
    required this.id,
    required this.name,
    this.address,
    this.currency = 'TZS',
    this.isArchived = false,
  });

  factory ShopModel.fromJson(Map<String, dynamic> json) {
    return ShopModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      address: json['address'],
      currency: json['currency'] ?? 'TZS',
      isArchived: json['isArchived'] == true,
    );
  }

  @override
  List<Object?> get props => [id, name, currency, isArchived];
}

class CartItem {
  final ProductModel product;
  int quantity;
  final double unitPrice;
  double discount;

  CartItem({
    required this.product,
    this.quantity = 1,
    required this.unitPrice,
    this.discount = 0,
  });

  double get total => (quantity * unitPrice) - discount;
}
