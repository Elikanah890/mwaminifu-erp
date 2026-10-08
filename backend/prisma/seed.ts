import { PrismaClient, UserRole, SaleStatus, LoanStatus } from '@prisma/client';
import { hashPassword, hashPin } from '../src/utils/bcrypt.util';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Mwaminifu database...');

  // Clean existing data
  await prisma.activityLog.deleteMany();
  await prisma.smsLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.syncMetadata.deleteMany();
  await prisma.creditPayment.deleteMany();
  await prisma.loanRepayment.deleteMany();
  await prisma.supportMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.shopSettings.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otp.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agent.deleteMany();

  // Create System Owner
  const systemOwner = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: await hashPassword('admin123'),
      name: 'System Administrator',
      email: 'admin@mwaminifu.com',
      role: 'SYSTEM_OWNER',
      isPinSet: true,
    },
  });
  console.log('Created System Owner:', systemOwner.username);

  // Create Agent
  const agentUser = await prisma.user.create({
    data: {
      username: 'agent1',
      passwordHash: await hashPassword('agent123'),
      name: 'Agent One',
      phone: '255712345670',
      email: 'agent1@mwaminifu.com',
      role: 'AGENT',
      isPinSet: true,
    },
  });

  const agent = await prisma.agent.create({
    data: {
      username: 'agent1',
      passwordHash: await hashPassword('agent123'),
      name: 'Agent One',
      phone: '255712345670',
      email: 'agent1@mwaminifu.com',
      createdBy: systemOwner.id,
    },
  });

  await prisma.user.update({
    where: { id: agentUser.id },
    data: { agentId: agent.id },
  });

  console.log('Created Agent:', agent.username);

  // Create Business Owner
  const businessOwner = await prisma.user.create({
    data: {
      phone: '0754000000',
      name: 'John Business',
      email: 'john@shop.com',
      role: 'BUSINESS_OWNER',
      pinHash: await hashPin('123456'),
      isPinSet: true,
      isPhoneVerified: true,
      agentId: agent.id,
    },
  });
  console.log('Created Business Owner:', businessOwner.phone);

  // Create Shop
  const shop = await prisma.shop.create({
    data: {
      ownerId: businessOwner.id,
      name: "John's Grocery",
      address: 'Dar es Salaam, Kariakoo',
      currency: 'TZS',
      receiptHeader: "John's Grocery - Quality Products",
      receiptFooter: 'Thank you for shopping with us!',
    },
  });

  await prisma.subscription.create({
    data: { shopId: shop.id, plan: 'basic', status: 'active' },
  });

  await prisma.shopSettings.create({
    data: { shopId: shop.id, currency: 'TZS', language: 'en' },
  });

  console.log('Created Shop:', shop.name);

  // Create Categories
  const categoryData = [
    { name: 'Grocery', isDefault: true },
    { name: 'Drinks', isDefault: true },
    { name: 'Food', isDefault: true },
    { name: 'Cosmetics', isDefault: true },
    { name: 'Electronics', isDefault: true },
    { name: 'Hardware', isDefault: true },
    { name: 'Pharmacy', isDefault: true },
    { name: 'Agriculture', isDefault: true },
    { name: 'Stationery', isDefault: true },
  ];

  await prisma.category.createMany({
    data: categoryData.map((c) => ({ ...c, shopId: shop.id })),
  });

  const categories = await prisma.category.findMany({ where: { shopId: shop.id } });
  console.log(`Created ${categories.length} categories`);

  // Create Products (30)
  const productList = [
    { name: 'Rice 1kg', sku: 'GRC-001', cat: 'Grocery', costPrice: 2000, sellingPrice: 2800, reorderLevel: 20, stockQuantity: 150, unit: 'pack' },
    { name: 'Wheat Flour 2kg', sku: 'GRC-002', cat: 'Grocery', costPrice: 2500, sellingPrice: 3500, reorderLevel: 15, stockQuantity: 80, unit: 'pack' },
    { name: 'Sugar 1kg', sku: 'GRC-003', cat: 'Grocery', costPrice: 1800, sellingPrice: 2500, reorderLevel: 25, stockQuantity: 200, unit: 'pack' },
    { name: 'Cooking Oil 1L', sku: 'GRC-004', cat: 'Grocery', costPrice: 4000, sellingPrice: 5500, reorderLevel: 10, stockQuantity: 60, unit: 'bottle' },
    { name: 'Table Salt 500g', sku: 'GRC-005', cat: 'Grocery', costPrice: 500, sellingPrice: 800, reorderLevel: 30, stockQuantity: 300, unit: 'pack' },
    { name: 'Coca Cola 500ml', sku: 'DRK-001', cat: 'Drinks', costPrice: 800, sellingPrice: 1500, reorderLevel: 30, stockQuantity: 200, unit: 'bottle' },
    { name: 'Pepsi 500ml', sku: 'DRK-002', cat: 'Drinks', costPrice: 800, sellingPrice: 1500, reorderLevel: 25, stockQuantity: 180, unit: 'bottle' },
    { name: 'Fanta Orange 500ml', sku: 'DRK-003', cat: 'Drinks', costPrice: 800, sellingPrice: 1500, reorderLevel: 25, stockQuantity: 150, unit: 'bottle' },
    { name: 'Mineral Water 1.5L', sku: 'DRK-004', cat: 'Drinks', costPrice: 500, sellingPrice: 1000, reorderLevel: 40, stockQuantity: 300, unit: 'bottle' },
    { name: 'Mango Juice 1L', sku: 'DRK-005', cat: 'Drinks', costPrice: 1500, sellingPrice: 2500, reorderLevel: 15, stockQuantity: 90, unit: 'bottle' },
    { name: 'White Bread', sku: 'FOD-001', cat: 'Food', costPrice: 1000, sellingPrice: 1800, reorderLevel: 15, stockQuantity: 50, unit: 'loaf' },
    { name: 'Fresh Milk 500ml', sku: 'FOD-002', cat: 'Food', costPrice: 1500, sellingPrice: 2500, reorderLevel: 20, stockQuantity: 45, unit: 'pack' },
    { name: 'Eggs Tray (30)', sku: 'FOD-003', cat: 'Food', costPrice: 7000, sellingPrice: 9000, reorderLevel: 10, stockQuantity: 40, unit: 'tray' },
    { name: 'Butter 250g', sku: 'FOD-004', cat: 'Food', costPrice: 3000, sellingPrice: 4500, reorderLevel: 10, stockQuantity: 35, unit: 'pack' },
    { name: 'Cheddar Cheese 200g', sku: 'FOD-005', cat: 'Food', costPrice: 4000, sellingPrice: 6000, reorderLevel: 8, stockQuantity: 25, unit: 'pack' },
    { name: 'Bar Soap', sku: 'COS-001', cat: 'Cosmetics', costPrice: 1500, sellingPrice: 2500, reorderLevel: 30, stockQuantity: 120, unit: 'piece' },
    { name: 'Shampoo 250ml', sku: 'COS-002', cat: 'Cosmetics', costPrice: 4000, sellingPrice: 6000, reorderLevel: 15, stockQuantity: 70, unit: 'bottle' },
    { name: 'Body Lotion 400ml', sku: 'COS-003', cat: 'Cosmetics', costPrice: 3500, sellingPrice: 5500, reorderLevel: 15, stockQuantity: 55, unit: 'bottle' },
    { name: 'Face Cream 50ml', sku: 'COS-004', cat: 'Cosmetics', costPrice: 5000, sellingPrice: 8000, reorderLevel: 10, stockQuantity: 30, unit: 'tube' },
    { name: 'Perfume 100ml', sku: 'COS-005', cat: 'Cosmetics', costPrice: 8000, sellingPrice: 12000, reorderLevel: 5, stockQuantity: 20, unit: 'bottle' },
    { name: 'AA Battery Pack', sku: 'ELC-001', cat: 'Electronics', costPrice: 3000, sellingPrice: 5000, reorderLevel: 20, stockQuantity: 100, unit: 'pack' },
    { name: 'LED Bulb 10W', sku: 'ELC-002', cat: 'Electronics', costPrice: 2500, sellingPrice: 4000, reorderLevel: 15, stockQuantity: 80, unit: 'piece' },
    { name: 'USB-C Cable', sku: 'ELC-003', cat: 'Electronics', costPrice: 2000, sellingPrice: 3500, reorderLevel: 20, stockQuantity: 60, unit: 'piece' },
    { name: 'Phone Adapter', sku: 'ELC-004', cat: 'Electronics', costPrice: 4000, sellingPrice: 7000, reorderLevel: 10, stockQuantity: 45, unit: 'piece' },
    { name: 'Phone Charger', sku: 'ELC-005', cat: 'Electronics', costPrice: 5000, sellingPrice: 8000, reorderLevel: 10, stockQuantity: 40, unit: 'piece' },
    { name: 'Nails 1kg', sku: 'HRD-001', cat: 'Hardware', costPrice: 3000, sellingPrice: 4500, reorderLevel: 20, stockQuantity: 75, unit: 'kg' },
    { name: 'Paracetamol Pack', sku: 'PHA-001', cat: 'Pharmacy', costPrice: 2000, sellingPrice: 3500, reorderLevel: 25, stockQuantity: 90, unit: 'pack' },
    { name: 'Tomato Seeds Pack', sku: 'AGR-001', cat: 'Agriculture', costPrice: 500, sellingPrice: 1000, reorderLevel: 30, stockQuantity: 150, unit: 'pack' },
    { name: 'A4 Paper Ream', sku: 'STY-001', cat: 'Stationery', costPrice: 8000, sellingPrice: 12000, reorderLevel: 5, stockQuantity: 30, unit: 'ream' },
    { name: 'Pen Box (50)', sku: 'STY-002', cat: 'Stationery', costPrice: 5000, sellingPrice: 8000, reorderLevel: 8, stockQuantity: 40, unit: 'box' },
  ];

  const catMap: Record<string, string> = {};
  categories.forEach((c) => { catMap[c.name] = c.id; });

  const products = [];
  for (const p of productList) {
    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        categoryId: catMap[p.cat],
        name: p.name,
        sku: p.sku,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        reorderLevel: p.reorderLevel,
        stockQuantity: p.stockQuantity,
        unit: p.unit,
      },
    });
    products.push(product);
  }
  console.log(`Created ${products.length} products`);

  // Create Customers (10)
  const customerData = [
    { name: 'Mwanamke Mjane', phone: '255712345681', email: 'mwanamke@example.com', address: 'Kariakoo', outstandingBalance: 45000 },
    { name: 'Juma Makoti', phone: '255712345682', email: 'juma@example.com', address: 'Mbagala', outstandingBalance: 15000 },
    { name: 'Fatima Hassan', phone: '255712345683', email: 'fatima@example.com', address: 'Kinondoni', outstandingBalance: 0 },
    { name: 'David Mwangi', phone: '255712345684', email: 'david@example.com', address: 'Upanga', outstandingBalance: 22000 },
    { name: 'Amina Rashid', phone: '255712345685', email: 'amina@example.com', address: 'Mikocheni', outstandingBalance: 0 },
    { name: 'Peter Kimaro', phone: '255712345686', email: 'peter@example.com', address: 'Sinza', outstandingBalance: 8000 },
    { name: 'Grace Mbele', phone: '255712345687', email: 'grace@example.com', address: 'Mwenge', outstandingBalance: 35000 },
    { name: 'Hassan Ally', phone: '255712345688', email: 'hassan@example.com', address: 'Ilala', outstandingBalance: 0 },
    { name: 'Mary Charles', phone: '255712345689', email: 'mary@example.com', address: 'Temeke', outstandingBalance: 5000 },
    { name: 'Joseph Saidi', phone: '255712345690', email: 'joseph@example.com', address: 'Manzese', outstandingBalance: 12000 },
  ];

  const customers = [];
  for (const c of customerData) {
    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        outstandingBalance: c.outstandingBalance,
        totalCreditGiven: c.outstandingBalance,
      },
    });
    customers.push(customer);
  }
  console.log(`Created ${customers.length} customers`);

  // Create Employees (3)
  const employeeData = [
    { name: 'Mary Cashier', phone: '0754111111', role: 'Cashier', permissions: ['pos:write', 'inventory:read'], pin: '1234' },
    { name: 'Peter Sales', phone: '255712345692', role: 'Sales Assistant', permissions: ['pos:write', 'credit:write'], pin: '123456' },
    { name: 'Anna Store', phone: '255712345693', role: 'Store Keeper', permissions: ['pos:write', 'inventory:write', 'expenses:write'], pin: '123456' },
  ];

  for (const emp of employeeData) {
    let user = await prisma.user.findUnique({ where: { phone: emp.phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: emp.phone,
          name: emp.name,
          role: 'EMPLOYEE',
          pinHash: await hashPin(emp.pin),
          isPinSet: true,
          isPhoneVerified: true,
        },
      });
    }

    await prisma.employee.create({
      data: {
        userId: user.id,
        shopId: shop.id,
        role: emp.role,
        permissions: emp.permissions,
        isActive: true,
      },
    });
  }
  console.log(`Created ${employeeData.length} employees`);

  // Create Expenses (10)
  const expenseData = [
    { category: 'Transport', amount: 15000, description: 'Fuel for delivery' },
    { category: 'Utilities', amount: 45000, description: 'Electricity bill' },
    { category: 'Rent', amount: 150000, description: 'Monthly shop rent' },
    { category: 'Salary', amount: 100000, description: 'Employee salary' },
    { category: 'Supplies', amount: 25000, description: 'Cleaning supplies' },
    { category: 'Transport', amount: 10000, description: 'Bus fare for supplies' },
    { category: 'Utilities', amount: 25000, description: 'Water bill' },
    { category: 'Rent', amount: 30000, description: 'Storage unit rent' },
    { category: 'Salary', amount: 80000, description: 'Part-time helper' },
    { category: 'Supplies', amount: 18000, description: 'Paper bags and packaging' },
  ];

  for (let i = 0; i < expenseData.length; i++) {
    const exp = expenseData[i];
    const date = new Date();
    date.setDate(date.getDate() - i * 3);

    await prisma.expense.create({
      data: {
        shopId: shop.id,
        userId: businessOwner.id,
        category: exp.category,
        amount: exp.amount,
        description: exp.description,
        expenseDate: date,
      },
    });
  }
  console.log(`Created ${expenseData.length} expenses`);

  // Create Loans (3)
  const loanData = [
    { lender: 'CRDB Bank', amount: 5000000, interestRate: 12.5, remainingBalance: 3000000 },
    { lender: 'NMB Bank', amount: 2000000, interestRate: 10, remainingBalance: 500000 },
    { lender: 'Private Lender', amount: 1000000, interestRate: 15, remainingBalance: 1000000 },
  ];

  const loans = [];
  for (const l of loanData) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 3);

    const loan = await prisma.loan.create({
      data: {
        shopId: shop.id,
        lender: l.lender,
        amount: l.amount,
        interestRate: l.interestRate,
        dueDate,
        remainingBalance: l.remainingBalance,
        status: l.remainingBalance <= 0 ? 'PAID' : 'ACTIVE',
      },
    });

    if (l.remainingBalance < l.amount) {
      await prisma.loanRepayment.create({
        data: {
          loanId: loan.id,
          amount: l.amount - l.remainingBalance,
          repaymentDate: new Date(),
          method: 'bank_transfer',
        },
      });
    }

    loans.push(loan);
  }
  console.log(`Created ${loans.length} loans`);

  // Create Sales (20) - last 30 days
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - daysAgo);
    saleDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

    const productIndices = [
      Math.floor(Math.random() * products.length),
      Math.floor(Math.random() * products.length),
    ];
    const saleProducts = [...new Set(productIndices)].map((idx) => products[idx]);

    const customerIndex = Math.random() > 0.5 ? Math.floor(Math.random() * customers.length) : -1;
    const customer = customerIndex >= 0 ? customers[customerIndex] : null;

    const items = saleProducts.map((p) => ({
      productId: p.id,
      quantity: 1 + Math.floor(Math.random() * 3),
      unitPrice: p.sellingPrice,
      discount: 0,
      total: p.sellingPrice * (1 + Math.floor(Math.random() * 3)),
      unit: p.unit,
    }));

    const totalAmount = items.reduce((s, i) => s + i.total, 0);
    const grandTotal = totalAmount;

    const method = Math.random() > 0.5 ? 'cash' : 'mpesa';
    const payments = [{ method, amount: grandTotal }];

    await prisma.sale.create({
      data: {
        shopId: shop.id,
        userId: businessOwner.id,
        customerId: customer?.id || null,
        totalAmount,
        grandTotal,
        saleDate,
        status: 'COMPLETED',
        paymentMethod: method,
        paymentDetails: payments,
        receiptNumber: `INV-${Date.now().toString(36).toUpperCase()}-${i.toString().padStart(3, '0')}`,
        items: { create: items },
      },
    });
  }
  console.log('Created 20 sales');

  // Create Credit Payments for customers with balance
  for (const customer of customers) {
    if (customer.outstandingBalance > 0) {
      const paymentAmount = Math.floor(customer.outstandingBalance * 0.3);
      if (paymentAmount > 0) {
        await prisma.creditPayment.create({
          data: {
            customerId: customer.id,
            amount: paymentAmount,
            paymentDate: new Date(),
            method: 'cash',
          },
        });

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            outstandingBalance: { decrement: paymentAmount },
            totalRepaid: { increment: paymentAmount },
          },
        });
      }
    }
  }
  console.log('Created credit payments');

  console.log('\n========================================');
  console.log('  DATABASE SEEDING COMPLETE');
  console.log('========================================');
  console.log('\nLogin Credentials:');
  console.log('------------------------------------------');
  console.log('System Owner:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
  console.log('');
  console.log('Agent:');
  console.log('  Username: agent1');
  console.log('  Password: agent123');
  console.log('');
  console.log('Business Owner:');
  console.log('  Phone:    0754000000');
  console.log('  OTP:      123456');
  console.log('  PIN:      123456');
  console.log('  Shop:     John\'s Grocery');
  console.log('');
  console.log('Employees:');
  console.log('  Mary Cashier:  0754111111 / PIN: 1234');
  console.log('  Peter Sales:   255712345692 / PIN: 123456');
  console.log('  Anna Store:    255712345693 / PIN: 123456');
  console.log('------------------------------------------');
  console.log('OTP for testing: always 123456');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
