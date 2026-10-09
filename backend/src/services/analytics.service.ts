import prisma from '../config/database';

export type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun .. 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export class AnalyticsService {
  private resolveRange(period: Period, from?: string, to?: string): DateRange {
    const now = new Date();
    const toDate = to && !isNaN(new Date(to).getTime()) ? new Date(to) : now;
    toDate.setHours(23, 59, 59, 999);

    let fromDate: Date;
    switch (period) {
      case 'today':
        fromDate = startOfDay(now);
        break;
      case 'week':
        fromDate = startOfWeek(now);
        break;
      case 'month':
        fromDate = startOfMonth(now);
        break;
      case 'year':
        fromDate = startOfYear(now);
        break;
      case 'custom':
        fromDate = from && !isNaN(new Date(from).getTime()) ? new Date(from) : new Date(now.getTime() - 30 * DAY);
        fromDate.setHours(0, 0, 0, 0);
        break;
      default:
        fromDate = new Date(now.getTime() - 30 * DAY);
        fromDate.setHours(0, 0, 0, 0);
    }
    return { from: fromDate, to: toDate };
  }

  private groupLabel(period: Period, d: Date): string {
    if (period === 'year') {
      return d.toLocaleDateString('en-US', { month: 'short' });
    }
    if (period === 'month') {
      return d.toISOString().slice(0, 10).slice(8, 10);
    }
    return d.toISOString().slice(0, 10);
  }

  async sales(shopId: string, period: Period = 'month', from?: string, to?: string) {
    const { from: fromDate, to: toDate } = this.resolveRange(period, from, to);
    const prevFrom = new Date(fromDate.getTime() - (toDate.getTime() - fromDate.getTime()));

    const sales = await prisma.sale.findMany({
      where: { shopId, status: 'COMPLETED', saleDate: { gte: fromDate, lte: toDate } },
      include: {
        items: { include: { product: { select: { name: true, category: { select: { name: true } } } } } },
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { saleDate: 'asc' },
    });

    const totalRevenue = sales.reduce((s, x) => s + x.grandTotal, 0);
    const totalItems = sales.reduce((s, x) => s + x.items.reduce((i, it) => i + it.quantity * (it.baseUnitsPerConfig || 1), 0), 0);
    const totalDiscounts = sales.reduce((s, x) => s + x.discount, 0);
    const totalTransactions = sales.length;
    const customers = new Set(sales.map((x) => x.customerId).filter(Boolean)).size;

    // Payment methods
    const payMap: Record<string, number> = {};
    for (const s of sales) {
      for (const p of (s.paymentDetails as Array<{ method: string; amount: number }>) || []) {
        payMap[p.method] = (payMap[p.method] || 0) + p.amount;
      }
    }

    // Trend grouped by label
    const trendMap: Record<string, number> = {};
    for (const s of sales) {
      const label = this.groupLabel(period, s.saleDate);
      trendMap[label] = (trendMap[label] || 0) + s.grandTotal;
    }
    const trend = Object.entries(trendMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));

    // Per product
    const productMap: Record<string, { name: string; category: string; quantity: number; revenue: number; cogs: number }> = {};
    for (const s of sales) {
      for (const it of s.items) {
        const key = it.productId;
        if (!productMap[key]) {
          productMap[key] = { name: it.product.name, category: it.product.category?.name ?? 'Uncategorized', quantity: 0, revenue: 0, cogs: 0 };
        }
        productMap[key].quantity += it.quantity * (it.baseUnitsPerConfig || 1);
        productMap[key].revenue += it.total;
        productMap[key].cogs += (it.costPrice || 0) * it.quantity * (it.baseUnitsPerConfig || 1);
      }
    }

    // Previous period for trend comparison
    const prevItems = await prisma.saleItem.findMany({
      where: { sale: { shopId, status: 'COMPLETED', saleDate: { gte: prevFrom, lt: fromDate } } },
      select: { productId: true, quantity: true, baseUnitsPerConfig: true },
    });
    const prevQtyMap: Record<string, number> = {};
    for (const i of prevItems) prevQtyMap[i.productId] = (prevQtyMap[i.productId] || 0) + i.quantity * (i.baseUnitsPerConfig || 1);

    const perProduct = Object.entries(productMap)
      .map(([productId, p]) => {
        const prevQty = prevQtyMap[productId] || 0;
        const trendPct = prevQty > 0 ? ((p.quantity - prevQty) / prevQty) * 100 : 0;
        return {
          productId,
          name: p.name,
          category: p.category,
          quantity: p.quantity,
          revenue: p.revenue,
          cogs: p.cogs,
          profit: p.revenue - p.cogs,
          margin: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0,
          share: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
          trendPct,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Per category
    const catMap: Record<string, { quantity: number; revenue: number; profit: number }> = {};
    for (const p of perProduct) {
      if (!catMap[p.category]) catMap[p.category] = { quantity: 0, revenue: 0, profit: 0 };
      catMap[p.category].quantity += p.quantity;
      catMap[p.category].revenue += p.revenue;
      catMap[p.category].profit += p.profit;
    }
    const perCategory = Object.entries(catMap).map(([category, c]) => ({ category, ...c })).sort((a, b) => b.revenue - a.revenue);

    return {
      period,
      range: { from: fromDate, to: toDate },
      summary: {
        totalRevenue,
        totalTransactions,
        totalItems,
        averageSale: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        totalCustomers: customers,
        totalDiscounts,
        netSales: totalRevenue - totalDiscounts,
      },
      trend,
      paymentMethods: Object.entries(payMap).map(([method, amount]) => ({ method, amount })),
      perProduct,
      perCategory,
    };
  }

  async inventory(shopId: string) {
    const products = await prisma.product.findMany({
      where: { shopId, isActive: true },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    const totalValue = products.reduce((s, p) => s + p.costPrice * p.stockQuantity, 0);
    const totalRetailValue = products.reduce((s, p) => s + p.sellingPrice * p.stockQuantity, 0);
    const totalItems = products.reduce((s, p) => s + p.stockQuantity, 0);

    const lowStock = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.reorderLevel);
    const outOfStock = products.filter((p) => p.stockQuantity <= 0);

    const perProduct = products
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name ?? 'Uncategorized',
        stock: p.stockQuantity,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        reorderLevel: p.reorderLevel,
        value: p.costPrice * p.stockQuantity,
        status: p.stockQuantity <= 0 ? 'OUT' : p.stockQuantity <= p.reorderLevel ? 'LOW' : 'GOOD',
      }))
      .sort((a, b) => b.value - a.value);

    const catMap: Record<string, { value: number; items: number; products: number }> = {};
    for (const p of perProduct) {
      if (!catMap[p.category]) catMap[p.category] = { value: 0, items: 0, products: 0 };
      catMap[p.category].value += p.value;
      catMap[p.category].items += p.stock;
      catMap[p.category].products += 1;
    }
    const byCategory = Object.entries(catMap).map(([category, c]) => ({ category, ...c })).sort((a, b) => b.value - a.value);

    return {
      summary: {
        totalProducts: products.length,
        totalItems,
        totalValue,
        totalRetailValue,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
      },
      perProduct,
      byCategory,
    };
  }

  async profit(shopId: string, period: Period = 'month', from?: string, to?: string) {
    const { from: fromDate, to: toDate } = this.resolveRange(period, from, to);

    const [sales, saleItems, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: { shopId, status: 'COMPLETED', saleDate: { gte: fromDate, lte: toDate } },
        select: { grandTotal: true, discount: true, saleDate: true },
        orderBy: { saleDate: 'asc' },
      }),
      prisma.saleItem.findMany({
        where: { sale: { shopId, status: 'COMPLETED', saleDate: { gte: fromDate, lte: toDate } } },
        select: { quantity: true, costPrice: true, total: true, baseUnitsPerConfig: true, productId: true, product: { select: { name: true, category: { select: { name: true } } } } },
      }),
      prisma.expense.findMany({
        where: { shopId, expenseDate: { gte: fromDate, lte: toDate } },
        select: { amount: true, category: true },
      }),
    ]);

    const totalRevenue = sales.reduce((s, x) => s + x.grandTotal, 0);
    const totalDiscounts = sales.reduce((s, x) => s + x.discount, 0);
    const cogs = saleItems.reduce((s, i) => s + (i.costPrice || 0) * i.quantity * (i.baseUnitsPerConfig || 1), 0);
    const grossProfit = totalRevenue - cogs;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    // Profit trend
    const trendMap: Record<string, { revenue: number; profit: number }> = {};
    for (const s of sales) {
      const label = this.groupLabel(period, s.saleDate);
      if (!trendMap[label]) trendMap[label] = { revenue: 0, profit: 0 };
      trendMap[label].revenue += s.grandTotal;
    }
    const trend = Object.entries(trendMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, revenue: v.revenue }));

    // Per product profit
    const prodMap: Record<string, { name: string; category: string; revenue: number; cogs: number; quantity: number }> = {};
    for (const i of saleItems) {
      const key = i.productId;
      if (!prodMap[key]) prodMap[key] = { name: i.product.name, category: i.product.category?.name ?? 'Uncategorized', revenue: 0, cogs: 0, quantity: 0 };
      prodMap[key].revenue += i.total;
      prodMap[key].cogs += (i.costPrice || 0) * i.quantity * (i.baseUnitsPerConfig || 1);
      prodMap[key].quantity += i.quantity * (i.baseUnitsPerConfig || 1);
    }
    const perProduct = Object.entries(prodMap)
      .map(([productId, p]) => ({
        productId,
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        revenue: p.revenue,
        cogs: p.cogs,
        profit: p.revenue - p.cogs,
        margin: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    // Profit by category
    const catMap: Record<string, { revenue: number; profit: number }> = {};
    for (const p of perProduct) {
      if (!catMap[p.category]) catMap[p.category] = { revenue: 0, profit: 0 };
      catMap[p.category].revenue += p.revenue;
      catMap[p.category].profit += p.profit;
    }
    const perCategory = Object.entries(catMap).map(([category, c]) => ({ category, ...c })).sort((a, b) => b.profit - a.profit);

    return {
      period,
      summary: { totalRevenue, totalDiscounts, cogs, grossProfit, totalExpenses, netProfit, grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0, netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0 },
      trend,
      perProduct,
      perCategory,
      expensesByCategory: Object.entries(expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>)).map(([category, total]) => ({ category, total })),
    };
  }

  async valuation(shopId: string) {
    const [products, cashIn, credit, loans, purchases] = await Promise.all([
      prisma.product.findMany({ where: { shopId, isActive: true }, select: { costPrice: true, stockQuantity: true } }),
      prisma.cashTransaction.aggregate({ where: { shopId }, _sum: { amount: true } }),
      prisma.customer.aggregate({ where: { shopId, isArchived: false }, _sum: { outstandingBalance: true } }),
      prisma.loan.aggregate({ where: { shopId, status: 'ACTIVE' }, _sum: { remainingBalance: true } }),
      prisma.purchase.findMany({ where: { shopId, deletedAt: null, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } }, select: { total: true, amountPaid: true } }),
    ]);

    const stockValue = products.reduce((s, p) => s + p.costPrice * p.stockQuantity, 0);
    const cashBalance = cashIn._sum.amount || 0;
    const creditReceivable = credit._sum.outstandingBalance || 0;
    const loansOutstanding = loans._sum.remainingBalance || 0;
    const supplierPayables = purchases.reduce((s, p) => s + (p.total - p.amountPaid), 0);

    const totalAssets = stockValue + Math.max(0, cashBalance) + creditReceivable;
    const totalLiabilities = loansOutstanding + supplierPayables;
    const net = totalAssets - totalLiabilities;

    return {
      summary: {
        stockValue,
        cashBalance,
        creditReceivable,
        loansOutstanding,
        supplierPayables,
        totalAssets,
        totalLiabilities,
        net,
      },
      assets: [
        { name: 'stock', label: 'Stock Value', amount: stockValue },
        { name: 'cash', label: 'Cash Balance', amount: Math.max(0, cashBalance) },
        { name: 'credit', label: 'Credit Receivable', amount: creditReceivable },
      ],
      liabilities: [
        { name: 'loans', label: 'Loans Outstanding', amount: loansOutstanding },
        { name: 'payables', label: 'Supplier Payables', amount: supplierPayables },
      ],
    };
  }

  async financeOverview(shopId: string, period: Period = 'month', from?: string, to?: string) {
    const { from: fromDate, to: toDate } = this.resolveRange(period, from, to);

    const [sales, expenses, cash, credit, loans, payables] = await Promise.all([
      prisma.sale.aggregate({
        where: { shopId, status: 'COMPLETED', saleDate: { gte: fromDate, lte: toDate } },
        _sum: { grandTotal: true },
      }),
      prisma.expense.aggregate({
        where: { shopId, expenseDate: { gte: fromDate, lte: toDate }, approvalStatus: 'APPROVED' },
        _sum: { amount: true },
      }),
      prisma.cashTransaction.aggregate({ where: { shopId }, _sum: { amount: true } }),
      prisma.customer.aggregate({ where: { shopId, isArchived: false }, _sum: { outstandingBalance: true } }),
      prisma.loan.aggregate({ where: { shopId, status: 'ACTIVE' }, _sum: { remainingBalance: true } }),
      prisma.purchase.findMany({ where: { shopId, deletedAt: null, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } }, select: { total: true, amountPaid: true } }),
    ]);

    const revenue = sales._sum.grandTotal || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const cashBalance = cash._sum.amount || 0;
    const receivables = credit._sum.outstandingBalance || 0;
    const outstandingLoans = loans._sum.remainingBalance || 0;
    const supplierPayables = payables.reduce((s, p) => s + (p.total - p.amountPaid), 0);
    const netProfit = revenue - totalExpenses;

    return {
      period,
      range: { from: fromDate, to: toDate },
      summary: {
        revenue,
        expenses: totalExpenses,
        netProfit,
        cashBalance,
        receivables,
        payables: supplierPayables,
        outstandingLoans,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
