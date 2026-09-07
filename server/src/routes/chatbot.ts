import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';
import { mockOwners, mockInstruments, mockCertificates } from '../data/mockData';

const router = Router();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// POST /chatbot/query - Real Gemini & Groq API Integration with Live Prisma Database Records
router.post('/query', async (req: Request, res: Response) => {
  const { ownerId = 'OWN-101', message } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      success: false,
      reply: 'Please provide a valid question or inquiry regarding legal metrology verification.'
    });
  }

  // 1. Fetch real owner data from MySQL via Prisma
  let owner: any = await prisma.owner.findUnique({
    where: { id: ownerId }
  });

  if (!owner) {
    owner = await prisma.owner.findFirst({
      where: {
        OR: [
          { id: ownerId },
          { email: ownerId },
          { phone: ownerId },
          { name: ownerId },
          { businessName: ownerId }
        ]
      }
    });
  }

  if (!owner) {
    owner = mockOwners.find(o => o.id === ownerId) || mockOwners[0];
  }

  // 2. Fetch real instruments from MySQL
  let ownerInstruments = await prisma.instrument.findMany({
    where: { ownerId: owner.id },
    include: { certificates: true }
  });

  if (ownerInstruments.length === 0 && owner.id === 'OWN-101') {
    ownerInstruments = mockInstruments.filter(i => i.ownerId === 'OWN-101') as any;
  }

  // 3. Fetch real certificates from MySQL
  let ownerCerts = await prisma.certificate.findMany({
    where: { ownerId: owner.id },
    include: { instrument: true }
  });

  if (ownerCerts.length === 0 && owner.id === 'OWN-101') {
    ownerCerts = mockCertificates.filter(c => c.ownerId === 'OWN-101') as any;
  }

  // 4. Fetch real applications and assigned officers from MySQL
  const ownerApplications = await prisma.application.findMany({
    where: { ownerId: owner.id },
    include: {
      assignments: {
        include: { assignedOfficer: true }
      },
      instrument: true
    },
    orderBy: { submittedAt: 'desc' }
  });

  const instrumentsSummary = ownerInstruments.map(i => 
    `- ${i.model} (${i.category}): ID ${i.id}, Serial: ${i.serialNumber || 'N/A'}, Status: ${i.status}, Expiry: ${i.expiryDate || 'Statutory Stamping Active'}, Location: ${i.location}`
  ).join('\n');

  const certsSummary = ownerCerts.map(c => 
    `- Cert #${c.certificateNumber} for instrument ${c.instrumentId}, Status: ${c.status}, Valid until: ${c.validUntil}, Issued by Officer: ${c.officerName}`
  ).join('\n');

  const appsSummary = ownerApplications.map(a => {
    const assignedOfficer = a.assignments && a.assignments[0]?.assignedOfficer;
    const officerInfo = assignedOfficer ? `Assigned to ${assignedOfficer.name} (${assignedOfficer.badgeNumber})` : 'Awaiting officer allocation';
    return `- Request #${a.id}: Instrument: ${a.instrument?.model || a.instrumentId}, Status: ${a.status}, Preferred Date: ${a.preferredDate}, ${officerInfo}`;
  }).join('\n');

  const contextData = `
Owner Name: ${owner.name}
Business / Establishment: "${owner.businessName}"
District / State: ${owner.district}, ${owner.state}
Compliance Health Score: ${owner.complianceScore}/100

Registered Equipment / Instruments:
${instrumentsSummary || 'No instruments registered yet.'}

Verification Applications / Inspection Requests:
${appsSummary || 'No active verification applications.'}

Issued Verification Certificates:
${certsSummary || 'No digital certificates issued yet.'}
`;

  // 5. Check for Groq or Gemini API Keys
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  const isGroqConfigured = Boolean(groqApiKey && groqApiKey !== 'your_groq_key_here' && groqApiKey.startsWith('gsk_'));
  const isGeminiConfigured = Boolean(geminiApiKey && geminiApiKey !== 'your_key_here' && geminiApiKey.length > 15);

  const systemInstruction = `You are "Metro Assistant", the official AI guide for India's Legal Metrology verification and lifecycle management platform (Metro Verify / SIH26036).
You are assisting ${owner.name} of "${owner.businessName}".
Current Platform Records:
${contextData}

Rules:
1. Always address the user politely by their real name (${owner.name}).
2. Answer accurately using their specific instruments, applications, assigned officers, and certificates from the records above.
3. If they ask about the status of their scale or request, cite their actual instrument and application status (e.g., if an officer has been assigned or certificate issued).
4. Keep your reply concise (2 to 4 sentences maximum) for mobile display.
5. Maintain a polite, authoritative government-service tone.`;

  // 3A. Try Groq API (High Speed Cloud Inference)
  if (isGroqConfigured) {
    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: message }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (groqRes.ok) {
        const data = await groqRes.json() as any;
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          return res.json({
            success: true,
            source: 'groq-api',
            reply: text.trim(),
            poweredBy: 'Groq Cloud AI (Llama 3.3 70B)'
          });
        }
      } else {
        const errText = await groqRes.text();
        console.warn('Groq API returned non-200:', errText);
      }
    } catch (groqErr: any) {
      console.warn('Groq API call failed, attempting Gemini fallback:', groqErr?.message || groqErr);
    }
  }

  // 3B. Try Google Gemini API
  if (isGeminiConfigured) {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction
      });

      const result = await model.generateContent(message);
      const responseText = result.response.text();

      if (responseText) {
        return res.json({
          success: true,
          source: 'gemini-api',
          reply: responseText.trim(),
          poweredBy: 'Google Gemini 1.5 Flash'
        });
      }
    } catch (geminiErr: any) {
      console.warn('Gemini API call failed:', geminiErr?.message || geminiErr);
    }
  }

  // 4. If neither key is configured or both APIs had network issues:
  const fallbackReply = generateDomainFallback(message, owner, ownerInstruments, ownerCerts, ownerApplications);
  return res.json({
    success: true,
    source: isGroqConfigured || isGeminiConfigured ? 'fallback_network' : 'domain-engine',
    reply: fallbackReply,
    poweredBy: 'Legal Metrology Intelligent Engine',
    note: !isGroqConfigured && !isGeminiConfigured
      ? 'To activate live cloud AI inference, add GROQ_API_KEY (from https://console.groq.com/keys) or GEMINI_API_KEY (from https://aistudio.google.com/app/apikey) in server/.env.'
      : undefined
  });
});

