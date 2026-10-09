/*
 * Reset (wipe) all BUSINESS data for a single shop so the owner can start with
 * real data. Keeps the shop, its settings, subscription, the owner account,
 * employees and agent/system accounts.
 *
 * Usage:
 *   npx tsx scripts/reset-shop-data.ts [shopId|ownerPhone] --confirm
 *
 * Irreversible. Without --confirm the script only reports what it would delete.
 */
import prisma from '../src/config/database';

async function resolveShop(arg?: string) {
  if (arg) {
    const byId = await prisma.shop.findUnique({ where: { id: arg }, select: { id: true, name: true } });
    if (byId) return byId;
    const owner = await prisma.user.findUnique({ where: { phone: arg }, select: { id: true } });
    if (owner) {
      return prisma.shop.findFirst({ where: { ownerId: owner.id, isArchived: false }, select: { id: true, name: true }, orderBy: { createdAt: 'asc' } });
    }
  }
  const fallback = process.env.OWNER_TEST_PHONE || '0754000000';
  const owner = await prisma.user.findUnique({ where: { phone: fallback }, select: { id: true } });
  if (!owner) return null;
  return prisma.shop.findFirst({ where: { ownerId: owner.id, isArchived: false }, select: { id: true, name: true }, orderBy: { createdAt: 'asc' } });
}

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');
  const target = args.find((a) => !a.startsWith('--'));

  const shop = await resolveShop(target);
  if (!shop) {
    console.error('Could not resolve a shop. Pass a shopId or owner phone, or set OWNER_TEST_PHONE.');
    process.exit(1);
  }
  const shopId = shop.id;
  console.log(`Target shop: ${shop.name} (${shopId})`);

  const counts = {
    saleItems: await prisma.saleItem.count({ where: { sale: { shopId } } }),
    sales: await prisma.sale.count({ where: { shopId } }),
    refunds: await prisma.refund.count({ where: { shopId } }),
    creditPayments: await prisma.creditPayment.count({ where: { customer: { shopId } } }),
    creditLedger: await prisma.creditLedgerEntry.count({ where: { customer: { shopId } } }),
    loanRepayments: await prisma.loanRepayment.count({ where: { loan: { shopId } } }),
    loans: await prisma.loan.count({ where: { shopId } }),
    expenses: await prisma.expense.count({ where: { shopId } }),
    purchases: await prisma.purchase.count({ where: { shopId } }),
    products: await prisma.product.count({ where: { shopId } }),
    customers: await prisma.customer.count({ where: { shopId } }),
    suppliers: await prisma.supplier.count({ where: { shopId } }),
    cashTx: await prisma.cashTransaction.count({ where: { shopId } }),
    capitalTx: await prisma.ownerCapitalTransaction.count({ where: { shopId } }),
    recurringExpenses: await prisma.recurringExpense.count({ where: { shopId } }),
    shifts: await prisma.shift.count({ where: { shopId } }),
    categories: await prisma.category.count({ where: { shopId } }),
    stockMovements: await prisma.stockMovement.count({ where: { shopId } }),
    stockAdjustments: await prisma.stockAdjustment.count({ where: { shopId } }),
    activityLogs: await prisma.activityLog.count({ where: { shopId } }),
    auditLogs: await prisma.auditLog.count({ where: { shopId } }),
    notifications: await prisma.notification.count({ where: { shopId } }),
    syncMetadata: await prisma.syncMetadata.count({ where: { shopId } }),
    smsLogs: await prisma.smsLog.count({ where: { shopId } }),
  };

  console.log('Will delete:', counts);
  if (!confirm) {
    console.log('\nDry run only. Re-run with --confirm to actually delete.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // children first
    await tx.saleItem.deleteMany({ where: { sale: { shopId } } });
    await tx.refund.deleteMany({ where: { shopId } });
    await tx.creditPayment.deleteMany({ where: { customer: { shopId } } });
    await tx.creditLedgerEntry.deleteMany({ where: { customer: { shopId } } });
    await tx.loanRepayment.deleteMany({ where: { loan: { shopId } } });
    await tx.activityLog.deleteMany({ where: { shopId } });
    await tx.auditLog.deleteMany({ where: { shopId } });
    await tx.stockAdjustment.deleteMany({ where: { shopId } });
    await tx.stockMovement.deleteMany({ where: { shopId } });
    await tx.cashTransaction.deleteMany({ where: { shopId } });
    await tx.sale.deleteMany({ where: { shopId } });
    await tx.loan.deleteMany({ where: { shopId } });
    await tx.expense.deleteMany({ where: { shopId } });
    await tx.purchase.deleteMany({ where: { shopId } });
    await tx.productUnitConfig.deleteMany({ where: { product: { shopId } } });
    await tx.productImage.deleteMany({ where: { product: { shopId } } });
    await tx.product.deleteMany({ where: { shopId } });
    await tx.category.deleteMany({ where: { shopId } });
    await tx.customer.deleteMany({ where: { shopId } });
    await tx.supplier.deleteMany({ where: { shopId } });
    await tx.ownerCapitalTransaction.deleteMany({ where: { shopId } });
    await tx.recurringExpense.deleteMany({ where: { shopId } });
    await tx.shift.deleteMany({ where: { shopId } });
    await tx.notification.deleteMany({ where: { shopId } });
    await tx.syncMetadata.deleteMany({ where: { shopId } });
    await tx.smsLog.deleteMany({ where: { shopId } });
  });

  console.log(`\nReset complete for "${shop.name}". Kept: shop, settings, subscription, owner and employee accounts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
