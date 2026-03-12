import os

path = 'prisma/seed.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if '// Create sample product' in line:
        new_lines.append('    // Solo crear productos si SEED_DEMO está activo\n')
        new_lines.append('    if (process.env.SEED_DEMO === "true") {\n')
        new_lines.append('  ' + line)
        skip = True
        continue
    
    if skip and 'console.log(`  ✔ Farmer: ${f.name} + 1 product`);' in line:
        new_lines.append('      console.log(`  ✔ Farmer: ${f.name} + 1 product (demo)`);\n')
        new_lines.append('    } else {\n')
        new_lines.append('      console.log(`  ✔ Farmer: ${f.name} created (no products)`);\n')
        new_lines.append('    }\n')
        skip = False
        continue
    
    if skip:
        new_lines.append('  ' + line)
    else:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Updated seed.ts")
