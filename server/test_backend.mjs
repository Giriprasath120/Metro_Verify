import http from 'http';

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function test() {
  console.log('--- Starting Backend E2E Test ---');

  // 1. Officer Login
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { role: 'officer', identifier: 'LMO-101', password: 'password123' }
  );
  console.log('1. Login status:', loginRes.status, 'User:', loginRes.body?.user?.name);
  const token = loginRes.body.token;

  // 2. LMO Dashboard
  const dashRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/lmo/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('2. LMO Dashboard Metrics:', dashRes.body.metrics);

  // 3. Create Application for INST-TS-03
  const appRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/applications',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { instrumentId: 'INST-TS-03', preferredDate: '2026-09-06' }
  );
  console.log('3. Application Created:', appRes.body?.application?.id);
  const appId = appRes.body?.application?.id;

  // 4. Assign to LMO-101 via sp_CreateAssignment
  const assignRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/schedule/assign',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { applicationId: appId, officerId: 'LMO-101' }
  );
  console.log('4. Assignment created via sp_CreateAssignment:', assignRes.body?.assignment?.id);
  const assignmentId = assignRes.body?.assignment?.id;

  // 5. Check LMO Dashboard again (workload should be updated)
  const dashRes2 = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/lmo/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('5. LMO Dashboard after assignment:', dashRes2.body.metrics);

  // 6. Complete Verification via sp_CompleteVerification
  const compRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/inspections/${assignmentId}/complete`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      standardWeight: '500 g',
      indicatedValue: '500.0001 g',
      errorMargin: '+0.1 mg',
      toleranceLimit: '±0.2 mg',
      observations: 'Standard balance calibrated in compliance with Class I limits',
      latitude: 17.4485,
      longitude: 78.4870,
    }
  );
  console.log('6. Complete verification status:', compRes.status, 'Result:', compRes.body?.result, 'Cert:', compRes.body?.certificate?.certificateNumber);

  // 7. Check Compliance score via sp_CalculateComplianceScore
  const compScoreRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/compliance/OWN-101/score',
    method: 'GET',
  });
  console.log('7. Compliance Score:', compScoreRes.body?.complianceScore, 'Grade:', compScoreRes.body?.grade);

  console.log('--- Backend E2E Test Completed ---');
}

test().catch(console.error);
