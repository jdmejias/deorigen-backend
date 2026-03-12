import sys
import re

with open('src/farmers/farmers.service.ts', 'r', encoding='utf8') as f:
    text = f.read()

new_method = open('fix_contact.txt', 'r', encoding='utf8').read()

match = re.search(r'async contactFarmer.*?return \{ success: true, message: \'Mensaje enviado\' \};\n\s*\}', text, flags=re.DOTALL)
if match:
    text = text[:match.start()] + new_method + text[match.end():]
    with open('src/farmers/farmers.service.ts', 'w', encoding='utf8') as f:
        f.write(text)
    print("Replaced!")
else:
    print("Not found")
