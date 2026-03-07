import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clear() {
  const info = await prisma.product.deleteMany({
    where: { name: { startsWith: 'Producto de ' } }
  });
  console.log(`Eliminados ${info.count} productos automáticos.`);
}

clear()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect(); });
