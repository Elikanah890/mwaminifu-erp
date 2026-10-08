import prisma from '../config/database';

function nextDateFor(frequency: string, dayOfWeek?: number | null, dayOfMonth?: number | null, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);

  if (frequency === 'DAILY') {
    d.setDate(d.getDate() + 1);
    return d;
  }

  if (frequency === 'WEEKLY') {
    // dayOfWeek: 0 = Sunday ... 6 = Saturday
    const target = dayOfWeek ?? d.getDay();
    const daysAhead = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (daysAhead === 0 ? 7 : daysAhead));
    return d;
  }

  // MONTHLY
  const targetDay = Math.min(Math.max(dayOfMonth ?? 1, 1), 28);
  const now = new Date(from);
  const year = now.getFullYear();
  const month = now.getMonth();
  const candidate = new Date(year, month, targetDay);
  if (candidate <= now) {
    return new Date(year, month + 1, targetDay);
  }
  return candidate;
}

export class RecurringService {
  async list(shopId: string) {
    return prisma.recurringExpense.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    shopId: string,
    data: { category: string; amount: number; frequency: string; dayOfWeek?: number; dayOfMonth?: number; nextDate?: string }
  ) {
    const nextDate = data.nextDate
      ? new Date(data.nextDate)
      : nextDateFor(data.frequency, data.dayOfWeek, data.dayOfMonth);
    return prisma.recurringExpense.create({
      data: {
        shopId,
        category: data.category,
        amount: data.amount,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek ?? null,
        dayOfMonth: data.dayOfMonth ?? null,
        nextDate,
        isActive: true,
      },
    });
  }

  async toggle(shopId: string, id: string) {
    const item = await prisma.recurringExpense.findFirst({ where: { id, shopId } });
    if (!item) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Recurring expense not found' };
    }
    return prisma.recurringExpense.update({
      where: { id },
      data: { isActive: !item.isActive },
    });
  }

  async remove(shopId: string, id: string) {
    const item = await prisma.recurringExpense.findFirst({ where: { id, shopId } });
    if (!item) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Recurring expense not found' };
    }
    return prisma.recurringExpense.delete({ where: { id } });
  }

  async generateDue(shopId: string, userId: string) {
    const now = new Date();
    const due = await prisma.recurringExpense.findMany({
      where: { shopId, isActive: true, nextDate: { lte: now } },
    });

    let created = 0;
    for (const item of due) {
      await prisma.$transaction(async (tx) => {
        await tx.expense.create({
          data: {
            shopId,
            userId,
            category: item.category,
            amount: item.amount,
            description: `Recurring (${item.frequency.toLowerCase()})`,
            expenseDate: item.nextDate,
          },
        });

        // Advance nextDate until it is in the future (catch up missed periods).
        let next = item.nextDate;
        while (next <= now) {
          next = nextDateFor(item.frequency, item.dayOfWeek, item.dayOfMonth, next);
        }
        await tx.recurringExpense.update({ where: { id: item.id }, data: { nextDate: next } });
        created += 1;
      });
    }

    return { generated: created };
  }
}

export const recurringService = new RecurringService();
