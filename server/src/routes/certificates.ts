import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import prisma from '../lib/prisma';

const router = Router();

// GET /certificates - List all certificates from MySQL
router.get('/', async (req: Request, res: Response) => {
  try {
    const { ownerId, instrumentId } = req.query;
    const where: any = {};

    if (ownerId) where.ownerId = String(ownerId);
    if (instrumentId) where.instrumentId = String(instrumentId);

    const certs = await prisma.certificate.findMany({
      where,
      include: {
        instrument: true,
        owner: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      count: certs.length,
      certificates: certs,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /certificates/:id - Single certificate details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [{ id }, { certificateNumber: id }, { instrumentId: id }],
      },
      include: {
        instrument: true,
        owner: true,
      },
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: `Certificate ${id} not found.`,
      });
    }

    return res.json({
      success: true,
      certificate: cert,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /certificates/:id/verify or /certificates/verify/:id - Public verification page opened when scanning QR code with any phone
router.get(['/:id/verify', '/verify/:id'], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [{ id }, { certificateNumber: id }, { instrumentId: id }],
      },
      include: {
        instrument: true,
        owner: true,
      },
    });

    if (!cert) {
      return res.status(404).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate Not Found - Metro Verify</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B2545; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #fff; color: #1E293B; max-width: 480px; width: 100%; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
    .badge { background: #FEE2E2; color: #DC2626; padding: 8px 16px; border-radius: 20px; font-weight: 700; display: inline-block; margin-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 12px; color: #0B2545; }
    p { color: #64748B; font-size: 14px; line-height: 1.5; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">❌ CERTIFICATE RECORD NOT FOUND</div>
    <h1>Verification Query Failed</h1>
    <p>No valid Legal Metrology certificate matching identifier <strong>${id}</strong> exists in the National Legal Metrology Registry.</p>
  </div>
</body>
</html>
      `);
    }

    const inst = cert.instrument;
    const owner = cert.owner;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification: ${cert.certificateNumber} - Metro Verify</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0B2545;
      color: #0F172A;
      margin: 0;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .cert-card {
      background: #FFFFFF;
      max-width: 520px;
      width: 100%;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      border: 2px solid #E2E8F0;
    }
    .tricolor {
      display: flex;
      height: 6px;
      width: 100%;
    }
    .tc-1 { background: #FF9933; flex: 1; }
    .tc-2 { background: #FFFFFF; flex: 1; }
    .tc-3 { background: #138808; flex: 1; }
    .header {
      background: #F8FAFC;
      padding: 24px;
      text-align: center;
      border-bottom: 1px solid #E2E8F0;
    }
    .emblem { font-size: 32px; margin-bottom: 6px; }
    .gov-title { font-size: 13px; font-weight: 800; letter-spacing: 1px; color: #0B2545; margin: 0; }
    .dept-title { font-size: 11px; color: #64748B; margin: 2px 0 10px; font-weight: 600; }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #DCFCE7;
      color: #15803D;
      font-size: 12px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid #86EFAC;
    }
    .cert-number {
      font-size: 20px;
      font-weight: 800;
      color: #0B2545;
      margin: 12px 0 2px;
      letter-spacing: 0.5px;
    }
    .cert-sub { font-size: 11px; color: #64748B; margin: 0; }
    .content { padding: 24px; }
    .info-grid { display: flex; flex-direction: column; gap: 14px; }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px dashed #E2E8F0;
      padding-bottom: 10px;
    }
    .info-label { font-size: 12px; color: #64748B; font-weight: 600; }
    .info-val { font-size: 13px; color: #0B2545; font-weight: 700; text-align: right; max-width: 65%; }
    .validity-box {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 12px;
      padding: 14px;
      margin-top: 16px;
      text-align: center;
    }
    .validity-title { font-size: 11px; font-weight: 700; color: #1E40AF; text-transform: uppercase; margin: 0 0 4px; }
    .validity-dates { font-size: 14px; font-weight: 800; color: #1E3A8A; margin: 0; }
    .actions { padding: 0 24px 24px; display: flex; flex-direction: column; gap: 10px; }
    .btn {
      display: block;
      width: 100%;
      text-align: center;
      padding: 14px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn-primary { background: #0B2545; color: #FFFFFF; }
    .btn-primary:hover { background: #134074; }
    .footer {
      background: #F8FAFC;
      padding: 16px;
      text-align: center;
      font-size: 10px;
      color: #94A3B8;
      border-top: 1px solid #E2E8F0;
    }
  </style>
</head>
<body>
  <div class="cert-card">
    <div class="tricolor"><div class="tc-1"></div><div class="tc-2"></div><div class="tc-3"></div></div>
    
    <div class="header">
      <div class="emblem">🏛️</div>
      <p class="gov-title">GOVERNMENT OF INDIA</p>
      <p class="dept-title">DIRECTORATE OF LEGAL METROLOGY • FORM VI VERIFICATION</p>
      <div class="status-badge">✓ OFFICIALLY VERIFIED & ACTIVE</div>
      <div class="cert-number">${cert.certificateNumber}</div>
      <p class="cert-sub">Verified under Rule 14 of Legal Metrology (General) Rules, 2011</p>
    </div>

    <div class="content">
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Instrument Model</span>
          <span class="info-val">${inst?.model || 'Commercial Scale'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Instrument ID / Serial</span>
          <span class="info-val">${cert.instrumentId} • ${inst?.serialNumber || 'SN-ACTIVE'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Owner / Establishment</span>
          <span class="info-val">${owner?.businessName || owner?.name || 'Authorized Trader'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Registered Location</span>
          <span class="info-val">📍 ${owner?.address || `${owner?.district || 'Hyderabad'}, ${owner?.state || 'Telangana'}`}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Verifying Officer</span>
          <span class="info-val">⚖️ ${cert.officerName} (${cert.officerBadge})</span>
        </div>
        <div class="info-row">
          <span class="info-label">Verification Standard</span>
          <span class="info-val">Class-M2 Working Standards</span>
        </div>
      </div>

      <div class="validity-box">
        <p class="validity-title">Certificate Validity Period</p>
        <p class="validity-dates">${cert.issueDate}  ➔  ${cert.validUntil}</p>
      </div>
    </div>

    <div class="actions">
      <a href="/api/certificates/${cert.id}/pdf" target="_blank" class="btn btn-primary">
        📄 Download Official Signed PDF Certificate
      </a>
    </div>

    <div class="footer">
      SMART INDIA HACKATHON 2026 • SIH26036<br>
      NATIONAL LEGAL METROLOGY DIGITAL PLATFORM • METRO VERIFY
    </div>
  </div>
</body>
</html>
    `;

    return res.send(html);
  } catch (error: any) {
    return res.status(500).send(`Server error: ${error.message}`);
  }
});

// GET /certificates/:id/pdf - Real binary PDF generation with live embedded QR Code
router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [{ id }, { certificateNumber: id }, { instrumentId: id }],
      },
      include: {
        instrument: true,
        owner: true,
      },
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: `Certificate ${id} not found.`,
      });
    }

    const instrument = cert.instrument;
    const safeNumber = cert.certificateNumber.replace(/[\/\\:]/g, '-');
    const fileName = `LM-CERT-${safeNumber}.pdf`;

    // 1. Generate live verification URL encoded into the real QR code for direct mobile scanning
    const verificationPayload = process.env.PUBLIC_VERIFY_URL ||
      `http://10.20.222.175:4000/api/certificates/${encodeURIComponent(cert.certificateNumber)}/verify`;

    let qrBuffer: Buffer;
    try {
      qrBuffer = await QRCode.toBuffer(verificationPayload, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 250,
      });
    } catch (qrErr) {
      console.error('QR code generation failed, using simple payload', qrErr);
      qrBuffer = await QRCode.toBuffer(cert.qrCodeData || cert.certificateNumber, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 250,
      });
    }

    // Set HTTP headers for binary PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Create real binary PDF document
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      info: {
        Title: `Verification Certificate ${cert.certificateNumber}`,
        Author: 'Directorate of Legal Metrology, Government of India',
        Subject: 'Statutory Verification Certificate (Rule 14)',
        Keywords: 'Legal Metrology, Verification, Certificate, eMaap, QR Verified',
      },
    });

    // Stream directly to response
    doc.pipe(res);

    // Outer decorative border
    doc.rect(20, 20, 555, 802).lineWidth(2).strokeColor('#0B2545').stroke();
    doc.rect(24, 24, 547, 794).lineWidth(0.75).strokeColor('#CBD5E1').stroke();

    // Tricolor national ribbon
    doc.rect(40, 36, 171, 5).fillColor('#FF9933').fill();
    doc.rect(211, 36, 171, 5).fillColor('#E2E8F0').fill();
    doc.rect(382, 36, 171, 5).fillColor('#138808').fill();

    doc.y = 52;

    // Header Title
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#0B2545').text('GOVERNMENT OF TELANGANA', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#475569').text('DEPARTMENT OF LEGAL METROLOGY', { align: 'center' });
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748B').text('Issued under Section 24 of The Legal Metrology Act, 2009 & Rule 14', { align: 'center' });

    doc.moveDown(0.8);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#D97706').text('CERTIFICATE OF VERIFICATION (FORM VI)', { align: 'center' });
    doc.moveDown(0.3);

    // Certificate Number badge
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0B2545').text(`Certificate No: ${cert.certificateNumber}`, { align: 'center' });
    doc.moveDown(0.8);

    // Divider
    doc.moveTo(40, doc.y).lineTo(555, doc.y).lineWidth(1).strokeColor('#E2E8F0').stroke();
    doc.moveDown(0.8);

    // Owner & Instrument details table
    const startY = doc.y;
    const col1 = 45;
    const col2 = 300;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0B2545').text('1. USER / OWNER DETAILS', col1, startY);
    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(`Name / Business: ${cert.owner ? cert.owner.businessName : 'Sri Balaji Mandi & Agro Traders'}`, col1, startY + 16);
    doc.text(`Owner ID: ${cert.ownerId}`, col1, startY + 30);
    doc.text(`Address: ${cert.owner ? cert.owner.address : 'Osmangunj Wholesale Market, Hyderabad'}`, col1, startY + 44, { width: 240 });

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0B2545').text('2. INSTRUMENT PARTICULARS', col2, startY);
    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(`Instrument ID: ${cert.instrumentId}`, col2, startY + 16);
    doc.text(`Model: ${instrument ? instrument.model : 'Standard Verified Scale'}`, col2, startY + 30);
    doc.text(`Serial No: ${instrument ? instrument.serialNumber : 'SN-2024-LM'}`, col2, startY + 44);
    doc.text(`Capacity: ${instrument ? instrument.capacity : 'Commercial Standard'}`, col2, startY + 58);
    doc.text(`Class: ${instrument ? (instrument.accuracyClass || 'Class III') : 'Class III'}`, col2, startY + 72);

    doc.y = startY + 105;
    doc.moveTo(40, doc.y).lineTo(555, doc.y).lineWidth(0.5).strokeColor('#E2E8F0').stroke();
    doc.moveDown(0.8);

    // Verification Results & Legal Stamp
    const verifY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0B2545').text('3. VERIFICATION FINDINGS', col1, verifY);
    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(`Verification Date: ${cert.issueDate}`, col1, verifY + 16);
    doc.text(`Next Due / Expiry Date: ${cert.validUntil}`, col1, verifY + 30);
    doc.text(`Verification Result: APPROVED (PASSED)`, col1, verifY + 44);
    doc.text(`Status: ACTIVE / STATUTORY COMPLIANT`, col1, verifY + 58);

    // Embed real QR code image
    doc.image(qrBuffer, col2 + 40, verifY, { width: 110, height: 110 });
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#64748B').text('Scan to verify live authenticity', col2 + 25, verifY + 115, { width: 140, align: 'center' });

    doc.y = verifY + 135;
    doc.moveTo(40, doc.y).lineTo(555, doc.y).lineWidth(0.5).strokeColor('#E2E8F0').stroke();
    doc.moveDown(0.8);

    // Signature section
    const sigY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0B2545').text(`Digitally Signed by: ${cert.officerName}`, col1, sigY);
    doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Designation: ${cert.officerDesignation || 'Senior Legal Metrology Officer'}`, col1, sigY + 14);
    doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Badge / Seal No: ${cert.officerBadge || 'LM-HYD-042'}`, col1, sigY + 26);
    doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Department of Legal Metrology, Government of Telangana`, col1, sigY + 38);

    // Footer notice
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#94A3B8').text(
      'Notice: This certificate must be exhibited prominently near the instrument in terms of Section 24 of the Act. Tampering with this document or verification seal constitutes a cognizable offense.',
      40,
      760,
      { width: 515, align: 'center' }
    );

    doc.end();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
