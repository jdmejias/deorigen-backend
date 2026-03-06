const fs = require('fs');
const reportPath = '../deorigen-frontend-/src/app/[locale]/(dashboard)/dashboard/partner/report/page.tsx';
let reportData = fs.readFileSync(reportPath, 'utf8');

// Replace "Total Sales" card with "Comisiones"
reportData = reportData.replace(/<StatCard\s*title=\{t\('totalSales'\)\}\s*value=\{formatCurrency\(report\.totalSales\)\}\s*description=\{t\('totalSalesDesc'\)\}\s*icon=\{DollarSign\}\s*\/>/,
`<StatCard
            title={t('totalCommissions') || 'Comisión'}
            value={formatCurrency(report.totalSales * 0.15)} 
            description={t('totalCommissionsDesc') || 'Comisiones estimadas'}
            icon={DollarSign}
          />`);

// Also replace average order value card or just take it out? The ticket says: "El dashboard de Partner solo debe mostrar 'comision'". It implies they shouldn't see the total sales money, so averageOrderValue is also a leak of total sales. Let's remove average order value and total sales.
reportData = reportData.replace(/<StatCard\s*title=\{t\('averageOrderValue'\)\}[\s\S]*?icon=\{TrendingUp\}\s*\/>/, '');

fs.writeFileSync(reportPath, reportData, 'utf8');
console.log('PRT-04 removed sales logic on frontend');
