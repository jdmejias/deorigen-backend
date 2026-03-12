import sys
import re

file_path = '../deorigen-frontend-/src/app/[locale]/productores/[slug]/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'FarmerContactModal' not in content:
    content = re.sub(
        r'(import .*? from "@/components/ui/button";)',
        r'\1\nimport { FarmerContactModal } from "@/components/shop/farmer-contact-modal";',
        content
    )

    old_btn = '''<Button\n                className="primary-gradient text-white rounded-[20px] px-10 h-14 font-bold"\n                onClick={() => window.location.href = "mailto:hola@deorigen.co"}\n              >\n                Contactar al productor\n              </Button>'''
    
    if old_btn in content:
        content = content.replace(old_btn, '<FarmerContactModal farmerId={farmer.id} farmerName={farmerName} />')
    else:
        # Regex replacement if exact string doesn't match
        content = re.sub(
            r'<Button[^>]*onClick=\{\(\) => window\.location\.href = "mailto:hola@deorigen\.co"\}[^>]*>.*?Contactar al productor.*?</Button>',
            r'<FarmerContactModal farmerId={farmer.id} farmerName={farmerName} />',
            content,
            flags=re.DOTALL
        )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected FarmerContactModal")
