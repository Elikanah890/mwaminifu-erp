import prisma from '../config/database';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

const DAY_MS = 24 * 60 * 60 * 1000;

type TrendBucket = { start: Date; end: Date; label: string };

/**
 * Builds continuous time buckets for the sales trend so the chart never shows
 * gaps (every day/hour/month in the range is present, zero-filled).
 */
function buildTrendBuckets(range: string, from?: string, to?: string): TrendBucket[] {
  const now = new Date();
  const buckets: TrendBucket[] = [];
  const labelDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (range === 'today') {
    const start = startOfDay(now);
    for (let h = 0; h < 24; h++) {
      const s = new Date(start); s.setHours(h);
      const e = new Date(start); e.setHours(h + 1);
      buckets.push({ start: s, end: e, label: `${String(h).padStart(2, '0')}:00` });
    }
    return buckets;
  }

  if (range === 'year') {
    const base = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    for (let i = 0; i < 12; i++) {
      const s = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const e = new Date(base.getFullYear(), base.getMonth() + i + 1, 1);
      buckets.push({ start: s, end: e, label: s.toLocaleDateString('en-US', { month: 'short' }) });
    }
    return buckets;
  }

  if (range === 'custom') {
    const f = from && !isNaN(new Date(from).getTime()) ? startOfDay(new Date(from)) : addDays(startOfDay(now), -29);
    const t = to && !isNaN(new Date(to).getTime()) ? startOfDay(new Date(to)) : startOfDay(now);
    const total = Math.max(1, Math.min(180, Math.round((t.getTime() - f.getTime()) / DAY_MS) + 1));
    for (let i = 0; i < total; i++) {
      const s = addDays(f, i);
      buckets.push({ start: s, end: addDays(s, 1), label: labelDay(s) });
    }
    return buckets;
  }

  const days = range === '30d' ? 30 : range === '3m' ? 90 : 7;
  const startDay = addDays(startOfDay(now), -(days - 1));
  for (let i = 0; i < days; i++) {
    const s = addDays(startDay, i);
    buckets.push({ start: s, end: addDays(s, 1), label: labelDay(s) });
  }
  return buckets;
}

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

  async getDashboard(
    shopId: string,
    ownerId: string,
    opts: { range?: string; from?: string; to?: string } = {}
  ) {
    await this.verifyShopAccess(shopId, ownerId);

    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    const yesterday = addDays(today, -1);
    const weekAgo = addDays(today, -6);
    const twoWeeksAgo = addDays(today, -14);
    const sevenDaysFromNow = addDays(today, 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const range = opts.range || '7d';

    const [
      lowStockCount, activeLoansCount, customerCount, stockItemsAgg,
      outstandingCredit, unclosedShifts, pendingExpenses, stockValueComputed,
      sales14, items14, expenses14, cashAgg, loanOutstandingAgg,
    ] = await Promise.all([
      prisma.product.count({
        where: { shopId, isActive: true, stockQuantity: { lte: prisma.product.fields.reorderLevel } },
      }),
      prisma.loan.count({ where: { shopId, status: 'ACTIVE' } }),
      prisma.customer.count({ where: { shopId, isArchived: false } }),
      prisma.product.aggregate({ where: { shopId, isActive: true }, _sum: { stockQuantity: true } }),
      prisma.customer.aggregate({ where: { shopId, isArchived: false }, _sum: { outstandingBalance: true } }),
      prisma.shift.count({ where: { shopId, isActive: true } }),
      prisma.expense.count({ where: { shopId, approvalStatus: 'PENDING' } }),
      prisma.product.findMany({ where: { shopId, isActive: true }, select: { costPrice: true, stockQuantity: true } }),
      prisma.sale.findMany({
        where: { shopId, status: 'COMPLETED', saleDate: { gte: twoWeeksAgo, lt: tomorrow } },
        select: { grandTotal: true, saleDate: true },
      }),
      prisma.saleItem.findMany({
        where: { sale: { shopId, status: 'COMPLETED', saleDate: { gte: twoWeeksAgo, lt: tomorrow } } },
        select: { quantity: true, costPrice: true, baseUnitsPerConfig: true, sale: { select: { saleDate: true } } },
      }),
      prisma.expense.findMany({
        where: { shopId, approvalStatus: { not: 'REJECTED' }, expenseDate: { gte: twoWeeksAgo, lt: tomorrow } },
        select: { amount: true, expenseDate: true },
      }),
      prisma.cashTransaction.aggregate({ where: { shopId }, _sum: { amount: true } }),
      prisma.loan.aggregate({ where: { shopId, status: 'ACTIVE' }, _sum: { remainingBalance: true } }),
    ]);

    const stockValue = stockValueComputed.reduce((s, p) => s + p.costPrice * p.stockQuantity, 0);
    const customerCreditReceivable = outstandingCredit._sum.outstandingBalance || 0;
    const businessLoansOutstanding = loanOutstandingAgg._sum.remainingBalance || 0;

    // Capital injections/drawings are not part of the cash ledger, so add their net.
    const capitalTx = await prisma.ownerCapitalTransaction.findMany({
      where: { shopId },
      select: { type: true, amount: true, createdAt: true },
    });
    const capitalNet = capitalTx.reduce(
      (s, t) => s + (t.type === 'INJECTION' ? t.amount : -t.amount),
      0
    );
    const cashBalance = (cashAgg._sum.amount || 0) + capitalNet;

    const netBusinessValue = stockValue + cashBalance + customerCreditReceivable - businessLoansOutstanding;

    // ---- Windowed sales / cogs / expenses (today, yesterday, week, prev week) ----
    const sumIn = <T,>(arr: T[], at: (t: T) => Date, val: (t: T) => number, start: Date, end: Date) =>
      arr.filter((t) => { const d = at(t); return d >= start && d < end; }).reduce((s, t) => s + val(t), 0);

    const salesOn = (start: Date, end: Date) => sumIn(sales14, (s) => s.saleDate, (s) => s.grandTotal, start, end);
    const cogsOn = (start: Date, end: Date) =>
      sumIn(items14, (i) => i.sale.saleDate, (i) => (i.costPrice || 0) * i.quantity * (i.baseUnitsPerConfig || 1), start, end);
    const expOn = (start: Date, end: Date) => sumIn(expenses14, (e) => e.expenseDate, (e) => e.amount, start, end);

    const todaySales = salesOn(today, tomorrow);
    const yesterdaySales = salesOn(yesterday, today);
    const weekSales = salesOn(weekAgo, tomorrow);
    const prevWeekSales = salesOn(twoWeeksAgo, weekAgo);

    const cogs = cogsOn(today, tomorrow);
    const yesterdayCogs = cogsOn(yesterday, today);
    const weekCogs = cogsOn(weekAgo, tomorrow);
    const prevWeekCogs = cogsOn(twoWeeksAgo, weekAgo);

    const todayExpensesAmount = expOn(today, tomorrow);
    const yesterdayExpenses = expOn(yesterday, today);
    const weekExpenses = expOn(weekAgo, tomorrow);
    const prevWeekExpenses = expOn(twoWeeksAgo, weekAgo);

    const grossProfitToday = todaySales - cogs;
    const netProfitToday = grossProfitToday - todayExpensesAmount;
    const yesterdayProfit = yesterdaySales - yesterdayCogs - yesterdayExpenses;
    const weekProfit = weekSales - weekCogs - weekExpenses;
    const prevWeekProfit = prevWeekSales - prevWeekCogs - prevWeekExpenses;

    const creditGivenToday = await prisma.sale.aggregate({
      where: {
        shopId,
        status: 'COMPLETED',
        saleDate: { gte: today, lt: tomorrow },
        paymentDetails: { string_contains: '"credit"' },
      },
      _sum: { grandTotal: true },
    });

    // ---- Comparisons (% vs yesterday / last week) ----
    const ledger7 = await prisma.creditLedgerEntry.findMany({
      where: { customer: { shopId }, createdAt: { gte: weekAgo } },
      select: { type: true, amount: true },
    });
    const charged7 = ledger7.filter((e) => e.type === 'CHARGE').reduce((s, e) => s + e.amount, 0);
    const repaid7 = ledger7
      .filter((e) => e.type === 'REPAYMENT' || e.type === 'WRITE_OFF')
      .reduce((s, e) => s + e.amount, 0);
    const creditPrev = customerCreditReceivable - charged7 + repaid7;

    // Net cash movement over the last 7 days (ledger + capital).
    const cashNet7 = (await prisma.cashTransaction.aggregate({
      where: { shopId, createdAt: { gte: weekAgo } },
      _sum: { amount: true },
    }))._sum.amount || 0;
    const capitalNet7 = capitalTx
      .filter((t) => t.createdAt >= weekAgo)
      .reduce((s, t) => s + (t.type === 'INJECTION' ? t.amount : -t.amount), 0);
    const cash7Ago = cashBalance - (cashNet7 + capitalNet7);

    const comparisons = {
      sales: { yesterday: pctChange(todaySales, yesterdaySales), week: pctChange(weekSales, prevWeekSales) },
      profit: { yesterday: pctChange(netProfitToday, yesterdayProfit), week: pctChange(weekProfit, prevWeekProfit) },
      expenses: { yesterday: pctChange(todayExpensesAmount, yesterdayExpenses), week: pctChange(weekExpenses, prevWeekExpenses) },
      cash: { week: pctChange(cashBalance, cash7Ago) },
      credit: { week: pctChange(customerCreditReceivable, creditPrev) },
      stock: { week: 0 },
      loans: { week: 0 },
    };

    // ---- Sales trend (continuous buckets for the selected range) ----
    const buckets = buildTrendBuckets(range, opts.from, opts.to);
    const trendStart = buckets[0].start;
    const trendEnd = buckets[buckets.length - 1].end;
    const trendSales = trendStart
      ? await prisma.sale.findMany({
          where: { shopId, status: 'COMPLETED', saleDate: { gte: trendStart, lt: trendEnd } },
          select: { grandTotal: true, saleDate: true },
        })
      : [];
    const salesTrend = buckets.map((b) => ({
      date: b.label,
      total: trendSales.filter((s) => s.saleDate >= b.start && s.saleDate < b.end).reduce((x, s) => x + s.grandTotal, 0),
    }));

    // ---- Valuation trend (last 30 days, running cash + constant assets/liabilities) ----
    const valStart = addDays(today, -29);
    const [cashOpening, cashWindow, capitalOpening, capitalWindow] = await Promise.all([
      prisma.cashTransaction.aggregate({ where: { shopId, createdAt: { lt: valStart } }, _sum: { amount: true } }),
      prisma.cashTransaction.findMany({ where: { shopId, createdAt: { gte: valStart } }, select: { amount: true, createdAt: true } }),
      prisma.ownerCapitalTransaction.findMany({ where: { shopId, createdAt: { lt: valStart } }, select: { type: true, amount: true } }),
      prisma.ownerCapitalTransaction.findMany({ where: { shopId, createdAt: { gte: valStart } }, select: { type: true, amount: true, createdAt: true } }),
    ]);
    const capitalNetBefore = capitalOpening.reduce((s, t) => s + (t.type === 'INJECTION' ? t.amount : -t.amount), 0);
    const cashBase = (cashOpening._sum.amount || 0) + capitalNetBefore;
    const valuationTrend = Array.from({ length: 30 }).map((_, i) => {
      const dayStart = addDays(valStart, i);
      const dayEnd = addDays(dayStart, 1);
      const cashTo = cashBase
        + cashWindow.filter((t) => t.createdAt < dayEnd).reduce((s, t) => s + t.amount, 0)
        + capitalWindow.filter((t) => t.createdAt < dayEnd).reduce((s, t) => s + (t.type === 'INJECTION' ? t.amount : -t.amount), 0);
      return {
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        iso: dayStart.toISOString().slice(0, 10),
        total: Math.round(stockValue + cashTo + customerCreditReceivable - businessLoansOutstanding),
      };
    });

    // ---- Top products (quantity, revenue, profit, 7d trend) ----
    const topRows = await prisma.$queryRaw<Array<{
      productId: string; name: string; quantity: number; revenue: number; profit: number;
      current_qty: number; prev_qty: number;
    }>>`
      SELECT si."productId", p.name,
        COALESCE(SUM(si.quantity * si."baseUnitsPerConfig"), 0)::float8 AS quantity,
        COALESCE(SUM(si.total), 0)::float8 AS revenue,
        COALESCE(SUM(si.total - si."costPrice" * si.quantity * si."baseUnitsPerConfig"), 0)::float8 AS profit,
        COALESCE(SUM(CASE WHEN s."saleDate" >= ${weekAgo} THEN si.quantity * si."baseUnitsPerConfig" ELSE 0 END), 0)::float8 AS current_qty,
        COALESCE(SUM(CASE WHEN s."saleDate" >= ${twoWeeksAgo} AND s."saleDate" < ${weekAgo} THEN si.quantity * si."baseUnitsPerConfig" ELSE 0 END), 0)::float8 AS prev_qty
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si."saleId"
      JOIN "Product" p ON p.id = si."productId"
      WHERE s."shopId" = ${shopId} AND s.status = 'COMPLETED' AND s."deletedAt" IS NULL
      GROUP BY si."productId", p.name
      ORDER BY quantity DESC
      LIMIT 5
    `;
    const topProducts = topRows.map((r) => ({
      productId: r.productId,
      name: r.name,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
      profit: Number(r.profit),
      trend: pctChange(Number(r.current_qty), Number(r.prev_qty)),
    }));

    // ---- This month at a glance ----
    const [monthSalesAgg, monthItems, monthExpAgg, topCustomerGroup, bestProductGroup] = await Promise.all([
      prisma.sale.aggregate({ where: { shopId, status: 'COMPLETED', saleDate: { gte: monthStart } }, _sum: { grandTotal: true } }),
      prisma.saleItem.findMany({
        where: { sale: { shopId, status: 'COMPLETED', saleDate: { gte: monthStart } } },
        select: { quantity: true, costPrice: true, baseUnitsPerConfig: true },
      }),
      prisma.expense.aggregate({ where: { shopId, approvalStatus: { not: 'REJECTED' }, expenseDate: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.sale.groupBy({
        by: ['customerId'],
        where: { shopId, status: 'COMPLETED', saleDate: { gte: monthStart }, customerId: { not: null } },
        _sum: { grandTotal: true },
        orderBy: { _sum: { grandTotal: 'desc' } },
        take: 1,
      }),
      prisma.$queryRaw<Array<{ productId: string; qty: number }>>`
        SELECT si."productId", COALESCE(SUM(si.quantity * si."baseUnitsPerConfig"), 0)::float8 AS qty
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."shopId" = ${shopId} AND s.status = 'COMPLETED' AND s."saleDate" >= ${monthStart}
        GROUP BY si."productId"
        ORDER BY qty DESC
        LIMIT 1
      `,
    ]);
    const monthRevenue = monthSalesAgg._sum.grandTotal || 0;
    const monthCogs = monthItems.reduce((s, i) => s + (i.costPrice || 0) * i.quantity * (i.baseUnitsPerConfig || 1), 0);
    const monthExpenses = monthExpAgg._sum.amount || 0;
    const topCustomerId = topCustomerGroup[0]?.customerId ?? null;
    const bestProductId = bestProductGroup[0]?.productId ?? null;
    const [topCustomer, bestProduct] = await Promise.all([
      topCustomerId ? prisma.customer.findUnique({ where: { id: topCustomerId }, select: { name: true } }) : null,
      bestProductId ? prisma.product.findUnique({ where: { id: bestProductId }, select: { name: true } }) : null,
    ]);
    const monthGlance = {
      sales: monthRevenue,
      profit: monthRevenue - monthCogs - monthExpenses,
      topCustomer: topCustomer?.name ?? null,
      topCustomerAmount: topCustomerGroup[0]?._sum.grandTotal ?? 0,
      bestProduct: bestProduct?.name ?? null,
      bestProductQuantity: Number(bestProductGroup[0]?.qty ?? 0),
    };

    // ---- Action required ----
    const [payablesDue, loansDue, subscriptionsExpiring, customersWithDebt] = await Promise.all([
      prisma.purchase.count({ where: { shopId, deletedAt: null, paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, dueDate: { not: null, lte: sevenDaysFromNow } } }),
      prisma.loan.count({ where: { shopId, status: 'ACTIVE', dueDate: { not: null, lte: sevenDaysFromNow } } }),
      prisma.subscription.count({ where: { shopId, isActive: true, endDate: { not: null, lte: addDays(today, 14) } } }),
      prisma.customer.count({ where: { shopId, isArchived: false, outstandingBalance: { gt: 0 } } }),
    ]);

    const actionItems: Array<{ type: string; label: string; count: number; severity: string }> = [];
    if (lowStockCount > 0) actionItems.push({ type: 'low_stock', label: 'Low stock items', count: lowStockCount, severity: 'warning' });
    if (unclosedShifts > 0) actionItems.push({ type: 'open_shifts', label: 'Unclosed shifts', count: unclosedShifts, severity: 'warning' });
    if (pendingExpenses > 0) actionItems.push({ type: 'pending_expenses', label: 'Expenses awaiting approval', count: pendingExpenses, severity: 'info' });
    if (customersWithDebt > 0) actionItems.push({ type: 'overdue_credit', label: 'Customers with outstanding credit', count: customersWithDebt, severity: 'warning' });
    if (payablesDue > 0) actionItems.push({ type: 'payables_due', label: 'Payables due soon', count: payablesDue, severity: 'warning' });
    if (loansDue > 0) actionItems.push({ type: 'loans_due', label: 'Loan repayments due soon', count: loansDue, severity: 'warning' });
    if (subscriptionsExpiring > 0) actionItems.push({ type: 'subscription_expiring', label: 'Subscription expiring', count: subscriptionsExpiring, severity: 'info' });

    return {
      todaySales,
      todayProfit: netProfitToday,
      todayGrossProfit: grossProfitToday,
      todayCogs: cogs,
      todayExpenses: todayExpensesAmount,
      transactionsToday: sales14.filter((s) => s.saleDate >= today && s.saleDate < tomorrow).length,
      cashInHand: cashBalance,
      mobileMoneyReceived: 0,
      creditGivenToday: creditGivenToday._sum.grandTotal || 0,
      expensesToday: todayExpensesAmount,
      lowStockItems: lowStockCount,
      outstandingCredit: customerCreditReceivable,
      stockValue,
      stockItems: stockItemsAgg._sum.stockQuantity || 0,
      pendingOrders: 0,
      totalCustomers: customerCount,
      activeLoans: activeLoansCount,
      subscriptionStatus: 'active',
      lastSyncStatus: 'synced',
      salesTrend,
      topProducts,
      actionItems,
      // Extended (Spec 8.6 / 8.6a)
      cashBalance,
      customerCreditReceivable,
      businessLoansOutstanding,
      netBusinessValue,
      valuationTrend,
      comparisons,
      monthGlance,
      range,
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

}

export const shopService = new ShopService();
