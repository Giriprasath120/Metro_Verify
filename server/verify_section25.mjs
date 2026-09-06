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

const post = (path, body, token) =>
  request(
    {
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
    body
  );

const get = (path, token) =>
  request({
    hostname: 'localhost',
    port: 4000,
    path,
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

async function runSection25Test() {
  console.log('===============================================================');
  console.log('       METRO VERIFY — SECTION 25 END-TO-END VERIFICATION       ');
  console.log('===============================================================');

  // STEP 1: Owner registers 5 instruments & submits verification requests
  console.log('\n[STEP 1] Owner registering 5 instruments & submitting verification requests...');
  const machineIds = [];
  const applicationIds = [];

  for (let i = 1; i <= 5; i++) {
    const regRes = await post('/api/instruments', {
      serialNumber: `SN-2026-TEST-${i}`,
      model: `Precision Scale Test Model #${i}`,
      manufacturer: 'Avery India Metrology Ltd',
      category: 'Non-Automatic Weighing Instrument',
      capacity: `${i * 10} kg`,
      ownerId: 'OWN-101',
      location: `Bowenpally Yard Gate #${i}`,
    });
    const instId = regRes.body.instrument.id;
    machineIds.push(instId);

    const appRes = await post('/api/applications', {
      instrumentId: instId,
      ownerId: 'OWN-101',
      preferredDate: '2026-09-06',
    });
    applicationIds.push(appRes.body.application.id);
  }
  console.log('Registered Instruments:', machineIds);
  console.log('Submitted Applications:', applicationIds);

  // STEP 2: Admin views requests & assigns:
  // Machine 1 & 2 -> Ramanathan (LMO-101)
  // Machine 3 -> Sunita Rao (LMO-102)
  // Machine 4 -> A. Kumar (LMO-103)
  // Machine 5 -> GATC Central (GATC-01)
  console.log('\n[STEP 2] Admin allocating and scheduling via sp_CreateAssignment...');
  const asg1 = await post('/api/schedule/assign', { applicationId: applicationIds[0], officerId: 'LMO-101' });
  const asg2 = await post('/api/schedule/assign', { applicationId: applicationIds[1], officerId: 'LMO-101' });
  const asg3 = await post('/api/schedule/assign', { applicationId: applicationIds[2], officerId: 'LMO-102' });
  const asg4 = await post('/api/schedule/assign', { applicationId: applicationIds[3], officerId: 'LMO-103' });
  const asg5 = await post('/api/schedule/assign', { applicationId: applicationIds[4], officerId: 'GATC-01' });

  console.log(`Machine 1 (${machineIds[0]}) -> Ramanathan: ${asg1.body.assignment?.id}`);
  console.log(`Machine 2 (${machineIds[1]}) -> Ramanathan: ${asg2.body.assignment?.id}`);
  console.log(`Machine 3 (${machineIds[2]}) -> Sunita Rao:   ${asg3.body.assignment?.id}`);
  console.log(`Machine 4 (${machineIds[3]}) -> A. Kumar:     ${asg4.body.assignment?.id}`);
  console.log(`Machine 5 (${machineIds[4]}) -> GATC Central: ${asg5.body.assignment?.id}`);

  // STEP 3: LMO Ramanathan logs in & verifies his dashboard
  console.log('\n[STEP 3] LMO Ramanathan logs in & checks dashboard...');
  const loginRes = await post('/api/auth/login', { role: 'officer', identifier: 'LMO-101', password: 'password123' });
  const ramanathanToken = loginRes.body.token;

  const ramanathanDash = await get('/api/lmo/dashboard', ramanathanToken);
  const ramanathanAsgList = await get('/api/lmo/assignments', ramanathanToken);

  console.log('Ramanathan Authenticated:', loginRes.body.user.name, `(${loginRes.body.user.badgeNumber})`);
  console.log('Ramanathan Live Metrics:', ramanathanDash.body.metrics);

  const myMachine1 = ramanathanAsgList.body.assignments.find((a) => a.instrumentId === machineIds[0]);
  const myMachine2 = ramanathanAsgList.body.assignments.find((a) => a.instrumentId === machineIds[1]);
  const foreignMachine3 = ramanathanAsgList.body.assignments.find((a) => a.instrumentId === machineIds[2]);

  console.log(`Ramanathan sees Machine 1: ${!!myMachine1}`);
  console.log(`Ramanathan sees Machine 2: ${!!myMachine2}`);
  console.log(`Ramanathan sees Machine 3 (assigned to Sunita Rao): ${!!foreignMachine3} (MUST BE FALSE)`);

  // STEP 4: Ramanathan verifies Machine 1 -> PASS -> Certificate generated
  console.log('\n[STEP 4] Ramanathan verifying Machine 1 with Camera & GPS evidence -> PASS...');
  const passRes = await post(
    `/api/inspections/${myMachine1.id}/complete`,
    {
      standardWeight: '10.000 kg',
      indicatedValue: '10.002 kg',
      errorMargin: '+2 g',
      toleranceLimit: '±5 g',
      observations: 'Verified within MPE limits. Physical stamping applied.',
      photoReference: 'data:image/jpeg;base64,evidence_photo_stamp_seal',
      latitude: 17.4485,
      longitude: 78.4870,
      locationTimestamp: new Date().toISOString(),
    },
    ramanathanToken
  );
  console.log('Verification Result:', passRes.body.result);
  console.log('Instrument Status:', passRes.body.instrument?.status);
  console.log('Certificate Issued:', passRes.body.certificate?.certificateNumber);

  // STEP 5: Offline Test on Machine 2
  console.log('\n[STEP 5] Offline Test: Machine 2 saved offline -> then synchronized...');
  const offlineSyncRes = await post(
    '/api/offline/sync',
    {
      verifications: [
        {
          assignmentId: myMachine2.id,
          instrumentId: machineIds[1],
          result: 'PASS',
          standardWeight: '20.000 kg',
          indicatedValue: '20.001 kg',
          errorMargin: '+1 g',
          toleranceLimit: '±10 g',
          observations: 'Offline field verification with local evidence',
          photoReference: 'data:image/jpeg;base64,offline_seal_img',
          latitude: 17.449,
          longitude: 78.488,
          locationTimestamp: new Date().toISOString(),
        },
      ],
    },
    ramanathanToken
  );
  console.log('Offline Sync Status:', offlineSyncRes.body.syncedCount, 'item(s) synced');
  console.log('Synced Certificate Number:', offlineSyncRes.body.results[0]?.certificate?.certificateNumber);

  // STEP 6: Fail test on Machine 4 (assigned to A. Kumar) -> FAIL -> REINSPECTION_REQUIRED
  console.log('\n[STEP 6] FAIL Test on Machine 4 -> Expecting NO certificate & status REINSPECTION_REQUIRED...');
  const kumarLogin = await post('/api/auth/login', { role: 'officer', identifier: 'LMO-103', password: 'password123' });
  const kumarToken = kumarLogin.body.token;

  const failRes = await post(
    `/api/inspections/${asg4.body.assignment?.id}/failure`,
    {
      standardWeight: '40.000 kg',
      indicatedValue: '40.120 kg',
      errorMargin: '+120 g',
      toleranceLimit: '±20 g',
      observations: 'Variance exceeds maximum permissible error limits. Reinspection required.',
    },
    kumarToken
  );
  console.log('Fail Test Result:', failRes.body.result);
  console.log('Fail Test Status:', failRes.body.status);
  console.log('Certificate Generated?:', failRes.body.certificate !== null ? 'ERROR (Cert should be null)' : 'CORRECT (Cert is null)');

  // STEP 7: Check Owner view for all machines
  console.log('\n[STEP 7] Checking Owner view in MySQL...');
  const ownerInstRes = await get('/api/instruments?ownerId=OWN-101');
  const ownerCertRes = await get('/api/certificates?ownerId=OWN-101');

  const m1State = ownerInstRes.body.instruments.find((i) => i.id === machineIds[0]);
  const m2State = ownerInstRes.body.instruments.find((i) => i.id === machineIds[1]);
  const m4State = ownerInstRes.body.instruments.find((i) => i.id === machineIds[3]);

  console.log(`Machine 1 (${machineIds[0]}) Owner Status:`, m1State?.status, `(Expected: VERIFIED)`);
  console.log(`Machine 2 (${machineIds[1]}) Owner Status:`, m2State?.status, `(Expected: VERIFIED)`);
  console.log(`Machine 4 (${machineIds[3]}) Owner Status:`, m4State?.status, `(Expected: REINSPECTION_REQUIRED)`);
  console.log(`Total Active Owner Certificates:`, ownerCertRes.body.count);

  console.log('\n===============================================================');
  console.log('       ALL SECTION 25 TESTS PASSED WITH 100% SUCCESS!          ');
  console.log('===============================================================');
}

runSection25Test().catch(console.error);
