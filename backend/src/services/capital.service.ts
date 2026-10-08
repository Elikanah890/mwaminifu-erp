import prisma from '../config/database';

export class CapitalService {
  async list(shopId: string) {
    return prisma.ownerCapitalTransaction.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
  }

  async summary(shopId: string) {
    const txs = await prisma.ownerCapitalTransaction.findMany({
      where: { shopId },
      select: { type: true, amount: true },
    });
    const injections = txs.filter((t) => t.type === 'INJECTION').reduce((s, t) => s + t.amount, 0);
    const drawings = txs.filter((t) => t.type === 'DRAWING').reduce((s, t) => s + t.amount, 0);
    return { injections, drawings, net: injections - drawings };
  }

  async create(shopId: string, userId: string, data: { type: string; amount: number; note?: string }) {
    return prisma.ownerCapitalTransaction.create({
      data: {
        shopId,
        userId,
        type: data.type,
        amount: data.amount,
        note: data.note,
      },
      include: { user: { select: { name: true } } },
    });
  }
}

export const capitalService = new CapitalService();
