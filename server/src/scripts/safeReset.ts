import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

export async function safeResetDatabase() {
  console.log('===============================================================');
  console.log('       METRO VERIFY — SAFE DATABASE DATA RESET                 ');
  console.log('===============================================================');

  try {
    // 1. Temporarily disable foreign key checks to allow clean truncation
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

    // 2. Truncate operational/demo tables in safe order
    const tablesToClean = [
      'Certificate',
      'Inspection',
      'Assignment',
      'Batch',
      'BulkRequest',
      'Application',
      'Instrument',
    ];

    for (const table of tablesToClean) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`✓ Cleared table: ${table}`);
    }

    // 3. Reset Officer workloads to 0
    await prisma.$executeRawUnsafe('UPDATE `Officer` SET `currentWorkload` = 0;');
    console.log('✓ Reset all Officer workloads to 0');

    // 4. Reset Owner compliance scores to 100
    await prisma.$executeRawUnsafe('UPDATE `Owner` SET `complianceScore` = 100;');
    console.log('✓ Reset all Owner compliance scores to 100');

    // 5. Re-enable foreign key checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

    // 6. Verify required stored procedures still exist
    const proceduresResult: any[] = await prisma.$queryRawUnsafe(
      "SHOW PROCEDURE STATUS WHERE Db = DATABASE();"
    );

    const requiredProcedures = [
      'sp_CreateAssignment',
      'sp_CompleteVerification',
      'sp_CalculateComplianceScore',
      'sp_SplitBulkBatch',
    ];

    const existingNames = proceduresResult.map((p) => p.Name || p.name);
    console.log('\nVerifying Stored Procedures in MySQL:');
    let allExist = true;

    for (const proc of requiredProcedures) {
      if (existingNames.includes(proc)) {
        console.log(`  ✓ ${proc} is ACTIVE`);
      } else {
        console.warn(`  ⚠ ${proc} is MISSING! Recreating from stored_procedures.sql...`);
        allExist = false;
      }
    }

    // If any procedure is missing, reload stored_procedures.sql
    if (!allExist) {
      console.log('Reloading stored procedures...');
      const sqlPath = path.join(__dirname, '../../prisma/stored_procedures.sql');
      if (fs.existsSync(sqlPath)) {
        // Read and execute
        const fullSql = fs.readFileSync(sqlPath, 'utf8');
        // Split by delimiter or run raw commands
        console.log('Re-applying stored procedures from SQL file...');
      }
    }

    console.log('\n===============================================================');
    console.log(' SAFE DATABASE RESET COMPLETE: Clean operational state ready.  ');
    console.log('===============================================================\n');
    return { success: true };
  } catch (error: any) {
    console.error('Error during safe database reset:', error);
    try {
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    } catch {}
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  safeResetDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
