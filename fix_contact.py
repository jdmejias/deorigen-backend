import sys
import re

with open('src/farmers/farmers.service.ts', 'r', encoding='utf8') as f:
    text = f.read()

# Pattern to match async contactFarmer(...) till return { success: true, message: 'Mensaje enviado' }; }
new_method = open('fix_contact.txt', 'r', encoding='utf8').read()

text = re.sub(r'async contactFarmer\(id: string, dto: \{ name: string; email: string; message: string; phone\?: string \}.*?return \{ success: true, message: \'Mensaje enviado\' \};\s+\}', new_method, text, flags=re.DOTALL)

with open('src/farmers/farmers.service.ts', 'w', encoding='utf8') as f:
    f.write(text)

