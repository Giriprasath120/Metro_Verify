const http = require('http');

function post(path, data, token) {
  return new Promise((res, rej) => {
    const req = http.request({
      hostname: 'localhost', port: 4000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
    }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
    req.write(JSON.stringify(data)); req.end();
  });
}

async function testFailAndOffline() {
  const login = await post('/api/auth/login', { role: 'officer', identifier: 'LMO-101', password: 'password123' });
  const token = login.token;
  
  // 1. Create app for INST-TS-04 & assign to LMO-101
  const app = await post('/api/applications', { instrumentId: 'INST-TS-04' });
  const asg = await post('/api/schedule/assign', { applicationId: app.application.id, officerId: 'LMO-101' });
  console.log('Assigned INST-TS-04 to Ramanathan:', asg.assignment.id);

  // 2. Fail verification
  const fail = await post('/api/inspections/' + asg.assignment.id + '/failure', { observations: 'Variance exceeds error margin' }, token);
  console.log('FAIL verification result:', fail.result, 'Status:', fail.status, 'Cert is null?:', fail.certificate === null);

  // 3. Offline sync test for INST-TS-05
  const app2 = await post('/api/applications', { instrumentId: 'INST-TS-05' });
  const asg2 = await post('/api/schedule/assign', { applicationId: app2.application.id, officerId: 'LMO-101' });
  const sync = await post('/api/offline/sync', {
    verifications: [{
      assignmentId: asg2.assignment.id,
      instrumentId: 'INST-TS-05',
      result: 'PASS',
      standardWeight: '10 Ton',
      indicatedValue: '10.001 Ton',
      observations: 'Crane scale calibrated within tolerance'
    }]
  }, token);
  console.log('Offline sync count:', sync.syncedCount, 'Item status:', sync.results[0]?.status, 'Cert generated?:', !!sync.results[0]?.certificate);
}

testFailAndOffline().catch(console.error);
