const fs = require('fs');

const buyerPath = '../deorigen-frontend-/src/app/[locale]/(dashboard)/dashboard/buyer/orders/page.tsx';
let data = fs.readFileSync(buyerPath, 'utf8');

const newColumn = `,
    {
      key: 'tracking',
      label: 'Tracking',
      render: (order) => (
        <div className="text-sm">
          {order.trackingNumber ? (
             <span className="font-medium text-blue-600">{order.trackingNumber}</span>
          ) : (
             <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    }`;

// Inject column after 'status' block ends
data = data.replace(/(key:\s*'status'[\s\S]*?<\/Badge>\s*\),\s*})/, `$1${newColumn}`);

fs.writeFileSync(buyerPath, data, 'utf8');
console.log('Buyer orders patched!');
