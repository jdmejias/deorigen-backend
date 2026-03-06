const fs = require('fs');

const pageContent = `import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowLeft, CheckCircle2, Truck, Sprout } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TraceabilityPage({ params }: { params: { id: string } }) {
  const id = params.id || "DO-2024-001";
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
       <div className="container mx-auto px-4 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs mb-8">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold font-serif text-textPrimary">Trazabilidad del Producto</h1>
              <p className="text-muted-foreground">Código de rastreo: <span className="font-mono text-primary font-bold">{id}</span></p>
            </div>
            
            <Card className="border-0 shadow-sm overflow-hidden">
               <CardContent className="p-8 space-y-8">
                  <div className="flex gap-6 items-start relative">
                     <div className="absolute left-[27px] top-12 bottom-[-40px] w-0.5 bg-primary/20" />
                     <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-primary">
                        <Sprout className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-textPrimary">Cosecha en origen</h3>
                        <p className="text-muted-foreground mt-1">El producto fue recolectado a mano por agricultores locales.</p>
                        <p className="text-sm font-mono text-muted-foreground mt-2">12 Ene 2024</p>
                     </div>
                  </div>
                  
                  <div className="flex gap-6 items-start relative">
                     <div className="absolute left-[27px] top-12 bottom-[-40px] w-0.5 bg-primary/20" />
                     <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-primary">
                        <CheckCircle2 className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-textPrimary">Procesamiento y Lavado</h3>
                        <p className="text-muted-foreground mt-1">Selección meticulosa y procesamiento tradicional.</p>
                        <p className="text-sm font-mono text-muted-foreground mt-2">15 Ene 2024</p>
                     </div>
                  </div>
                  
                  <div className="flex gap-6 items-start relative">
                     <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 z-10">
                        <Truck className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-textPrimary">Exportación y bodegaje</h3>
                        <p className="text-muted-foreground mt-1">Listo para enviar a la bodega local a través de la red de Partners.</p>
                        <p className="text-sm font-mono text-muted-foreground mt-2">20 Ene 2024</p>
                     </div>
                  </div>
               </CardContent>
            </Card>
          </div>
       </div>
    </div>
  );
}
`;

const dirPath = '../deorigen-frontend-/src/app/[locale]/trazabilidad/[id]';
require('fs').mkdirSync(dirPath, { recursive: true });
require('fs').writeFileSync(dirPath + '/page.tsx', pageContent, 'utf8');

console.log('Traceability page generated!');
