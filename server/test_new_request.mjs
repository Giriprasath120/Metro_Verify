async function test() {
  console.log('Testing New Request submission to http://localhost:4000/api/applications ...');
  const res = await fetch('http://localhost:4000/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instrumentId: 'NEW',
      instrumentName: 'Essae Precision Bench Scale',
      serialNumber: 'SN-2026-7842',
      category: 'Non-Automatic Weighing Instrument',
      capacity: '50 kg',
      accuracyClass: 'Class III',
      ownerId: 'OWN-101',
      preferredDate: '2026-09-18',
      location: 'Bowenpally Agricultural Wholesale Yard'
    })
  });

  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  // Also query GET /api/instruments and GET /api/applications to verify DB persistence
  const instRes = await fetch('http://localhost:4000/api/instruments?ownerId=OWN-101');
  const instData = await instRes.json();
  console.log('\n[DB Verification] Total Instruments in DB for OWN-101:', instData.count);
  console.log('Instruments:', instData.instruments.map(i => ({ id: i.id, model: i.model, status: i.status })));

  const appRes = await fetch('http://localhost:4000/api/applications?ownerId=OWN-101');
  const appData = await appRes.json();
  console.log('\n[DB Verification] Total Applications in DB for OWN-101:', appData.count);
  console.log('Applications:', appData.applications.map(a => ({ id: a.id, instrumentId: a.instrumentId, status: a.status })));
}

test().catch(console.error);
