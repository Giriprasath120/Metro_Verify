import { Router, Request, Response } from 'express';
import { mockInstruments } from '../data/mockData';

const router = Router();

// POST /verifications/:id/record - Record field verification outcome
router.post('/verifications/:id/record', (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    standardReading,
    indicatedReading,
    errorMargin,
    result,
    remarks,
    gpsCoords,
    photoAttached,
    isOfflineSync
  } = req.body;

  const instrument = mockInstruments.find(i => i.id === id);

  if (instrument) {
    instrument.status = result === 'PASS' ? 'Verified' : 'In Progress';
    instrument.readings = {
      standardWeight: standardReading || 'Calibrated Test Load',
      indicatedValue: indicatedReading || 'Indicated Value',
      errorMargin: errorMargin || '0.00%',
      toleranceLimit: 'Per Schedule VII MPE',
      result: result === 'FAIL' ? 'FAIL' : 'PASS'
    };
    
    instrument.passportTimeline.push({
      stage: 'Field-Verified',
      date: new Date().toISOString().split('T')[0],
      officerName: 'Field Officer (Recorded)',
      note: `Inspection ${result || 'PASS'}. Remarks: ${remarks || 'Standard stamped'}. GPS: ${gpsCoords || '17.4485° N, 78.4870° E'}.`,
      completed: true
    });
  }

  return res.json({
    success: true,
    verificationId: `VER-${Date.now().toString().slice(-6)}`,
    instrumentId: id,
    status: result === 'FAIL' ? 'REJECTED' : 'VERIFIED_COMPLIANT',
    isOfflineSync: Boolean(isOfflineSync),
    recordedTimestamp: new Date().toISOString(),
    certificateQueued: result !== 'FAIL',
    message: isOfflineSync 
      ? 'Offline verification record synced successfully with state metrology ledger.'
      : 'Field verification submitted and digitally logged.'
  });
});

export default router;
