import sys
import re

file_path = '../deorigen-frontend-/src/app/[locale]/tienda/[slug]/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure to import ProductReviews
if 'ProductReviews' not in content:
    content = re.sub(
        r'(import .*? from "@/components/ui/button";)',
        r'\1\nimport { ProductReviews } from "@/components/shop/product-reviews";',
        content
    )

    content = content.replace(
        '{/* Origin & Traceability Block */}',
        '<section className="container mx-auto px-4 py-16">\n        <div className="max-w-4xl mx-auto">\n          <ProductReviews productId={product.id} />\n        </div>\n      </section>\n\n      {/* Origin & Traceability Block */}'
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected ProductReviews!")