/**
 * Intelligent deterministic domain fallback matching user queries against their live MySQL records
 */
function generateDomainFallback(
  query: string,
  owner: any,
  instruments: any[],
  certificates: any[],
  applications: any[] = []
): string {
  const q = query.toLowerCase();

  if (q.includes('status') || q.includes('weighing scale') || q.includes('scale') || q.includes('request') || q.includes('application')) {
    if (applications.length > 0) {
      const latestApp = applications[0];
      const assignedOfficer = latestApp.assignments && latestApp.assignments[0]?.assignedOfficer;
      const officerStr = assignedOfficer ? `assigned to officer ${assignedOfficer.name} (${assignedOfficer.badgeNumber})` : 'awaiting officer slot allocation';
      const instName = latestApp.instrument?.model || 'your weighing equipment';
      return `Greetings ${owner.name}! Your verification request #${latestApp.id} for "${instName}" is currently marked "${latestApp.status}". It is ${officerStr} for preferred date ${latestApp.preferredDate}.`;
    }
    if (instruments.length > 0) {
      const inst = instruments[0];
      return `Greetings ${owner.name}! Your registered equipment "${inst.model}" (${inst.id}) has status "${inst.status}". Its verification validity is ${inst.expiryDate || 'Active'}.`;
    }
    return `Greetings ${owner.name}! You currently have no active verification applications. You can submit one easily using the "New Request" tab in the bottom bar.`;
  }

  if (q.includes('expire') || q.includes('valid') || q.includes('due')) {
    const expiring = instruments.find(i => i.status === 'Expiring Soon' || i.status === 'Expired');
    if (expiring) {
      return `Your ${expiring.model} (${expiring.id}) is due on ${expiring.expiryDate} (${expiring.status.toLowerCase()}). Please submit a reverification request from the "New Request" tab to avoid compliance penalties.`;
    }
    if (instruments.length > 0) {
      return `Your instruments are in regular standing. The renewal date on file is ${instruments[0]?.expiryDate || 'Active'} for your ${instruments[0]?.model || 'scale'}.`;
    }
    return `You have no expiring equipment on record. All verification records are fully compliant.`;
  }

  if (q.includes('bulk') || q.includes('multiple') || q.includes('re-verification')) {
    return `To request bulk reverification for ${owner.businessName}, open the "New Request" tab and switch the toggle to "Bulk Request". Metro Verify will automatically cluster your instruments into batches and distribute them among the highest-scored LMOs and GATC officers in your district.`;
  }

  if (q.includes('energy meter') || q.includes('electricity')) {
    const meter = instruments.find(i => i.category.toLowerCase().includes('energy'));
    if (meter) {
      return `Your 3-Phase HT Energy Meter (${meter.serialNumber}) at ${meter.location} expires on ${meter.expiryDate} and is currently marked "${meter.status}".`;
    }
    return `No energy meters are currently registered under ${owner.businessName}. You can add non-automatic weighing instruments or bulk equipment under "New Request".`;
  }

  if (q.includes('compliance') || q.includes('score') || q.includes('health')) {
    return `Greetings ${owner.name}. Your current Compliance Health Score for "${owner.businessName}" is ${owner.complianceScore}/100. Maintaining timely re-verification ensures statutory Tier-A compliance under the Legal Metrology Act.`;
  }

  if (q.includes('certificate') || q.includes('qr') || q.includes('download')) {
    if (certificates.length > 0) {
      return `You have ${certificates.length} digital certificate(s) issued. The latest certificate is #${certificates[0].certificateNumber}, valid until ${certificates[0].validUntil}. You can view or download the PDF under the "Certificates" tab.`;
    }
    return `You have 0 active digital certificates on file. Once an LMO officer conducts your physical verification and approves the test, your official Form VI Certificate will appear here with an instant verification QR code.`;
  }

  return `Greetings ${owner.name}! I am Metro Assistant for Metro Verify. For "${owner.businessName}", you have ${instruments.length} registered equipment item(s), ${applications.length} verification application(s), and a compliance score of ${owner.complianceScore}/100. How may I assist you today?`;
}

