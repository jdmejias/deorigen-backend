import 'dotenv/config';
import { PrismaClient, Role, ProjectStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding DeOrigen database...');

  // ── Admin user ──
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@deorigencampesino.com' },
    update: {},
    create: {
      email: 'admin@deorigencampesino.com',
      passwordHash: adminHash,
      name: 'Admin DeOrigen',
      role: Role.ADMIN,
    },
  });
  console.log('  ✔ Admin user:', admin.email);

  // ── Categories ──
  const categories = [
    { name: 'Cacao', slug: 'cacao', icon: '🍫', sortOrder: 1 },
    { name: 'Café', slug: 'cafe', icon: '☕', sortOrder: 2 },
    { name: 'Artesanías', slug: 'artesanias', icon: '🎨', sortOrder: 3 },
    { name: 'Frutos', slug: 'frutos', icon: '🍊', sortOrder: 4 },
    { name: 'Panela', slug: 'panela', icon: '🍬', sortOrder: 5 },
    { name: 'Miel', slug: 'miel', icon: '🍯', sortOrder: 6 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('  ✔ Categories:', categories.length);

  // ── Countries ──
  const countries = [
    { name: 'España', code: 'ES', flag: '🇪🇸' },
    { name: 'Italia', code: 'IT', flag: '🇮🇹' },
    { name: 'Francia', code: 'FR', flag: '🇫🇷' },
    { name: 'Turquía', code: 'TR', flag: '🇹🇷' },
    { name: 'Emiratos Árabes', code: 'AE', flag: '🇦🇪' },
    { name: 'Japón', code: 'JP', flag: '🇯🇵' },
    { name: 'Rusia', code: 'RU', flag: '🇷🇺' },
    { name: 'Colombia', code: 'CO', flag: '🇨🇴' },
  ];

  for (const c of countries) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log('  ✔ Countries:', countries.length);

  // ── Sample Farmer users + profiles ──
  const farmerHash = await bcrypt.hash('Farmer123!', 12);
  const farmers = [
    {
      email: 'pedro.cacao@example.com',
      name: 'Pedro Martínez',
      region: 'Santander',
      department: 'Santander',
      bio: 'Productor de cacao fino de aroma con más de 20 años de experiencia.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      category: 'cacao',
    },
    {
      email: 'maria.cafe@example.com',
      name: 'María López',
      region: 'Huila',
      department: 'Huila',
      bio: 'Café especial de altura, tostado artesanal en finca familiar.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      category: 'cafe',
    },
    {
      email: 'carlos.artesano@example.com',
      name: 'Carlos Ramírez',
      region: 'Boyacá',
      department: 'Boyacá',
      bio: 'Artesanías en barro y tejidos tradicionales boyacenses.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      category: 'artesanias',
    },
    {
      email: 'lucia.frutas@example.com',
      name: 'Lucía Gómez',
      region: 'Valle del Cauca',
      department: 'Valle del Cauca',
      bio: 'Frutos tropicales orgánicos del Valle del Cauca.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      category: 'frutos',
    },
  ];

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (const f of farmers) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: {},
      create: {
        email: f.email,
        passwordHash: farmerHash,
        name: f.name,
        role: Role.FARMER,
      },
    });

    const slug = f.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const profile = await prisma.farmerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        slug,
        bio: f.bio,
        region: f.region,
        department: f.department,
        videoUrl: f.videoUrl,
        isActive: true,
        featuredFrom: new Date(now.getFullYear(), now.getMonth(), 1),
        featuredTo: endOfMonth,
      },
    });

    // Find category
    const category = await prisma.category.findUnique({
      where: { slug: f.category },
    });

    // Auto-create product is disabled per P0-2 to avoid polluting real data
    if (process.env.SEED_DEMO === 'true') {
      const productSlug = `${slug}-producto-1`;
      await prisma.product.upsert({
        where: { slug: productSlug },
        update: {},
        create: {
          farmerId: profile.id,
          categoryId: category?.id ?? null,
          name: `Producto de ${f.name}`,
          slug: productSlug,
          description: `Producto artesanal`,
          shortDescription: `Directo del campo`,
          price: 15.99,
          currency: 'EUR',
          stock: 100,
          isActive: true,
          isFeatured: true,
        },
      });
      console.log(`  ✔ Farmer: ${f.name} + 1 product`);
    } else {
      console.log(`  ✔ Farmer: ${f.name}`);
    }
  }

  // ── Sample Buyer user ──
  const buyerHash = await bcrypt.hash('Buyer123!', 12);
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {},
    create: {
      email: 'buyer@example.com',
      passwordHash: buyerHash,
      name: 'Test Buyer',
      role: Role.BUYER,
    },
  });
  console.log('  ✔ Buyer user:', buyer.email);

  // ── Sample Project ──
  const firstFarmer = await prisma.farmerProfile.findFirst();
  if (firstFarmer) {
    await prisma.project.upsert({
      where: { slug: 'tanques-de-agua-santander' },
      update: {},
      create: {
        farmerId: firstFarmer.id,
        title: 'Tanques de Agua para Finca Santander',
        slug: 'tanques-de-agua-santander',
        description:
          'Necesitamos instalar un sistema de recolección de agua lluvia para riego sostenible.',
        goalAmount: 1000,
        currency: 'EUR',
        status: ProjectStatus.ACTIVE,
      },
    });
    console.log('  ✔ Sample project created');
  }

  // ── Sample Post (novedad) ──
  await prisma.post.upsert({
    where: { slug: 'bienvenidos-a-deorigen' },
    update: {},
    create: {
      title: 'Bienvenidos a DeOrigen',
      slug: 'bienvenidos-a-deorigen',
      excerpt: 'Conectamos el campo colombiano con el mundo.',
      content:
        '<p>En DeOrigen, Conectamos el campo colombiano con el mundo. ' +
        'Cada producto cuenta una historia de tradición, esfuerzo y amor por la tierra.</p>',
      isPublished: true,
      publishedAt: new Date(),
    },
  });
  console.log('  ✔ Sample post created');

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📧 Credentials:');
  console.log('  Admin: admin@deorigencampesino.com / Admin123!');
  console.log('  Buyer: buyer@example.com / Buyer123!');
  console.log('  Farmers: pedro.cacao@example.com / Farmer123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
