const fs = require('fs');
const path = 'c:/Users/jhonm/OneDrive/Desktop/SistemaOctavo/DeOrigen/deorigen-backend/src/farmers/farmers.service.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /async contactFarmer\(id: string, dto: \{.*?\)\s*\{[\s\S]*?return \{ success: true, message: 'Mensaje enviado' \};\s*\}/g;

const correctFunc = \sync contactFarmer(id: string, dto: { name: string; email: string; message: string; phone?: string }) {
    const farmer = await this.prisma.farmerProfile.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!farmer) throw new NotFoundException('Productor no encontrado');

    const farmerEmail = farmer.user.email;
    const body = \\Tienes un nuevo mensaje de contacto a traves de DeOrigen.\\n\\nNombre: \\
Email: \\
Telefono: \\
\\nMensaje:\\n\\\;

    await this.prisma.lead.create({
      data: {
        type: 'contacto_productor',
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: \\Para productor \: \\\,
      }
    });

    return { success: true, message: 'Mensaje enviado' };
  }\;

content = content.replace(regex, correctFunc);
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed.');