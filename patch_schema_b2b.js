const fs = require('fs');

const schemaPath = '../deorigen-backend/prisma/schema.prisma';
let schemaData = fs.readFileSync(schemaPath, 'utf8');

schemaData = schemaData.replace(`isFeatured      Boolean  @default(false)`, `isFeatured      Boolean  @default(false)\n  isB2B           Boolean  @default(false)`);

fs.writeFileSync(schemaPath, schemaData, 'utf8');
console.log('Schema patched with isB2B!');
