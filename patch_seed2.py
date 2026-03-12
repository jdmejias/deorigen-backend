import os

path = 'prisma/seed.ts'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace block
old_block = '''    // Create sample product
    const productSlug = `${slug}-producto-1`;
    await prisma.product.upsert({
      where: { slug: productSlug },
      update: {},
      create: {
        farmerId: profile.id,
        categoryId: category?.id ?? null,
        name: `Producto de ${f.name}`,
        slug: productSlug,
        description: `Producto artesanal de ${f.region}, cultivado con m\u00C3\u00A9todos tradicionales.`,
        shortDescription: `Directo del campo de ${f.region}`,
        price: 15.99,
        currency: 'EUR',
        stock: 100,
        isActive: true,
        isFeatured: true,
        characteristics: {
          origen: f.region,
          proceso: 'Artesanal',
          certificaci\u00C3\u00B3n: 'Org\u00C3\u00A1nico',
        },
      },
    });

    console.log(`  \u00E2\u009C\u0094 Farmer: ${f.name} + 1 product`);'''

import re
text = re.sub(r'// Create sample product[\s\S]*?Farmer: \$\{f\.name\} \+ 1 product`\);', '''// Auto-create product is disabled per P0-2 to avoid polluting real data
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
    }''', text)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
    
print("Updated seed.ts cleanly")
