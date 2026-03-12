const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({ log: ['info'] });

async function clean() {
  const products = await prisma.product.deleteMany({
    where: {
      name: { startsWith: 'Producto de ' }
    }
  });
  console.log(`Deleted ${products.count} sample/seeded products`);
}

clean().catch(console.error).finally(() => prisma.$disconnect());
