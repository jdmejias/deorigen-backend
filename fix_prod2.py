import sys
with open('src/products/products.service.ts', 'r', encoding='utf8') as f:
    text = f.read()

text = text.replace('avatarUrl: true', 'avatar: true')

# The compiler also says Found 41 error(s)?? Let's check other errors.
with open('src/products/products.service.ts', 'w', encoding='utf8') as f:
    f.write(text)

