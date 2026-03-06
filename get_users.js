const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const farmer = await prisma.user.findFirst({ where: { role: 'FARMER' } });
  console.log('Admin:', admin?.email);
  console.log('Farmer:', farmer?.email);
}
main().catch(console.error).finally(() => prisma.$disconnect());
