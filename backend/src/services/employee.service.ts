import prisma from '../config/database';
import { hashPassword } from '../utils/bcrypt.util';
import { generateTempPassword } from '../utils/otp.util';
import { shopService } from './shop.service';
import { emailService } from './email.service';
import { FULL_OPERATIONAL_PERMISSIONS } from '../config/permissions';

export { FULL_OPERATIONAL_PERMISSIONS };

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
      email: string;
      phone?: string;
      name: string;
      role?: string;
      permissions?: string[];
    }
  ) {
    await shopService.verifyShopAccess(shopId, ownerId);

    const employeeCount = await prisma.employee.count({
      where: { shopId, isActive: true, deletedAt: null },
    });
    if (employeeCount >= 5) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Maximum 5 employees per shop' };
    }

    const email = data.email.trim().toLowerCase();
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    let user = await prisma.user.findUnique({ where: { email } });
    let createdNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          phone: data.phone || null,
          name: data.name,
          role: 'EMPLOYEE',
          passwordHash,
          mustChangePassword: true,
          isPinSet: false,
        },
      });
      createdNewUser = true;
    } else if (user.role !== 'EMPLOYEE') {
      throw { status: 409, code: 'CONFLICT', message: 'This email belongs to a non-employee account' };
    } else if (user.isActive === false) {
      // Re-enable the shared login without touching the existing password.
      await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
    }

    const existingEmployee = await prisma.employee.findUnique({
      where: { userId_shopId: { userId: user.id, shopId } },
    });

    if (existingEmployee && !existingEmployee.deletedAt && existingEmployee.isActive) {
      throw { status: 409, code: 'CONFLICT', message: 'Employee already assigned to this shop' };
    }

    const [otherActiveAssignments, activePrimary] = await Promise.all([
      prisma.employee.count({ where: { userId: user.id, isActive: true, deletedAt: null } }),
      prisma.employee.findFirst({ where: { userId: user.id, isPrimary: true, isActive: true, deletedAt: null }, select: { id: true } }),
    ]);
    const isPrimary = otherActiveAssignments === 0 || !activePrimary;

    const permissions = data.permissions && data.permissions.length > 0
      ? data.permissions
      : FULL_OPERATIONAL_PERMISSIONS;

    const employee = existingEmployee
      ? await prisma.employee.update({
          where: { id: existingEmployee.id },
          data: {
            role: data.role || existingEmployee.role,
            permissions,
            isActive: true,
            deletedAt: null,
            isPrimary,
          },
          include: { user: { select: { name: true, email: true, phone: true } } },
        })
      : await prisma.employee.create({
          data: {
            userId: user.id,
            shopId,
            role: data.role || 'Cashier',
            permissions,
            isPrimary,
          },
          include: { user: { select: { name: true, email: true, phone: true } } },
        });

    // Only a brand-new login needs the temporary password. Adding an existing
    // employee to another shop must never reset their current password.
    if (createdNewUser) {
      await emailService.sendWelcomeEmail({ name: user.name, email }, tempPassword);
    }

    return { ...employee, tempPassword: createdNewUser ? tempPassword : null, createdNewUser };
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

  private async ensurePrimaryAssignment(userId: string) {
    const primary = await prisma.employee.findFirst({
      where: { userId, isPrimary: true, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (primary) return;

    const next = await prisma.employee.findFirst({
      where: { userId, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (next) {
      await prisma.employee.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
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
      data: {
        isActive: !employee.isActive,
        // Release the partial unique primary slot before promoting a colleague.
        ...(!employee.isActive ? {} : { isPrimary: false }),
      },
    });

    // A user may hold assignments in more than one shop; keep the login active
    // while at least one assignment remains active.
    const activeAssignments = await prisma.employee.count({
      where: { userId: employee.userId, isActive: true, deletedAt: null },
    });
    await prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: activeAssignments > 0 },
    });

    if (activeAssignments === 0) {
      await prisma.refreshToken.updateMany({
        where: { userId: employee.userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    await this.ensurePrimaryAssignment(employee.userId);
    return updated;
  }

  async resetPassword(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: { select: { email: true, name: true, phone: true } } },
    });
    if (!employee) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Employee not found' };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: employee.userId },
      data: { passwordHash, mustChangePassword: true, isActive: true },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: employee.userId, isRevoked: false },
      data: { isRevoked: true },
    });

    await emailService.sendWelcomeEmail(
      { name: employee.user.name, email: employee.user.email },
      tempPassword
    );

    return { message: 'Password reset. Email sent.', tempPassword };
  }

  async removeEmployee(employeeId: string) {
    const removed = await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: false, deletedAt: new Date(), isPrimary: false },
    });

    // Removing staff terminates access to this shop. Only disable the shared
    // login and revoke sessions when no other shop still employs the user.
    const activeAssignments = await prisma.employee.count({
      where: { userId: removed.userId, isActive: true, deletedAt: null },
    });
    if (activeAssignments === 0) {
      await prisma.user.update({ where: { id: removed.userId }, data: { isActive: false } });
      await prisma.refreshToken.updateMany({
        where: { userId: removed.userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    await this.ensurePrimaryAssignment(removed.userId);
    return removed;
  }
}

export const employeeService = new EmployeeService();
