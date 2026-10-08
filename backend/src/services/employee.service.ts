import prisma from '../config/database';
import { hashPin } from '../utils/bcrypt.util';
import { generateTempPin } from '../utils/otp.util';
import { shopService } from './shop.service';
import { SmsService } from './sms.service';

const smsService = new SmsService();

/**
 * Standard V1 operational permission set for a newly created shop employee.
 * The Business Owner is NOT required to configure permissions in V1 — every
 * employee is a full operational employee for their assigned shop.
 * (Owner capabilities are not affected; this only seeds defaults.)
 */
export const FULL_OPERATIONAL_PERMISSIONS = [
  'pos:write',
  'pos:refund',
  'pos:void',
  'inventory:read',
  'inventory:write',
  'expenses:write',
  'credit:write',
  // Spec 9.8.1 — reporting is split. These three are on for a full employee;
  // activity log, loans, valuation and communications remain off by default
  // but grantable. General Reports / Finance Overview are never grantable.
  'reports:sales',
  'reports:inventory',
  'reports:credit',
];

export class EmployeeService {
  async listEmployees(shopId: string, ownerId: string) {
    await shopService.verifyShopAccess(shopId, ownerId);

    return prisma.employee.findMany({
      where: { shopId },
      include: { user: { select: { id: true, name: true, phone: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addEmployee(
    shopId: string,
    ownerId: string,
    data: {
      phone: string;
      name: string;
      role?: string;
      permissions?: string[];
    }
  ) {
    await shopService.verifyShopAccess(shopId, ownerId);

    const employeeCount = await prisma.employee.count({
      where: { shopId, isActive: true },
    });
    if (employeeCount >= 5) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Maximum 5 employees per shop' };
    }

    const tempPin = generateTempPin();
    const tempPinHash = await hashPin(tempPin);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone: data.phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: data.phone,
          name: data.name,
          role: 'EMPLOYEE',
          isPinSet: false,
        },
      });
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: { userId: user.id, shopId },
    });

    if (existingEmployee) {
      throw { status: 409, code: 'CONFLICT', message: 'Employee already assigned to this shop' };
    }

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        shopId,
        role: data.role || 'Cashier',
        permissions: data.permissions && data.permissions.length > 0
          ? data.permissions
          : FULL_OPERATIONAL_PERMISSIONS,
        tempPinHash,
      },
      include: { user: { select: { name: true, phone: true } } },
    });

    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } });

    await smsService.send(
      data.phone,
      `Welcome to Mwaminifu! You have been added to ${shop?.name}. Download the app and login with phone ${data.phone}. Your temp PIN: ${tempPin}`,
      { purpose: 'EMPLOYEE_WELCOME', userId: user.id, shopId }
    );

    return employee;
  }

  async getEmployee(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { id: true, name: true, phone: true, isActive: true, avatarUrl: true } }, shop: { select: { name: true } } },
    });
    if (!employee) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Employee not found' };
    }
    return employee;
  }

  async updateEmployee(employeeId: string, data: { name?: string; role?: string }) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Employee not found' };
    }

    if (data.name) {
      await prisma.user.update({ where: { id: employee.userId }, data: { name: data.name } });
    }

    return prisma.employee.update({
      where: { id: employeeId },
      data: { role: data.role },
    });
  }

  async updatePermissions(employeeId: string, permissions: string[]) {
    return prisma.employee.update({
      where: { id: employeeId },
      data: { permissions },
    });
  }

  async toggleEmployee(employeeId: string) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Employee not found' };
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: !employee.isActive },
    });

    await prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: updated.isActive },
    });

    return updated;
  }

  async resetPin(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { phone: true } } },
    });
    if (!employee) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Employee not found' };
    }

    const tempPin = generateTempPin();
    const tempPinHash = await hashPin(tempPin);

    await prisma.employee.update({
      where: { id: employeeId },
      data: { tempPinHash },
    });

    await prisma.user.update({
      where: { id: employee.userId },
      data: { pinHash: null, isPinSet: false },
    });

    await smsService.send(
      employee.user.phone!,
      `Mwaminifu: Your PIN has been reset. Your new temporary PIN is ${tempPin}. Login and change your PIN.`,
      { purpose: 'EMPLOYEE_PIN_RESET', userId: employee.userId, shopId: employee.shopId }
    );

    return { message: 'PIN reset. SMS sent.' };
  }

  async removeEmployee(employeeId: string) {
    return prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}

export const employeeService = new EmployeeService();
