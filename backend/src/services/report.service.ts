import prisma from '../config/database';

export class ReportService {
  async salesReport(shopId: string, from?: string, to?: string) {
    const { fromDate, toDate } = this.getDateRange(from, to);

    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        status: 'COMPLETED',
        saleDate: { gte: fromDate, lte: toDate },
      },
      include: {
        items: { include: { product: { select: { name: true } } } },
        user: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { saleDate: 'desc' },
    });

    const summary = {
      totalSales: sales.reduce((s, sale) => s + sale.grandTotal, 0),
      totalItems: sales.reduce((s, sale) => s + sale.items.reduce((i, item) => i + item.quantity, 0), 0),
      averageTicket: sales.length > 0
        ? sales.reduce((s, sale) => s + sale.grandTotal, 0) / sales.length
        : 0,
      totalTransactions: sales.length,
    };

    return { summary, data: sales };
  }

  async inventoryValuation(shopId: string) {
    const products = await prisma.product.findMany({
      where: { shopId, isActive: true },
      select: { name: true, sku: true, costPrice: true, sellingPrice: true, stockQuantity: true },
      orderBy: { name: 'asc' },
    });

    const totalValue = products.reduce((s, p) => s + p.costPrice * p.stockQuantity, 0);
    const totalRetailValue = products.reduce((s, p) => s + p.sellingPrice * p.stockQuantity, 0);
    const totalItems = products.reduce((s, p) => s + p.stockQuantity, 0);

    return {
      summary: { totalValue, totalRetailValue, totalItems, totalProducts: products.length },
      data: products,
    };
  }

  async profitReport(shopId: string, from?: string, to?: string) {
    const { fromDate, toDate } = this.getDateRange(from, to);

    const [sales, expenses, saleItems] = await Promise.all([
      prisma.sale.findMany({
        where: { shopId, status: 'COMPLETED', saleDate: { gte: fromDate, lte: toDate } },
        select: { grandTotal: true, discount: true, saleDate: true },
      }),
      prisma.expense.findMany({
        where: { shopId, expenseDate: { gte: fromDate, lte: toDate } },
        select: { amount: true, category: true },
      }),
      prisma.saleItem.findMany({
        where: { sale: { shopId, status: 'COMPLETED', saleDate: { gte: fromDate, lte: toDate } } },
        select: { quantity: true, costPrice: true },
      }),
    ]);

    const totalRevenue = sales.reduce((s, sale) => s + sale.grandTotal, 0);
    const totalDiscounts = sales.reduce((s, sale) => s + sale.discount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const cogs = saleItems.reduce((s, i) => s + (i.costPrice || 0) * i.quantity, 0);
    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return {
      summary: {
        totalRevenue,
        totalDiscounts,
        totalExpenses,
        cogs,
        grossProfit,
        netProfit,
        estimatedProfit: netProfit,
      },
      expensesByCategory: this.groupByCategory(expenses),
    };
  }

  async expensesReport(shopId: string, from?: string, to?: string) {
    const { fromDate, toDate } = this.getDateRange(from, to);

    const expenses = await prisma.expense.findMany({
      where: { shopId, expenseDate: { gte: fromDate, lte: toDate } },
      include: { user: { select: { name: true } } },
      orderBy: { expenseDate: 'desc' },
    });

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    return {
      summary: { totalExpenses, totalTransactions: expenses.length },
      byCategory: this.groupByCategory(expenses.map((e) => ({ amount: e.amount, category: e.category }))),
      data: expenses,
    };
  }

  async creditReport(shopId: string) {
    const customers = await prisma.customer.findMany({
      where: { shopId, isArchived: false, outstandingBalance: { gt: 0 } },
      orderBy: { outstandingBalance: 'desc' },
    });

    const totalOutstanding = customers.reduce((s, c) => s + c.outstandingBalance, 0);

    return {
      summary: { totalOutstanding, customersWithDebt: customers.length },
      data: customers,
    };
  }

  async loansReport(shopId: string) {
    const loans = await prisma.loan.findMany({
      where: { shopId },
      include: { repayments: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalBorrowed = loans.reduce((s, l) => s + l.amount, 0);
    const totalOutstanding = loans.reduce((s, l) => s + l.remainingBalance, 0);
    const totalRepaid = totalBorrowed - totalOutstanding;

    return {
      summary: { totalBorrowed, totalOutstanding, totalRepaid, totalLoans: loans.length },
      data: loans,
    };
  }

  async cashFlowReport(shopId: string, from?: string, to?: string) {
    const { fromDate, toDate } = this.getDateRange(from, to);

    const [sales, expenses, creditPayments] = await Promise.all([
      prisma.sale.findMany({
        where: { shopId, status: 'COMPLETED', saleDate: { gte: fromDate, lte: toDate } },
        select: { grandTotal: true, paymentDetails: true, saleDate: true },
      }),
      prisma.expense.findMany({
        where: { shopId, expenseDate: { gte: fromDate, lte: toDate } },
        select: { amount: true, expenseDate: true },
      }),
      prisma.creditPayment.findMany({
        where: {
          customer: { shopId },
          paymentDate: { gte: fromDate, lte: toDate },
        },
        select: { amount: true, paymentDate: true },
      }),
    ]);

    const totalInflow = sales.reduce((s, sale) => s + sale.grandTotal, 0) +
      creditPayments.reduce((s, p) => s + p.amount, 0);
    const totalOutflow = expenses.reduce((s, e) => s + e.amount, 0);

    return {
      summary: {
        totalInflow,
        totalOutflow,
        netCashFlow: totalInflow - totalOutflow,
        creditCollections: creditPayments.reduce((s, p) => s + p.amount, 0),
      },
    };
  }

  async employeeReport(shopId: string, from?: string, to?: string) {
    const { fromDate, toDate } = this.getDateRange(from, to);

    const employees = await prisma.employee.findMany({
      where: { shopId, isActive: true },
      include: { user: { select: { name: true } } },
    });

    const employeeStats = await Promise.all(
      employees.map(async (emp) => {
        const sales = await prisma.sale.findMany({
          where: { shopId, userId: emp.userId, status: 'COMPLETED', saleDate: { gte: fromDate, lte: toDate } },
          select: { grandTotal: true },
        });

        return {
          employeeId: emp.id,
          name: emp.user.name,
          role: emp.role,
          totalSales: sales.reduce((s, sale) => s + sale.grandTotal, 0),
          totalTransactions: sales.length,
        };
      })
    );

    return { data: employeeStats };
  }

  async paymentMethodsReport(shopId: string, from?: string, to?: string) {
    const { fromDate, toDate } = this.getDateRange(from, to);

    const sales = await prisma.sale.findMany({
      where: { shopId, status: 'COMPLETED', saleDate: { gte: fromDate, lte: toDate } },
      select: { paymentDetails: true },
    });

    const breakdown: Record<string, number> = {};
    for (const sale of sales) {
      const payments = (sale.paymentDetails as Array<{ method: string; amount: number }>) || [];
      for (const payment of payments) {
        breakdown[payment.method] = (breakdown[payment.method] || 0) + payment.amount;
      }
    }

    return { data: breakdown };
  }

  private getDateRange(from?: string, to?: string) {
    const toDate = to && !isNaN(new Date(to).getTime()) ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const fromDate = from && !isNaN(new Date(from).getTime())
      ? new Date(from)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);

    return { fromDate, toDate };
  }

  private groupByCategory(items: Array<{ amount: number; category: string }>) {
    const grouped: Record<string, number> = {};
    for (const item of items) {
      grouped[item.category] = (grouped[item.category] || 0) + item.amount;
    }
    return Object.entries(grouped).map(([category, total]) => ({ category, total }));
  }
}

export const reportService = new ReportService();
