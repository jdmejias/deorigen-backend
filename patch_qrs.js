const fs = require('fs');

// PATCH ORDER DETAILS PAGE
const orderPagePath = '../deorigen-frontend-/src/app/[locale]/(dashboard)/orders/[id]/page.tsx';
let data1 = fs.readFileSync(orderPagePath, 'utf8');

// Replace QrCode inside generic flex with Link wrapper
if(data1.indexOf('href={`/trazabilidad/${order.id}`}') === -1) {
    data1 = data1.replace(/<div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center mb-4">\s*<QrCode className="h-24 w-24 text-muted-foreground" \/>\s*<\/div>/g, 
    `<Link href={\`/trazabilidad/\${order.id}\`}>
       <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center mb-4 hover:bg-muted/80 transition-colors cursor-pointer" title="Ver Trazabilidad">
         <QrCode className="h-24 w-24 text-muted-foreground" />
       </div>
     </Link>`);
    
    // Add Link import if not present
    if(data1.indexOf('import { Link } from') === -1) {
        data1 = data1.replace("import { useTranslations } from 'next-intl';", "import { useTranslations } from 'next-intl';\nimport { Link } from '@/i18n/routing';");
    }
    fs.writeFileSync(orderPagePath, data1, 'utf8');
}

// PATCH PRODUCT DETAIL PAGE
const productPagePath = '../deorigen-frontend-/src/app/[locale]/tienda/[slug]/page.tsx';
let data2 = fs.readFileSync(productPagePath, 'utf8');

if(data2.indexOf('href="/trazabilidad/demo"') === -1) {
    data2 = data2.replace(/<div className="w-14 h-14 bg-white\/10 rounded-\[20px\] flex items-center justify-center flex-shrink-0 backdrop-blur-md">\s*<QrCode className="w-7 h-7 text-primary" \/>\s*<\/div>/g,
    `<Link href="/trazabilidad/demo" className="w-14 h-14 bg-white/10 rounded-[20px] flex items-center justify-center flex-shrink-0 backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer" title="Ver ejemplo de trazabilidad">
       <QrCode className="w-7 h-7 text-primary" />
     </Link>`);

    data2 = data2.replace(/<div className="bg-white p-6 rounded-\[24px\] shadow-2xl">\s*<QrCode className="w-20 h-20 text-textPrimary" \/>\s*<\/div>/g,
    `<Link href="/trazabilidad/demo" className="bg-white p-6 rounded-[24px] shadow-2xl hover:bg-gray-50 transition-colors block cursor-pointer" title="Ver ejemplo de trazabilidad">
       <QrCode className="w-20 h-20 text-textPrimary" />
     </Link>`);
    
    fs.writeFileSync(productPagePath, data2, 'utf8');
}

console.log('QRs patched with Links!');
