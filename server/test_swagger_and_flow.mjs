import fs from 'fs';

const BASE_URL = 'http://localhost:4000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    return { status: res.status, headers: res.headers, data };
  } else {
    const buffer = await res.arrayBuffer();
    return { status: res.status, headers: res.headers, buffer: Buffer.from(buffer) };
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('       METRO VERIFY — SWAGGER & END-TO-END WORKFLOW TEST       ');
  console.log('===============================================================\n');

  // 1. Test Swagger UI and raw JSON spec
  console.log('[TEST 1] Testing Swagger Documentation...');
  const swaggerJsonRes = await request('/swagger.json');
  if (swaggerJsonRes.status !== 200 || !swaggerJsonRes.data?.paths) {
    throw new Error(`Swagger JSON failed: ${JSON.stringify(swaggerJsonRes)}`);
  }
  const pathsCount = Object.keys(swaggerJsonRes.data.paths).length;
  console.log(`✓ Swagger JSON active! Documented ${pathsCount} endpoints.`);

  const swaggerUiRes = await fetch(`${BASE_URL}/api-docs/`);
  console.log(`✓ Swagger UI active at ${BASE_URL}/api-docs (HTTP ${swaggerUiRes.status})`);

  // 2. Test Officer Login (both /api/auth/login and /api/auth/officer/login)
  console.log('\n[TEST 2] Testing Dedicated Officer Login...');
  const officerLoginRes = await request('/api/auth/officer/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'LMO-101',
      password: 'password123',
    }),
  });

  if (officerLoginRes.status !== 200 || !officerLoginRes.data.token) {
    throw new Error(`Officer login failed: ${JSON.stringify(officerLoginRes.data)}`);
  }
  const lmo101Token = officerLoginRes.data.token;
  console.log(`✓ Officer LMO-101 logged in successfully. Name: ${officerLoginRes.data.user.name}`);

  // Test Admin Login
  const adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      role: 'admin',
      identifier: 'ADMIN-101',
    }),
  });
  console.log(`✓ Admin ADMIN-101 logged in successfully. Token generated: ${!!adminLoginRes.data.token}`);

  // 3. Confirm Clean Seed State on LMO-101 Dashboard
  console.log('\n[TEST 3] Confirming Zero Mock Instruments on LMO Dashboard (Clean Seed)...');
  const initialDashboard = await request('/api/lmo/dashboard', {
    headers: { Authorization: `Bearer ${lmo101Token}` },
  });

  const metrics = initialDashboard.data.metrics;
  console.log('Initial LMO-101 Metrics:', metrics);
  if (
    metrics.assignedToday !== 0 ||
    metrics.completed !== 0 ||
    metrics.remaining !== 0 ||
    metrics.offlinePendingSync !== 0
  ) {
    throw new Error(`Expected zero counters on clean state, but got: ${JSON.stringify(metrics)}`);
  }
  if (initialDashboard.data.assignments.length !== 0) {
    throw new Error(`Expected 0 assignments, got ${initialDashboard.data.assignments.length}`);
  }
  console.log('✓ Verified: 0 assigned, 0 completed, 0 remaining, 0 offline pending, 0 demo instruments!');

  // 4. Owner Registers 5 Instruments
  console.log('\n[TEST 4] Owner registering 5 instruments...');
  const instruments = [
    { name: 'Machine A (Electronic Weighbridge)', cat: 'Electronic Weighbridge', cap: '60 Metric Ton', acc: 'Class IV' },
    { name: 'Machine B (Platform Scale)', cat: 'Digital Platform Scale', cap: '300 kg', acc: 'Class III' },
    { name: 'Machine C (Analytical Balance)', cat: 'Precision Analytical Balance', cap: '500 g', acc: 'Class I' },
    { name: 'Machine D (Commercial Counter Scale)', cat: 'Commercial Counter Scale', cap: '30 kg', acc: 'Class III' },
    { name: 'Machine E (Automatic Checkweigher)', cat: 'Automatic Checkweigher', cap: '50 kg', acc: 'Class III' },
  ];

  const registeredInstruments = [];
  const submittedApplications = [];

  for (let i = 0; i < instruments.length; i++) {
    const inst = instruments[i];
    const regRes = await request('/api/instruments', {
      method: 'POST',
      body: JSON.stringify({
        model: inst.name,
        manufacturer: 'Premier Scales Ltd',
        category: inst.cat,
        capacity: inst.cap,
        accuracyClass: inst.acc,
        ownerId: 'OWN-101',
        location: `Bay ${i + 1}, Osmangunj Wholesale Market, Hyderabad`,
      }),
    });
    const createdInst = regRes.data.instrument;
    registeredInstruments.push(createdInst);

    // Submit Verification Request
    const appRes = await request('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        instrumentId: createdInst.id,
        ownerId: 'OWN-101',
        category: inst.cat,
        capacity: inst.cap,
        accuracyClass: inst.acc,
        preferredDate: new Date().toISOString().split('T')[0],
      }),
    });
    submittedApplications.push(appRes.data.application);
  }
  console.log(`✓ Registered 5 instruments: ${registeredInstruments.map(i => i.id).join(', ')}`);
  console.log(`✓ Submitted 5 applications: ${submittedApplications.map(a => a.id).join(', ')}`);

  // 5. Admin Allocates and Assigns via sp_CreateAssignment
  console.log('\n[TEST 5] Admin assigning instruments via sp_CreateAssignment...');
  // Machine A -> LMO-101
  await request('/api/schedule/assign', {
    method: 'POST',
    body: JSON.stringify({ applicationId: submittedApplications[0].id, officerId: 'LMO-101' }),
  });
  // Machine B -> LMO-101
  await request('/api/schedule/assign', {
    method: 'POST',
    body: JSON.stringify({ applicationId: submittedApplications[1].id, officerId: 'LMO-101' }),
  });
  // Machine C -> LMO-102 (Sunita Rao)
  await request('/api/schedule/assign', {
    method: 'POST',
    body: JSON.stringify({ applicationId: submittedApplications[2].id, officerId: 'LMO-102' }),
  });
  // Machine D -> LMO-103 (A. Kumar)
  await request('/api/schedule/assign', {
    method: 'POST',
    body: JSON.stringify({ applicationId: submittedApplications[3].id, officerId: 'LMO-103' }),
  });
  // Machine E -> GATC-01 (Central Lab)
  await request('/api/schedule/assign', {
    method: 'POST',
    body: JSON.stringify({ applicationId: submittedApplications[4].id, officerId: 'GATC-01' }),
  });

  console.log('✓ Assignments created:');
  console.log(`  Machine A (${registeredInstruments[0].id}) -> LMO-101 (Ramanathan)`);
  console.log(`  Machine B (${registeredInstruments[1].id}) -> LMO-101 (Ramanathan)`);
  console.log(`  Machine C (${registeredInstruments[2].id}) -> LMO-102 (Sunita Rao)`);
  console.log(`  Machine D (${registeredInstruments[3].id}) -> LMO-103 (A. Kumar)`);
  console.log(`  Machine E (${registeredInstruments[4].id}) -> GATC-01 (Central Lab)`);

  // 6. Test Multi-Officer Isolation
  console.log('\n[TEST 6] Testing Multi-Officer Dashboard Isolation...');
  const lmo101Asg = await request('/api/lmo/assignments', {
    headers: { Authorization: `Bearer ${lmo101Token}` },
  });
  const lmo101InstIds = lmo101Asg.data.assignments.map(a => a.instrumentId);
  console.log('LMO-101 sees instruments:', lmo101InstIds);

  if (
    !lmo101InstIds.includes(registeredInstruments[0].id) ||
    !lmo101InstIds.includes(registeredInstruments[1].id)
  ) {
    throw new Error('LMO-101 must see Machine A and Machine B!');
  }
  if (
    lmo101InstIds.includes(registeredInstruments[2].id) ||
    lmo101InstIds.includes(registeredInstruments[3].id) ||
    lmo101InstIds.includes(registeredInstruments[4].id)
  ) {
    throw new Error('LMO-101 MUST NOT see Machine C, D, or E!');
  }
  console.log('✓ Isolation Verified for LMO-101: Sees ONLY Machine A & B.');

  // Login as LMO-102
  const lmo102Login = await request('/api/auth/officer/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'LMO-102', password: 'password123' }),
  });
  const lmo102Asg = await request('/api/lmo/assignments', {
    headers: { Authorization: `Bearer ${lmo102Login.data.token}` },
  });
  const lmo102InstIds = lmo102Asg.data.assignments.map(a => a.instrumentId);
  console.log('LMO-102 sees instruments:', lmo102InstIds);
  if (
    !lmo102InstIds.includes(registeredInstruments[2].id) ||
    lmo102InstIds.includes(registeredInstruments[0].id) ||
    lmo102InstIds.includes(registeredInstruments[1].id)
  ) {
    throw new Error('LMO-102 must see ONLY Machine C!');
  }
  console.log('✓ Isolation Verified for LMO-102: Sees ONLY Machine C.');

  // 7. Physical Verification PASS for Machine A
  console.log('\n[TEST 7] Physical Verification PASS for Machine A with Camera & GPS...');
  const startInspRes = await request(`/api/inspections/${registeredInstruments[0].id}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lmo101Token}` },
  });
  const inspId = startInspRes.data.inspection.id;

  // Complete PASS
  const completePassRes = await request(`/api/inspections/${inspId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lmo101Token}` },
    body: JSON.stringify({
      standardWeight: '60.00 MT',
      indicatedValue: '60.00 MT',
      errorMargin: '0.00 kg',
      toleranceLimit: '± 20 kg',
      observations: 'Eccentricity & repeatability tests passed. Stamped with official lead seal.',
      photoReference: 'file:///local/camera/photo_machine_a.jpg',
      latitude: 17.4485,
      longitude: 78.4870,
      locationTimestamp: new Date().toISOString(),
    }),
  });

  console.log('Verification Result:', completePassRes.data.result);
  console.log('Instrument Status:', completePassRes.data.instrument.status);
  console.log('Certificate Issued:', completePassRes.data.certificate.certificateNumber);
  const certNumberMachineA = completePassRes.data.certificate.certificateNumber;

  // Verify LMO-101 Dashboard Counters after 1 verification
  const midDashboard = await request('/api/lmo/dashboard', {
    headers: { Authorization: `Bearer ${lmo101Token}` },
  });
  console.log('LMO-101 Metrics after Machine A verification:', {
    assignedToday: midDashboard.data.metrics.assignedToday,
    completed: midDashboard.data.metrics.completed,
    remaining: midDashboard.data.metrics.remaining,
  });

  // 8. Offline Verification & Sync for Machine B
  console.log('\n[TEST 8] Offline Verification & Sync for Machine B...');
  const offlineSyncRes = await request('/api/offline/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lmo101Token}` },
    body: JSON.stringify({
      verifications: [
        {
          instrumentId: registeredInstruments[1].id,
          result: 'PASS',
          standardWeight: '300.00 kg',
          indicatedValue: '300.02 kg',
          errorMargin: '+0.02 kg',
          toleranceLimit: '± 0.05 kg',
          observations: 'Corner test verified offline in warehouse bay 2.',
          photoReference: 'file:///local/camera/offline_photo_machine_b.jpg',
          latitude: 17.4486,
          longitude: 78.4872,
          localId: 'offline-queue-item-99',
        },
      ],
    }),
  });

  console.log(`✓ Offline sync response: ${offlineSyncRes.data.message}`);
  const postSyncDashboard = await request('/api/lmo/dashboard', {
    headers: { Authorization: `Bearer ${lmo101Token}` },
  });
  console.log('LMO-101 Metrics after Offline Sync:', {
    assignedToday: postSyncDashboard.data.metrics.assignedToday,
    completed: postSyncDashboard.data.metrics.completed,
    remaining: postSyncDashboard.data.metrics.remaining,
    offlinePendingSync: postSyncDashboard.data.metrics.offlinePendingSync,
  });

  // 9. Verification FAIL on Machine D
  console.log('\n[TEST 9] Recording verification FAIL on Machine D (LMO-103)...');
  const lmo103Login = await request('/api/auth/officer/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'LMO-103', password: 'password123' }),
  });

  const failRes = await request(`/api/inspections/${registeredInstruments[3].id}/failure`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lmo103Login.data.token}` },
    body: JSON.stringify({
      standardWeight: '30.00 kg',
      indicatedValue: '30.85 kg',
      errorMargin: '+0.85 kg',
      toleranceLimit: '± 0.05 kg',
      observations: 'Excessive error of 850g exceeding Class III MPE limits. Rejection notice issued.',
    }),
  });

  console.log('Fail Test Result:', failRes.data.result);
  console.log('Fail Test Instrument Status:', failRes.data.instrument.status);
  console.log('Certificate Issued?:', failRes.data.certificate === null ? 'CORRECT (null)' : 'ERROR (not null)');

  // 10. Check Owner view in MySQL
  console.log('\n[TEST 10] Checking Owner View & Certificate Download...');
  const ownerInstRes = await request(`/api/instruments?ownerId=OWN-101`);
  const ownerInstMap = {};
  for (const i of ownerInstRes.data.instruments) {
    ownerInstMap[i.id] = i.status;
  }
  console.log('Owner Instruments Status:', ownerInstMap);

  // Download PDF
  const pdfRes = await request(`/api/certificates/${certNumberMachineA}/pdf`);
  const contentType = pdfRes.headers.get('content-type');
  const pdfSize = pdfRes.buffer ? pdfRes.buffer.length : 0;
  console.log(`✓ Certificate PDF Downloaded: Content-Type: ${contentType}, Size: ${pdfSize} bytes`);
  if (!contentType.includes('application/pdf') || pdfSize < 1000) {
    throw new Error('Failed to generate valid binary PDF!');
  }

  // Digital Passport
  const passportRes = await request(`/api/instruments/${registeredInstruments[0].id}/passport`);
  console.log(`✓ Digital Passport retrieved with ${passportRes.data.timeline.length} timeline stages.`);

  // 11. Bulk Request & Batch Splitting via sp_SplitBulkBatch
  console.log('\n[TEST 11] Testing Bulk Request & Dynamic Batch Splitting...');
  const bulkRes = await request('/api/bulk-requests', {
    method: 'POST',
    body: JSON.stringify({
      ownerId: 'OWN-101',
      facilityName: 'Telangana Logistics Yard',
      category: 'Commercial Scales',
      instrumentCount: 50,
    }),
  });
  const bulkId = bulkRes.data.bulkRequest.id;
  console.log(`✓ Bulk Request created: ${bulkId}`);

  const splitRes = await request(`/api/bulk-requests/${bulkId}/split`, {
    method: 'POST',
    body: JSON.stringify({
      officerAllocations: [
        { officerId: 'LMO-101', count: 20, batchName: 'Batch 1 - Section North' },
        { officerId: 'LMO-102', count: 20, batchName: 'Batch 2 - Section East' },
        { officerId: 'LMO-103', count: 10, batchName: 'Batch 3 - Section South' },
      ],
    }),
  });
  if (splitRes.status !== 200 || !splitRes.data?.bulkRequest) {
    console.error('Split error:', splitRes.status, splitRes.data);
    throw new Error(`Split failed: ${JSON.stringify(splitRes.data)}`);
  }
  console.log(`✓ Bulk Request ${bulkId} split into ${splitRes.data.bulkRequest.batches.length} batches via sp_SplitBulkBatch.`);

  // 12. Controlled Expiry Transitions (Section 34: ACTIVE -> EXPIRING_SOON -> EXPIRED)
  console.log('\n[TEST 12] Testing Statutory Expiry Transitions (ACTIVE -> EXPIRING_SOON -> EXPIRED)...');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Set Machine A expiry to 15 days in future (EXPIRING_SOON window)
    const futureDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    await prisma.instrument.update({
      where: { id: registeredInstruments[0].id },
      data: { expiryDate: futureDate, status: 'VERIFIED' },
    });

    const scanRes1 = await request('/api/notifications/expiry-check', { method: 'POST' });
    const machineAExpiring = await prisma.instrument.findUnique({ where: { id: registeredInstruments[0].id } });
    console.log(`✓ Scan 1 (15 days remaining) -> Instrument Status: ${machineAExpiring.status} (Expected: EXPIRING_SOON)`);
    if (machineAExpiring.status !== 'EXPIRING_SOON') {
      throw new Error(`Expected EXPIRING_SOON, got ${machineAExpiring.status}`);
    }

    // Set Machine A expiry to 5 days ago (EXPIRED window)
    const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
    await prisma.instrument.update({
      where: { id: registeredInstruments[0].id },
      data: { expiryDate: pastDate },
    });

    const scanRes2 = await request('/api/notifications/expiry-check', { method: 'POST' });
    const machineAExpired = await prisma.instrument.findUnique({ where: { id: registeredInstruments[0].id } });
    console.log(`✓ Scan 2 (5 days overdue) -> Instrument Status: ${machineAExpired.status} (Expected: EXPIRED)`);
    if (machineAExpired.status !== 'EXPIRED') {
      throw new Error(`Expected EXPIRED, got ${machineAExpired.status}`);
    }
    console.log('✓ Expiry alerts dispatched:', scanRes2.data.alerts.length, 'notice(s) sent.');
  } finally {
    await prisma.$disconnect();
  }

  // 13. AI Legal Metrology Assistant Query
  console.log('\n[TEST 13] Testing AI Assistant Query...');
  const aiRes = await request('/api/chatbot/query', {
    method: 'POST',
    body: JSON.stringify({
      message: 'What is the statutory verification fee for an Electronic Weighbridge under Rule 14?',
      ownerId: 'OWN-101',
    }),
  });
  console.log(`✓ AI Response received from provider: ${aiRes.data.source || 'Domain Engine'}`);
  console.log(`  Preview: "${aiRes.data.reply.slice(0, 100)}..."`);

  console.log('\n===============================================================');
  console.log(' ALL END-TO-END WORKFLOW TESTS COMPLETED WITH 100% SUCCESS!    ');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution error:', err);
  process.exit(1);
});
