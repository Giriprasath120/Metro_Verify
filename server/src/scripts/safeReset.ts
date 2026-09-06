import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

export async function safeResetDatabase() {
  console.log('===============================================================');
  console.log('       METRO VERIFY — COMPLETE CLEAN SLATE DATABASE RESET      ');
  console.log('===============================================================');

  try {
    // 1. Temporarily disable foreign key checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

    // 2. Truncate all transactional tables
    const transactionalTables = [
      'Certificate',
      'Inspection',
      'Assignment',
      'Batch',
      'BulkRequest',
      'Application',
    ];

    for (const table of transactionalTables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`✓ Cleared operational table: ${table}`);
    }

    // 3. Clear all instruments
    await prisma.$executeRawUnsafe('TRUNCATE TABLE `Instrument`;');
    console.log('✓ Cleared table: Instrument');

    // 4. Reset Officer workloads and ensure 5 standard officers
    await prisma.$executeRawUnsafe('DELETE FROM `Officer`;');
    console.log('✓ Reset Officer table');

    // 5. Reset Owner table
    await prisma.$executeRawUnsafe('DELETE FROM `Owner`;');
    console.log('✓ Reset Owner table');

    // 6. Re-enable foreign key checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

    // 7. Seed 5 Clean Standard Officers
    const passwordHash = await bcrypt.hash('password123', 10);
    const officers = [
      {
        id: 'LMO-101',
        name: 'V. Ramanathan',
        role: 'LMO',
        badgeNumber: 'LM-HYD-042',
        designation: 'Senior Legal Metrology Officer',
        department: 'Department of Legal Metrology',
        phone: '+91 98480 12345',
        email: 'ramanathan.v@lm.telangana.gov.in',
        passwordHash,
        state: 'Telangana',
        district: 'Hyderabad',
        jurisdiction: 'Hyderabad North',
        currentWorkload: 0,
        maxCapacity: 20,
        rating: 4.9,
        active: true,
      },
      {
        id: 'LMO-102',
        name: 'Sunita Rao',
        role: 'LMO',
        badgeNumber: 'LM-SEC-018',
        designation: 'Legal Metrology Officer',
        department: 'Department of Legal Metrology',
        phone: '+91 98480 23456',
        email: 'sunita.rao@lm.telangana.gov.in',
        passwordHash,
        state: 'Telangana',
        district: 'Hyderabad',
        jurisdiction: 'Secunderabad',
        currentWorkload: 0,
        maxCapacity: 20,
        rating: 4.7,
        active: true,
      },
      {
        id: 'LMO-103',
        name: 'A. Kumar',
        role: 'LMO',
        badgeNumber: 'LM-CHA-029',
        designation: 'Legal Metrology Officer',
        department: 'Department of Legal Metrology',
        phone: '+91 98480 34567',
        email: 'a.kumar@lm.telangana.gov.in',
        passwordHash,
        state: 'Telangana',
        district: 'Hyderabad',
        jurisdiction: 'Charminar Zone',
        currentWorkload: 0,
        maxCapacity: 20,
        rating: 4.8,
        active: true,
      },
      {
        id: 'LMO-104',
        name: 'K. Priya',
        role: 'LMO',
        badgeNumber: 'LM-CYB-055',
        designation: 'Legal Metrology Officer',
        department: 'Department of Legal Metrology',
        phone: '+91 98480 45678',
        email: 'k.priya@lm.telangana.gov.in',
        passwordHash,
        state: 'Telangana',
        district: 'Hyderabad',
        jurisdiction: 'Cyberabad West',
        currentWorkload: 0,
        maxCapacity: 20,
        rating: 4.6,
        active: true,
      },
      {
        id: 'GATC-01',
        name: 'Telangana State Legal Metrology Central Laboratory',
        role: 'GATC',
        badgeNumber: 'GATC-TS-01',
        designation: 'Government Approved Test Centre',
        department: 'Central Testing Authority',
        phone: '+91 40 2345 6789',
        email: 'gatc.central@lm.telangana.gov.in',
        passwordHash,
        state: 'Telangana',
        district: 'Hyderabad',
        jurisdiction: 'Hyderabad Central',
        currentWorkload: 0,
        maxCapacity: 100,
        rating: 4.9,
        active: true,
      },
    ];

    for (const off of officers) {
      await prisma.officer.create({ data: off });
    }
    console.log(`✓ Seeded ${officers.length} clean standard Officers (4 LMOs + 1 GATC Lab). All workloads = 0.`);

    // 8. Seed Reference Owners
    const owners = [
      {
        id: 'OWN-101',
        name: 'Rajesh Kumar',
        businessName: 'Sri Balaji Mandi & Agro Traders',
        type: 'Commercial Wholesale',
        email: 'rajesh.kumar@balajiagro.in',
        phone: '+91 98765 43210',
        state: 'Telangana',
        district: 'Hyderabad',
        address: 'Shop No. 14-16, Wholesale Grain Market, Osmangunj, Hyderabad - 500012',
        complianceScore: 100,
      },
      {
        id: 'OWN-102',
        name: 'Priya Sharma',
        businessName: 'Sharma Hallmarking & Gold Refinery',
        type: 'Commercial',
        email: 'priya@sharmagold.co.in',
        phone: '+91 98110 56789',
        state: 'Delhi',
        district: 'New Delhi Central',
        address: '112 Bank Street, Karol Bagh, New Delhi',
        complianceScore: 100,
      },
    ];

    for (const own of owners) {
      await prisma.owner.create({ data: own });
    }
    console.log(`✓ Seeded ${owners.length} Reference Owners (OWN-101 Rajesh Kumar, OWN-102 Priya Sharma).`);

    // 9. Seed Standard Clean Instruments for OWN-101 & OWN-102
    const instruments = [
      {
        id: 'INST-TS-01',
        serialNumber: 'SN-2024-WB-8891',
        model: 'Essae SuperWeigh-80T Pitless Weighbridge',
        manufacturer: 'Essae-Teraoka Pvt Ltd',
        category: 'Electronic Weighbridge',
        subCategory: 'Pitless Static Road Vehicle Scale',
        capacity: '80 Metric Ton',
        accuracyClass: 'Class III',
        ownerId: 'OWN-101',
        location: 'Bowenpally Mandi Gate #2, Hyderabad',
        district: 'Hyderabad North',
        state: 'Telangana',
        lastVerifiedDate: '2025-09-14',
        expiryDate: '2026-09-13',
        status: 'PENDING',
      },
      {
        id: 'INST-TS-02',
        serialNumber: 'SN-2025-NAWI-1120',
        model: 'Avery Weigh-Tronix Class III Retail Counter Scale',
        manufacturer: 'Avery India Ltd',
        category: 'Non-Automatic Weighing Instrument',
        subCategory: 'Digital Retail Scale (Tabletop)',
        capacity: '30 kg',
        accuracyClass: 'Class III',
        ownerId: 'OWN-101',
        location: 'Counter 1, Bowenpally Wholesale Mandi',
        district: 'Hyderabad North',
        state: 'Telangana',
        lastVerifiedDate: '2026-01-10',
        expiryDate: '2027-01-09',
        status: 'PENDING',
      },
      {
        id: 'INST-TS-03',
        serialNumber: 'SN-2025-PLAT-550',
        model: 'Phoenix Heavy Platform Scale 500kg',
        manufacturer: 'Phoenix Scales Ltd',
        category: 'Non-Automatic Weighing Instrument',
        subCategory: 'Heavy Industrial Platform',
        capacity: '500 kg',
        accuracyClass: 'Class III',
        ownerId: 'OWN-101',
        location: 'Loading Bay 4, Bowenpally Mandi',
        district: 'Hyderabad North',
        state: 'Telangana',
        lastVerifiedDate: '2025-11-04',
        expiryDate: '2026-11-03',
        status: 'PENDING',
      },
      {
        id: 'INST-TS-04',
        serialNumber: 'SN-2025-PREC-091',
        model: 'Sartorius High Precision Bullion Balance',
        manufacturer: 'Sartorius AG',
        category: 'Non-Automatic Weighing Instrument',
        subCategory: 'Bullion Microbalance',
        capacity: '200 g',
        accuracyClass: 'Class I',
        ownerId: 'OWN-102',
        location: 'Refinery Hall, Karol Bagh, New Delhi',
        district: 'New Delhi Central',
        state: 'Delhi',
        lastVerifiedDate: '2025-10-15',
        expiryDate: '2026-10-14',
        status: 'PENDING',
      },
    ];

    for (const inst of instruments) {
      await prisma.instrument.create({ data: inst });
    }
    console.log(`✓ Seeded ${instruments.length} baseline Instruments.`);

    // 10. Audit Confirmation
    const [instCount, appCount, bulkCount, asgCount, inspCount, certCount, offCount] = await Promise.all([
      prisma.instrument.count(),
      prisma.application.count(),
      prisma.bulkRequest.count(),
      prisma.assignment.count(),
      prisma.inspection.count(),
      prisma.certificate.count(),
      prisma.officer.count(),
    ]);

    console.log('\n===============================================================');
    console.log(' POST-RESET DATABASE AUDIT:');
    console.log(`  Officers:           ${offCount} (4 LMOs + 1 GATC Lab, all workload=0)`);
    console.log(`  Instruments:        ${instCount}`);
    console.log(`  Applications:       ${appCount} (CLEAN ZERO)`);
    console.log(`  Bulk Requests:      ${bulkCount} (CLEAN ZERO)`);
    console.log(`  Assignments:        ${asgCount} (CLEAN ZERO)`);
    console.log(`  Inspections:        ${inspCount} (CLEAN ZERO)`);
    console.log(`  Certificates:       ${certCount} (CLEAN ZERO)`);
    console.log('===============================================================');
    console.log(' CLEAN SLATE READY FOR COMPLETE WORKFLOW TESTING.');
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
