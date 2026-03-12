const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const farmers = await prisma.farmerProfile.findMany({
    include: { user: true }
  });
  
  let deleted = 0;
  for (const f of farmers) {
    // seeded products are named `Producto de ${f.user.name}`
    const seedName = `Producto de ${f.user?.name}`;
    const result = await prisma.product.deleteMany({
      where: {
        name: seedName,
        farmerId: f.id,
      }
    });
    deleted += result.count;
  }
  console.log(`Deleted ${deleted} sample/seeded products`);
}

clean().catch(console.error).finally(() => prisma.$disconnect());
