export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Metro Verify — Digital Legal Metrology Platform API',
    version: '1.0.0',
    description: `
**Smart India Hackathon 2026 (SIH26036)**

Metro Verify API provides an end-to-end statutory verification workflow:
- **Owner Request**: Register instruments, submit single/bulk verification requests, view Digital Passport and Form VI certificates.
- **Admin / Smart Allocation**: Multi-criteria officer allocation engine and atomic assignment via MySQL stored procedure \`sp_CreateAssignment\`.
- **LMO / GATC Field Officer**: Live DB-driven dashboard, real camera capture, GPS geotagging, offline storage sync, and atomic verification completion via \`sp_CompleteVerification\`.
- **Statutory Certificates**: Form VI PDF generation with live embedded QR verification code.
    `,
    contact: {
      name: 'Department of Legal Metrology & SIH Team',
      email: 'support@metroverify.gov.in',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token generated from /api/auth/login or /api/auth/officer/login',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Detailed error message' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['owner', 'officer', 'LMO', 'GATC', 'admin'], example: 'officer' },
          identifier: { type: 'string', example: 'LMO-101' },
          password: { type: 'string', example: 'password123' },
        },
      },
      OfficerLoginRequest: {
        type: 'object',
        properties: {
          identifier: { type: 'string', example: 'LMO-101' },
          badgeNumber: { type: 'string', example: 'LM-HYD-042' },
          email: { type: 'string', example: 'ramanathan.v@lm.tn.gov.in' },
          password: { type: 'string', example: 'password123' },
        },
      },
      RegisterInstrumentRequest: {
        type: 'object',
        required: ['model', 'category'],
        properties: {
          serialNumber: { type: 'string', example: 'SN-2026-WB-1001' },
          model: { type: 'string', example: 'Essae SuperWeigh-80T' },
          manufacturer: { type: 'string', example: 'Essae-Teraoka Pvt Ltd' },
          category: { type: 'string', example: 'Electronic Weighbridge' },
          subCategory: { type: 'string', example: 'Pitless Static Road Vehicle Scale' },
          capacity: { type: 'string', example: '80 Metric Ton' },
          accuracyClass: { type: 'string', example: 'Class III' },
          ownerId: { type: 'string', example: 'OWN-101' },
          location: { type: 'string', example: 'George Town Wholesale Market, Chennai' },
          district: { type: 'string', example: 'Chennai North' },
          state: { type: 'string', example: 'Tamil Nadu' },
        },
      },
      CreateApplicationRequest: {
        type: 'object',
        required: ['instrumentId'],
        properties: {
          instrumentId: { type: 'string', example: 'INST-TS-01' },
          ownerId: { type: 'string', example: 'OWN-101' },
          category: { type: 'string', example: 'Electronic Weighbridge' },
          capacity: { type: 'string', example: '80 Metric Ton' },
          accuracyClass: { type: 'string', example: 'Class III' },
          preferredDate: { type: 'string', example: '2026-09-12' },
          preferredTimeSlot: { type: 'string', example: '10:00 AM - 01:00 PM' },
          location: { type: 'string', example: 'Gate #2, George Town, Chennai' },
          remarks: { type: 'string', example: 'Routine statutory verification under Rule 14' },
        },
      },
      CreateBulkRequest: {
        type: 'object',
        required: ['instrumentCount'],
        properties: {
          ownerId: { type: 'string', example: 'OWN-101' },
          facilityName: { type: 'string', example: 'George Town Grain Logistics Terminal' },
          category: { type: 'string', example: 'Commercial Weighing Scales' },
          instrumentCount: { type: 'integer', example: 50 },
          preferredDate: { type: 'string', example: '2026-09-20' },
          remarks: { type: 'string', example: 'Bulk fleet inspection for commercial grain trading' },
        },
      },
      AllocateRequest: {
        type: 'object',
        properties: {
          instrumentId: { type: 'string', example: 'INST-TS-01' },
          category: { type: 'string', example: 'Electronic Weighbridge' },
          district: { type: 'string', example: 'Chennai North' },
          state: { type: 'string', example: 'Tamil Nadu' },
          requestedDate: { type: 'string', example: '2026-09-12' },
          lat: { type: 'number', example: 17.4485 },
          lng: { type: 'number', example: 78.487 },
          isBulk: { type: 'boolean', example: false },
          batchCount: { type: 'integer', example: 1 },
        },
      },
      AssignRequest: {
        type: 'object',
        required: ['applicationId', 'officerId'],
        properties: {
          applicationId: { type: 'string', example: 'APP-2026-1045' },
          officerId: { type: 'string', example: 'LMO-101' },
          batchId: { type: 'string', nullable: true, example: null },
        },
      },
      SplitBatchRequest: {
        type: 'object',
        required: ['officerAllocations'],
        properties: {
          officerAllocations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                officerId: { type: 'string', example: 'LMO-101' },
                count: { type: 'integer', example: 25 },
                batchName: { type: 'string', example: 'Batch A - Terminal North' },
              },
            },
          },
        },
      },
      CompleteVerificationRequest: {
        type: 'object',
        properties: {
          standardWeight: { type: 'string', example: '50.00 kg' },
          indicatedValue: { type: 'string', example: '50.00 kg' },
          errorMargin: { type: 'string', example: '0.00 g' },
          toleranceLimit: { type: 'string', example: '± 50 g' },
          observations: { type: 'string', example: 'All test corners checked. Sealing wire intact.' },
          photoReference: { type: 'string', example: 'file:///data/evidence/photo_001.jpg' },
          latitude: { type: 'number', example: 17.4485 },
          longitude: { type: 'number', example: 78.487 },
          locationTimestamp: { type: 'string', example: '2026-09-05T14:30:00.000Z' },
        },
      },
      OfflineSyncRequest: {
        type: 'object',
        required: ['verifications'],
        properties: {
          verifications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                assignmentId: { type: 'string', example: 'ASG-102938' },
                instrumentId: { type: 'string', example: 'INST-TS-02' },
                result: { type: 'string', enum: ['PASS', 'FAIL'], example: 'PASS' },
                standardWeight: { type: 'string', example: '50.00 kg' },
                indicatedValue: { type: 'string', example: '50.01 kg' },
                photoReference: { type: 'string', example: 'file:///local/photo.jpg' },
                latitude: { type: 'number', example: 17.4485 },
                longitude: { type: 'number', example: 78.487 },
                localId: { type: 'string', example: 'local-queue-001' },
              },
            },
          },
        },
      },
      ChatbotRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', example: 'When is my weighbridge INST-TS-01 due for re-verification?' },
          ownerId: { type: 'string', example: 'OWN-101' },
        },
      },
    },
  },
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user and return JWT token',
        description: 'Authenticates Owner, Officer (LMO/GATC), or Admin from database and issues signed JWT token.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Authentication successful with JWT token' },
          401: { description: 'Invalid credentials or user not found' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new user account (Owner or Officer)',
        description: 'Creates a new verified account in the database and returns a signed JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  role: { type: 'string', enum: ['owner', 'officer', 'gatc'], example: 'owner' },
                  name: { type: 'string', example: 'Rajesh Kumar' },
                  businessName: { type: 'string', example: 'Kumar Trading & Logistics' },
                  email: { type: 'string', example: 'rajesh.kumar@example.com' },
                  phone: { type: 'string', example: '+91 98765 43210' },
                  password: { type: 'string', example: 'password123' },
                  state: { type: 'string', example: 'Tamil Nadu' },
                  district: { type: 'string', example: 'Chennai' },
                  address: { type: 'string', example: 'George Town Commercial Yard, Chennai' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Account registered successfully with JWT token' },
          400: { description: 'Validation error or email already exists' },
        },
      },
    },
    '/api/auth/officer/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Dedicated Officer Login (LMO / GATC)',
        description: 'Authenticates officer by ID, Badge Number, or Email and returns JWT token.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OfficerLoginRequest' } } },
        },
        responses: {
          200: { description: 'Officer authenticated successfully' },
          401: { description: 'Invalid officer credentials' },
        },
      },
    },
    '/api/auth/officers': {
      get: {
        tags: ['Authentication'],
        summary: 'List active officers directory',
        responses: {
          200: { description: 'List of active officers with workload and jurisdiction' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Authenticated profile' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/applications': {
      get: {
        tags: ['Owner — Applications'],
        summary: 'List verification applications',
        parameters: [
          { name: 'ownerId', in: 'query', schema: { type: 'string' }, description: 'Filter by owner ID' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'includeWithdrawn', in: 'query', schema: { type: 'boolean' }, description: 'Set true to include withdrawn' },
        ],
        responses: {
          200: { description: 'List of verification applications' },
        },
      },
      post: {
        tags: ['Owner — Applications'],
        summary: 'Submit a new statutory verification request',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateApplicationRequest' } } },
        },
        responses: {
          201: { description: 'Application created successfully' },
          404: { description: 'Instrument not found' },
        },
      },
    },
    '/api/applications/{id}': {
      get: {
        tags: ['Owner — Applications'],
        summary: 'Get single application details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Application details' },
          404: { description: 'Application not found' },
        },
      },
    },
    '/api/applications/{id}/withdraw': {
      post: {
        tags: ['Owner — Applications'],
        summary: 'Withdraw an active verification request',
        description: 'Immediately marks application as WITHDRAWN and purges from active schedules.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { reason: { type: 'string', example: 'Equipment under maintenance' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Application withdrawn successfully' },
          404: { description: 'Application not found' },
        },
      },
    },
    '/api/bulk-requests': {
      get: {
        tags: ['Owner — Bulk Requests'],
        summary: 'List bulk verification requests',
        parameters: [
          { name: 'ownerId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of bulk verification requests' },
        },
      },
      post: {
        tags: ['Owner — Bulk Requests'],
        summary: 'Submit a bulk verification request',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBulkRequest' } } },
        },
        responses: {
          201: { description: 'Bulk request submitted successfully' },
        },
      },
    },
    '/api/bulk-requests/{id}': {
      get: {
        tags: ['Owner — Bulk Requests'],
        summary: 'Get bulk request details and batches',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Bulk request with batches and progress' },
          404: { description: 'Bulk request not found' },
        },
      },
    },
    '/api/bulk-requests/{id}/split': {
      post: {
        tags: ['Admin — Batch Splitting'],
        summary: 'Split bulk request into batches via stored procedure sp_SplitBulkBatch',
        description: 'Atomically creates Batch & Assignment records and increments officer workloads in MySQL.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SplitBatchRequest' } } },
        },
        responses: {
          200: { description: 'Bulk request successfully split into batches' },
          400: { description: 'Invalid allocation parameters' },
        },
      },
    },
    '/api/instruments': {
      get: {
        tags: ['Owner — Instruments'],
        summary: 'List registered instruments',
        parameters: [
          { name: 'ownerId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'district', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of instruments' },
        },
      },
      post: {
        tags: ['Owner — Instruments'],
        summary: 'Register a new instrument',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInstrumentRequest' } } },
        },
        responses: {
          201: { description: 'Instrument registered successfully' },
        },
      },
    },
    '/api/instruments/{id}': {
      get: {
        tags: ['Owner — Instruments'],
        summary: 'Get single instrument details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Instrument details' },
          404: { description: 'Instrument not found' },
        },
      },
    },
    '/api/instruments/{id}/passport': {
      get: {
        tags: ['Owner — Digital Passport'],
        summary: 'Get dynamic Digital Passport timeline',
        description: 'Returns complete permanent audit trail (Registration, Request, Scheduling, Field Verification, Form VI Certificate, Next Due).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Digital Passport timeline and active certificate' },
          404: { description: 'Instrument not found' },
        },
      },
    },
    '/api/certificates/{id}': {
      get: {
        tags: ['Certificates'],
        summary: 'Get certificate details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Certificate details' },
          404: { description: 'Certificate not found' },
        },
      },
    },
    '/api/certificates/{id}/pdf': {
      get: {
        tags: ['Certificates'],
        summary: 'Download official Form VI Verification Certificate PDF',
        description: 'Generates and streams a binary PDF with embedded live statutory QR code and cryptographic ledger metadata.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Binary PDF document',
            content: {
              'application/pdf': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          404: { description: 'Certificate not found' },
        },
      },
    },
    '/api/schedule/allocate': {
      post: {
        tags: ['Admin — Smart Allocation'],
        summary: 'Compute officer suitability score and recommendation',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AllocateRequest' } } },
        },
        responses: {
          200: { description: 'Ranked officer allocation recommendations' },
        },
      },
    },
    '/api/schedule/assign': {
      post: {
        tags: ['Admin — Smart Allocation'],
        summary: 'Confirm assignment via stored procedure sp_CreateAssignment',
        description: 'Atomically creates Assignment record, sets Application status to SCHEDULED, and increments officer workload.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssignRequest' } } },
        },
        responses: {
          200: { description: 'Assignment created successfully' },
          400: { description: 'Missing required parameters' },
        },
      },
    },
    '/api/schedule/allocate-balanced': {
      post: {
        tags: ['Admin — Smart Allocation'],
        summary: 'Smart Auto-Allocate All: Distribute requests evenly across all 5 officers',
        description: 'Distributes all pending submitted verification requests evenly in a round-robin / lowest-workload sequence across all 5 active officers (LMO-101, LMO-102, LMO-103, LMO-104, GATC-01) using stored procedure sp_CreateAssignment.',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  applicationIds: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['APP-2026-1045'],
                    description: 'Optional array of application IDs to allocate. If omitted, allocates all pending submitted applications.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Batch balanced allocation completed across all 5 officers' },
        },
      },
    },
    '/api/lmo/dashboard': {
      get: {
        tags: ['LMO / GATC Officer'],
        summary: 'Get live officer dashboard metrics and assignments',
        description: 'Returns live counts (Assigned Today, Completed, Remaining, Offline Pending, Reinspection Required, Overdue) strictly for the authenticated officer.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Live dashboard metrics and assigned instruments' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/lmo/assignments': {
      get: {
        tags: ['LMO / GATC Officer'],
        summary: 'List assignments assigned ONLY to authenticated officer',
        description: 'Strictly filtered by authenticated JWT identity. An officer cannot view assignments of other officers.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of assigned tasks' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/lmo/batches/{id}': {
      get: {
        tags: ['LMO / GATC Officer'],
        summary: 'Get batch details assigned to authenticated officer',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Batch details' },
          404: { description: 'Batch not found or not assigned to officer' },
        },
      },
    },
    '/api/lmo/instruments/{id}': {
      get: {
        tags: ['LMO / GATC Officer'],
        summary: 'Get assigned instrument details for physical verification',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Assigned instrument verification form data' },
          404: { description: 'Instrument not found or not assigned to officer' },
        },
      },
    },
    '/api/inspections/{id}/start': {
      post: {
        tags: ['LMO — Field Verification'],
        summary: 'Start or resume an inspection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Inspection in progress' },
        },
      },
    },
    '/api/inspections/{id}/results': {
      post: {
        tags: ['LMO — Field Verification'],
        summary: 'Record measurement readings and observations',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  standardWeight: { type: 'string', example: '50 kg' },
                  indicatedValue: { type: 'string', example: '50 kg' },
                  errorMargin: { type: 'string', example: '0 g' },
                  toleranceLimit: { type: 'string', example: '± 50 g' },
                  observations: { type: 'string', example: 'Corner tests acceptable.' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Results saved' },
        },
      },
    },
    '/api/inspections/{id}/photos': {
      post: {
        tags: ['LMO — Field Verification'],
        summary: 'Attach real camera photo evidence',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { photoReference: { type: 'string', example: 'file:///data/photo_123.jpg' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Photo attached' },
        },
      },
    },
    '/api/inspections/{id}/location': {
      post: {
        tags: ['LMO — Field Verification'],
        summary: 'Attach real GPS and timestamp evidence',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['latitude', 'longitude'],
                properties: {
                  latitude: { type: 'number', example: 17.4485 },
                  longitude: { type: 'number', example: 78.487 },
                  locationTimestamp: { type: 'string', example: '2026-09-05T14:30:00.000Z' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Location attached' },
        },
      },
    },
    '/api/inspections/{id}/complete': {
      post: {
        tags: ['LMO — Field Verification'],
        summary: 'Complete verification (PASS) via stored procedure sp_CompleteVerification',
        description: 'Sets inspection COMPLETED, instrument VERIFIED (+1 yr validity), generates Form VI Certificate with SHA-256 hash, and decrements officer workload.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CompleteVerificationRequest' } } },
        },
        responses: {
          200: { description: 'Verification completed and certificate issued' },
        },
      },
    },
    '/api/inspections/{id}/failure': {
      post: {
        tags: ['LMO — Field Verification'],
        summary: 'Record verification failure (FAIL) via stored procedure sp_CompleteVerification',
        description: 'Sets inspection FAILED, instrument REINSPECTION_REQUIRED, decrements officer workload, and skips certificate generation.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CompleteVerificationRequest' } } },
        },
        responses: {
          200: { description: 'Verification recorded as FAILED' },
        },
      },
    },
    '/api/inspections/{id}/reinspection': {
      post: {
        tags: ['LMO — Field Verification'],
        summary: 'Schedule re-inspection task for failed equipment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Reinspection scheduled' },
        },
      },
    },
    '/api/offline/status': {
      get: {
        tags: ['Offline Queue & Sync'],
        summary: 'Check server sync connectivity and pending count',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Connectivity status' },
        },
      },
    },
    '/api/offline/sync': {
      post: {
        tags: ['Offline Queue & Sync'],
        summary: 'Synchronize offline queued verifications in batch',
        description: 'Processes queued verifications atomically via stored procedure sp_CompleteVerification, issuing certificates for PASS records and updating owner status.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OfflineSyncRequest' } } },
        },
        responses: {
          200: { description: 'Batch synchronization completed' },
        },
      },
    },
    '/api/compliance/{ownerId}/score': {
      get: {
        tags: ['Compliance & Audit'],
        summary: 'Calculate explainable compliance score via sp_CalculateComplianceScore',
        parameters: [{ name: 'ownerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Calculated compliance score and itemized deductions' },
        },
      },
    },
    '/api/chatbot/query': {
      post: {
        tags: ['AI Assistant'],
        summary: 'Query AI Legal Metrology Assistant (Groq LLaMA 3.3 / Google Gemini)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatbotRequest' } } },
        },
        responses: {
          200: { description: 'AI Assistant response' },
        },
      },
    },
  },
};
