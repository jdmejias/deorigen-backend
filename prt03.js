const fs = require('fs');

const dtopath = '../deorigen-backend/src/products/dto/products.dto.ts';
let dtodata = fs.readFileSync(dtopath, 'utf8');
dtodata = dtodata.replace(`export class ProductsQueryDto {`, `export class ProductsQueryDto {\n  @ApiPropertyOptional()\n  @IsOptional()\n  @IsBoolean()\n  @Type(() => Boolean)\n  includeB2b?: boolean;\n`);
fs.writeFileSync(dtopath, dtodata, 'utf8');

const srvpath = '../deorigen-backend/src/products/products.service.ts';
let srvdata = fs.readFileSync(srvpath, 'utf8');
srvdata = srvdata.replace(/const where: Prisma\.ProductWhereInput = \{ isActive: true \};/, `const where: Prisma.ProductWhereInput = { isActive: true };\n    if (!query.includeB2b) {\n      where.isB2B = false;\n    }`);
fs.writeFileSync(srvpath, srvdata, 'utf8');

console.log('PRT-03 Applied');
