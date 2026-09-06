const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();
async function main() {
  const r = await p.$queryRawUnsafe('CALL sp_CalculateComplianceScore(?)', 'OWN-101');
  console.log('Result type:', typeof r, Array.isArray(r));
  console.log('Keys:', Object.keys(r));
  console.log('Result content:', r);
}
main().finally(() => p.$disconnect());
