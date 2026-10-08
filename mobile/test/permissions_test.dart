import 'package:flutter_test/flutter_test.dart';
import 'package:mwaminifu_app/core/permissions/permissions.dart';
import 'package:mwaminifu_app/data/models/models.dart';

void main() {
  group('Permission.granted', () {
    test('owner always has access', () {
      expect(
        Permission.granted(role: 'BUSINESS_OWNER', permissions: {}, permission: 'pos:write'),
        isTrue,
      );
    });

    test('employee is checked against their permission set', () {
      expect(
        Permission.granted(role: 'EMPLOYEE', permissions: {'pos:write'}, permission: 'pos:write'),
        isTrue,
      );
      expect(
        Permission.granted(role: 'EMPLOYEE', permissions: {'pos:write'}, permission: 'inventory:write'),
        isFalse,
      );
    });

    test('null user permissions default to empty', () {
      expect(
        Permission.granted(role: 'EMPLOYEE', permissions: {}, permission: 'pos:write'),
        isFalse,
      );
    });
  });

  group('Permission.fullOperational', () {
    test('contains all eight operational permissions', () {
      expect(Permission.fullOperational, hasLength(8));
      expect(Permission.fullOperational, containsAll([
        Permission.posWrite,
        Permission.posRefund,
        Permission.posVoid,
        Permission.inventoryRead,
        Permission.inventoryWrite,
        Permission.expensesWrite,
        Permission.creditWrite,
        Permission.reportsRead,
      ]));
    });
  });

  group('UserModel', () {
    test('parses role, permissions and role helpers', () {
      final owner = UserModel.fromJson({'id': '1', 'name': 'A', 'role': 'BUSINESS_OWNER'});
      expect(owner.isOwner, isTrue);
      expect(owner.isEmployee, isFalse);

      final employee = UserModel.fromJson({
        'id': '2',
        'name': 'B',
        'role': 'EMPLOYEE',
        'permissions': ['pos:write', 'reports:read'],
      });
      expect(employee.isEmployee, isTrue);
      expect(employee.permissions, ['pos:write', 'reports:read']);
    });
  });
}
