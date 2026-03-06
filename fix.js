const fs = require('fs');
const schemaPath = '../deorigen-backend/prisma/schema.prisma';
let schemaData = fs.readFileSync(schemaPath, 'utf8');
schemaData = schemaData.replace(/isB2B           Boolean  @default\(false\)\s+isB2B           Boolean  @default\(false\)/, `isB2B           Boolean  @default(false)`);
fs.writeFileSync(schemaPath, schemaData, 'utf8');
console.log('Fixed dup!');
