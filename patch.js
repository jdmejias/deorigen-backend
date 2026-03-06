const fs = require('fs');

const frontendPath = '../deorigen-frontend-/src/app/[locale]/(dashboard)/dashboard/partner/orders/page.tsx';
let data = fs.readFileSync(frontendPath, 'utf8');

data = data.replace(`import { Order, OrderStatus } from '@/types/dashboard';`, `import { Order, OrderStatus } from '@/types/dashboard';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';`);

data = data.replace(`const [showConfirmDialog, setShowConfirmDialog] = useState(false);`, `const [showConfirmDialog, setShowConfirmDialog] = useState(false);\n  const [trackingNumber, setTrackingNumber] = useState('');`);

data = data.replace(/const handleStatusChangeRequest =(.*?){/s, "const handleStatusChangeRequest =$1{\n    setTrackingNumber('');");

data = data.replace('if (!selectedOrder || !newStatus) return;', `if (!selectedOrder || !newStatus) return;
    
    const needsTracking = newStatus === OrderStatus.SHIPPED || newStatus === OrderStatus.DELIVERED;
    if (needsTracking && !trackingNumber && !selectedOrder.trackingNumber) {
      toast({
        title: "Error de validación",
        description: "Debe proveer un número de tracking para este estado.",
        variant: "destructive"
      });
      return;
    }
`);

data = data.replace('? { ...order, status: newStatus, updatedAt: new Date().toISOString() }', `? { ...order, status: newStatus, trackingNumber: trackingNumber || order.trackingNumber, updatedAt: new Date().toISOString() }`);

data = data.replace(/<span className="font-medium">Nuevo estado:<\/span>\s*<Badge.+?<\/Badge>\s*<\/div>/s, `$&
                    {(newStatus === OrderStatus.SHIPPED || newStatus === OrderStatus.DELIVERED) && (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="tracking">Número de Seguimiento (Tracking)</Label>
                        <Input 
                          id="tracking" 
                          value={trackingNumber} 
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Ej. ES123456789"
                          required={true}
                        />
                      </div>
                    )}`);

fs.writeFileSync(frontendPath, data, 'utf8');
console.log('Frontend patched!');
