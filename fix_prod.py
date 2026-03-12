import sys

with open('src/products/products.service.ts', 'r', encoding='utf8') as f:
    text = f.read()

# Fix getReviews firstName -> name
text = text.replace('select: { id: true, firstName: true, lastName: true, avatarUrl: true }', 'select: { id: true, name: true, avatarUrl: true }')

# Fix imageUrls type error
text = text.replace('const urls = dto.imageUrls && dto.imageUrls.length > 0 ? dto.imageUrls :', 'const urls = dto.imageUrl ? [dto.imageUrl] :')

with open('src/products/products.service.ts', 'w', encoding='utf8') as f:
    f.write(text)

print("Fixed products.service.ts")
