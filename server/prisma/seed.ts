import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('===============================================================');
  console.log('       METRO VERIFY — SEEDING MINIMAL TEST ACCOUNTS            ');
  console.log('===============================================================');

  // Common hashed password for test accounts
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Reference Officers (LMO & GATC)
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

  for (const officer of officers) {
    await prisma.officer.upsert({
      where: { id: officer.id },
      update: {
        ...officer,
        currentWorkload: 0, // Enforce zero initial workload
      },
      create: officer,
    });
  }
  console.log(`✓ Seeded ${officers.length} Officer Accounts (4 LMOs + 1 GATC Lab).`);

  // 2. Seed Reference Owners
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

  for (const owner of owners) {
    await prisma.owner.upsert({
      where: { id: owner.id },
      update: owner,
      create: owner,
    });
  }
  console.log(`✓ Seeded ${owners.length} Owner Accounts (OWN-101 Rajesh Kumar, OWN-102 Priya Sharma).`);

  // Clean state confirmation
  const [instCount, appCount, asgCount, certCount] = await Promise.all([
    prisma.instrument.count(),
    prisma.application.count(),
    prisma.assignment.count(),
    prisma.certificate.count(),
  ]);

  console.log('\nOperational Data Audit:');
  console.log(`  Instruments in DB:  ${instCount}`);
  console.log(`  Applications in DB: ${appCount}`);
  console.log(`  Assignments in DB:  ${asgCount}`);
  console.log(`  Certificates in DB: ${certCount}`);
  console.log('===============================================================');
  console.log(' SEEDING COMPLETED: Minimum test accounts ready.               ');
  console.log('===============================================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
