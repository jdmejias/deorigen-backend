const fs = require('fs');
let file = fs.readFileSync('../deorigen-frontend-/src/app/[locale]/(dashboard)/dashboard/farmer/page.tsx', 'utf8');
if (!file.includes('WithdrawalDialog')) {
  file = "import { WithdrawalDialog } from './withdrawal-dialog';\n" + file;
  file = file.replace(<StatCard\n          title={t('totalSupport')}\n          value={formatCurrency(summary.totalSupport)}\n          description={t('totalSupportDesc')}\n          icon={DollarSign}\n        />, <StatCard\n          title={t('totalSupport')}\n          value={formatCurrency(summary.totalSupport)}\n          description={t('totalSupportDesc')}\n          icon={DollarSign}\n        />\n        <WithdrawalDialog balanceDisponible={summary.totalSupport} />);
  fs.writeFileSync('../deorigen-frontend-/src/app/[locale]/(dashboard)/dashboard/farmer/page.tsx', file);
}