// POST /chatbot/voice-transcribe - Cloud Whisper Large v3 Turbo Speech-to-Text
router.post('/voice-transcribe', async (req: Request, res: Response) => {
  try {
    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (!groqApiKey) {
      return res.status(400).json({ success: false, error: 'Groq API key not configured on server' });
    }

    let buffer: Buffer | null = null;
    let mimeType = 'audio/webm';
    let fileName = 'audio.webm';

    if (req.body && req.body.audioBase64) {
      buffer = Buffer.from(req.body.audioBase64, 'base64');
      if (req.body.mimeType) {
        mimeType = req.body.mimeType;
        if (mimeType.includes('wav')) fileName = 'audio.wav';
        else if (mimeType.includes('mp4') || mimeType.includes('m4a')) fileName = 'audio.m4a';
        else if (mimeType.includes('ogg')) fileName = 'audio.ogg';
      }
    } else if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      buffer = req.body;
      const ctype = req.headers['content-type'] || 'audio/webm';
      mimeType = ctype;
      if (mimeType.includes('wav')) fileName = 'audio.wav';
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'No audio data received' });
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'en');
    // Priming prompt drastically increases Whisper hearing sensitivity and eliminates dropped speech
    formData.append('prompt', 'Metro Verify, Legal Metrology, weighing scale, weighbridge, certificate, LMO officer, inspection, verification status, stamp, Rule 14, fee, reverification, Tamil Nadu, capacity.');
    formData.append('temperature', '0.0');

    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: formData
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.warn('Groq Whisper API returned non-200:', errText);
      return res.status(500).json({ success: false, error: errText });
    }

    const data = await whisperRes.json() as any;
    let transcribedText = (data.text || '').trim();

    // Filter common Whisper silence/noise hallucinations
    const hallucinationPatterns = [
      /^thank you[\.!\s]*$/i,
      /^thank you so much[\.!\s]*$/i,
      /^thank you for watching[\.!\s]*$/i,
      /^thanks for watching[\.!\s]*$/i,
      /^subtitles by.*$/i,
      /^you$/i,
      /^\.$/,
      /^\.\.\.$/
    ];

    const isHallucination = hallucinationPatterns.some(pat => pat.test(transcribedText));
    if (isHallucination) {
      transcribedText = '';
    }

    return res.json({
      success: true,
      text: transcribedText,
      poweredBy: 'Groq Whisper Large v3 Turbo'
    });
  } catch (err: any) {
    console.error('Voice transcription error:', err);
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

export default router;
