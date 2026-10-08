import prisma from '../config/database';

export class ShopService {
  async listShops(userId: string) {
    const shops = await prisma.shop.findMany({
      where: {
        isArchived: false,
        OR: [
          { ownerId: userId },
          { employees: { some: { userId, isActive: true } } },
        ],
      },
      include: {
        _count: { select: { products: true, sales: true, employees: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return shops;
  }

  async getShop(shopId: string, userId: string) {
    await this.verifyShopAccess(shopId, userId);
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        _count: { select: { products: true, sales: true, employees: true, customers: true } },
      },
    });
    if (!shop) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Shop not found' };
    }
    return shop;
  }

  async createShop(ownerId: string, data: { name: string; address?: string; currency?: string }) {
    const shopCount = await prisma.shop.count({
      where: { ownerId, isArchived: false },
    });

    if (shopCount >= 5) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Maximum 5 shops allowed' };
    }

    const shop = await prisma.shop.create({
      data: {
        ownerId,
        name: data.name,
        address: data.address,
        currency: data.currency || 'TZS',
      },
    });

    await prisma.subscription.create({
      data: { shopId: shop.id, plan: 'basic', status: 'active' },
    });

    // Create default categories
    await prisma.category.createMany({
      data: [
        { shopId: shop.id, name: 'Grocery', isDefault: true },
        { shopId: shop.id, name: 'Drinks', isDefault: true },
        { shopId: shop.id, name: 'Food', isDefault: true },
        { shopId: shop.id, name: 'Cosmetics', isDefault: true },
        { shopId: shop.id, name: 'Electronics', isDefault: true },
        { shopId: shop.id, name: 'Hardware', isDefault: true },
        { shopId: shop.id, name: 'Pharmacy', isDefault: true },
        { shopId: shop.id, name: 'Agriculture', isDefault: true },
        { shopId: shop.id, name: 'Stationery', isDefault: true },
      ],
    });

    return shop;
  }

  async updateShop(shopId: string, ownerId: string, data: {
    name?: string;
    address?: string;
    logoUrl?: string;
    coverUrl?: string;
    currency?: string;
    receiptHeader?: string;
    receiptFooter?: string;
    taxNumber?: string;
  }) {
    const shop = await prisma.shop.findFirst({ where: { id: shopId, ownerId } });
    if (!shop) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Shop not found' };
    }

    return prisma.shop.update({
      where: { id: shopId },
      data,
    });
  }

  async archiveShop(shopId: string, ownerId: string) {
    const shop = await prisma.shop.findFirst({ where: { id: shopId, ownerId } });
    if (!shop) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Shop not found' };
    }

    return prisma.shop.update({
      where: { id: shopId },
      data: { isArchived: true },
    });
  }

  async getDashboard(shopId: string, ownerId: string) {
    await this.verifyShopAccess(shopId, ownerId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todaySales, todayExpenses, lowStockCount, activeLoansCount, customerCount,
      transactionsToday, stockValue, outstandingCredit, unclosedShifts, pendingExpenses] = await Promise.all([
      prisma.sale.aggregate({
        where: { shopId, status: 'COMPLETED', saleDate: { gte: today, lt: tomorrow } },
        _sum: { grandTotal: true },
      }),
      prisma.expense.aggregate({
        where: { shopId, expenseDate: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      prisma.product.count({
        where: { shopId, isActive: true, stockQuantity: { lte: prisma.product.fields.reorderLevel } },
      }),
      prisma.loan.count({ where: { shopId, status: 'ACTIVE' } }),
      prisma.customer.count({ where: { shopId, isArchived: false } }),
      prisma.sale.count({
        where: { shopId, status: 'COMPLETED', saleDate: { gte: today, lt: tomorrow } },
      }),
      prisma.product.aggregate({
        where: { shopId, isActive: true },
        _sum: { stockQuantity: true },
      }),
      prisma.customer.aggregate({
        where: { shopId, isArchived: false },
        _sum: { outstandingBalance: true },
      }),
      prisma.shift.count({ where: { shopId, isActive: true } }),
      prisma.expense.count({ where: { shopId, approvalStatus: 'PENDING' } }),
    ]);

    // Stock valuation (cost price × quantity)
    const productsForValuation = await prisma.product.findMany({
      where: { shopId, isActive: true },
      select: { costPrice: true, stockQuantity: true },
    });
    const stockValueComputed = productsForValuation.reduce((s, p) => s + p.costPrice * p.stockQuantity, 0);

    const creditGivenToday = await prisma.sale.aggregate({
      where: {
        shopId,
        status: 'COMPLETED',
        saleDate: { gte: today, lt: tomorrow },
        paymentDetails: { string_contains: '"credit"' },
      },
      _sum: { grandTotal: true },
    });

    // COGS for today's sales (cost snapshot on each sale item)
    const todayItems = await prisma.saleItem.findMany({
      where: { sale: { shopId, status: 'COMPLETED', saleDate: { gte: today, lt: tomorrow } } },
      select: { quantity: true, costPrice: true, unitPrice: true },
    });
    const cogs = todayItems.reduce((s, i) => s + (i.costPrice || 0) * i.quantity, 0);

    // Sales trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sales = await prisma.sale.findMany({
      where: { shopId, status: 'COMPLETED', saleDate: { gte: sevenDaysAgo } },
      orderBy: { saleDate: 'asc' },
      select: { grandTotal: true, saleDate: true },
    });

    // Top products
    const topProducts = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { shopId, status: 'COMPLETED' } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const salesTrend = this.aggregateSalesByDay(sales);

    const todayRevenue = todaySales._sum.grandTotal || 0;
    const todayExpensesAmount = todayExpenses._sum.amount || 0;
    const grossProfitToday = todayRevenue - cogs;
    const netProfitToday = grossProfitToday - todayExpensesAmount;

    const actionItems: Array<{ type: string; label: string; count: number; severity: string }> = [];
    if (lowStockCount > 0) actionItems.push({ type: 'low_stock', label: 'Low stock items', count: lowStockCount, severity: 'warning' });
    if (unclosedShifts > 0) actionItems.push({ type: 'open_shifts', label: 'Unclosed shifts', count: unclosedShifts, severity: 'warning' });
    if (pendingExpenses > 0) actionItems.push({ type: 'pending_expenses', label: 'Expenses awaiting approval', count: pendingExpenses, severity: 'info' });
    const overdueCredit = await prisma.customer.count({ where: { shopId, isArchived: false, outstandingBalance: { gt: 0 } } });
    if (overdueCredit > 0) actionItems.push({ type: 'overdue_credit', label: 'Customers with outstanding credit', count: overdueCredit, severity: 'warning' });

    return {
      todaySales: todayRevenue,
      todayProfit: netProfitToday,
      todayGrossProfit: grossProfitToday,
      todayCogs: cogs,
      todayExpenses: todayExpensesAmount,
      transactionsToday,
      cashInHand: 0,
      mobileMoneyReceived: 0,
      creditGivenToday: creditGivenToday._sum.grandTotal || 0,
      expensesToday: todayExpensesAmount,
      lowStockItems: lowStockCount,
      outstandingCredit: outstandingCredit._sum.outstandingBalance || 0,
      stockValue: stockValueComputed,
      stockItems: stockValue._sum.stockQuantity || 0,
      pendingOrders: 0,
      totalCustomers: customerCount,
      activeLoans: activeLoansCount,
      subscriptionStatus: 'active',
      lastSyncStatus: 'synced',
      salesTrend,
      topProducts: topProducts.map((p) => ({
        name: products.find((prod) => prod.id === p.productId)?.name || 'Unknown',
        quantity: p._sum.quantity || 0,
      })),
      actionItems,
    };
  }

  async getEmployeeDashboard(userId: string, shopId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeShift, todaySales, totalItemsAgg] = await Promise.all([
      prisma.shift.findFirst({
        where: { userId, shopId, isActive: true },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.sale.findMany({
        where: { shopId, userId, status: 'COMPLETED', saleDate: { gte: today, lt: tomorrow } },
        orderBy: { saleDate: 'desc' },
        include: { items: true, customer: { select: { name: true } } },
      }),
      prisma.saleItem.aggregate({
        where: { sale: { shopId, userId, status: 'COMPLETED', saleDate: { gte: today, lt: tomorrow } } },
        _sum: { quantity: true },
      }),
    ]);

    const todayTotal = todaySales.reduce((s, sale) => s + sale.grandTotal, 0);
    const transactions = todaySales.length;
    const itemsSold = totalItemsAgg._sum.quantity || 0;
    const averageSale = transactions > 0 ? todayTotal / transactions : 0;

    return {
      user: { id: userId },
      shiftStatus: activeShift ? 'OPEN' : 'CLOSED',
      activeShift,
      todaySales: todayTotal,
      transactions,
      itemsSold,
      averageSale,
      recentSales: todaySales.slice(0, 10),
    };
  }

  async getCombinedDashboard(userId: string) {
    const shops = await prisma.shop.findMany({
      where: {
        isArchived: false,
        OR: [
          { ownerId: userId },
          { employees: { some: { userId, isActive: true } } },
        ],
      },
      select: { id: true, name: true },
    });

    const dashboards = await Promise.all(
      shops.map(async (shop) => ({
        shopId: shop.id,
        shopName: shop.name,
        dashboard: await this.getDashboard(shop.id, userId),
      }))
    );

    return dashboards;
  }

  async verifyShopAccess(shopId: string, userId: string) {
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, ownerId: userId, isArchived: false },
    });

    // If not owner, check if employee
    if (!shop) {
      const employee = await prisma.employee.findFirst({
        where: { userId, shopId, isActive: true },
      });
      if (!employee) {
        throw { status: 403, code: 'FORBIDDEN', message: 'Access denied to this shop' };
      }
      return employee;
    }

    return shop;
  }

  private aggregateSalesByDay(sales: Array<{ grandTotal: number; saleDate: Date }>) {
    const grouped: Record<string, number> = {};
    for (const sale of sales) {
      const day = sale.saleDate.toISOString().split('T')[0];
      grouped[day] = (grouped[day] || 0) + sale.grandTotal;
    }
    return Object.entries(grouped).map(([date, total]) => ({ date, total }));
  }
}

export const shopService = new ShopService();
