-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS sp_CreateAssignment;
DROP PROCEDURE IF EXISTS sp_CompleteVerification;
DROP PROCEDURE IF EXISTS sp_CalculateComplianceScore;
DROP PROCEDURE IF EXISTS sp_SplitBulkBatch;

DELIMITER $$

-- 1. sp_CreateAssignment(applicationId, officerId, batchId)
CREATE PROCEDURE sp_CreateAssignment(
    IN p_applicationId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_officerId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_batchId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_instrumentId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_ownerId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_scheduledDate VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_assignmentId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_bulkRequestId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Lookup application
    SELECT instrumentId, ownerId, preferredDate
    INTO v_instrumentId, v_ownerId, v_scheduledDate
    FROM `Application`
    WHERE id = p_applicationId
    LIMIT 1;

    IF v_instrumentId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application not found';
    END IF;

    -- Lookup bulkRequestId if batchId is provided
    IF p_batchId IS NOT NULL THEN
        SELECT bulkRequestId INTO v_bulkRequestId FROM `Batch` WHERE id = p_batchId LIMIT 1;
    END IF;

    SET v_assignmentId = CONCAT('ASG-', LPAD(FLOOR(RAND() * 999999), 6, '0'));
    IF v_scheduledDate IS NULL OR v_scheduledDate = '' THEN
        SET v_scheduledDate = DATE_FORMAT(CURDATE(), '%Y-%m-%d');
    END IF;

    -- Insert Assignment
    INSERT INTO `Assignment` (
        id, applicationId, instrumentId, ownerId, assignedOfficerId,
        batchId, bulkRequestId, status, scheduledDate, priority, assignedAt
    ) VALUES (
        v_assignmentId, p_applicationId, v_instrumentId, v_ownerId, p_officerId,
        p_batchId, v_bulkRequestId, 'SCHEDULED', v_scheduledDate, 'NORMAL', NOW()
    );

    -- Update Application status
    UPDATE `Application` SET status = 'SCHEDULED' WHERE id = p_applicationId;

    -- Update Instrument status
    UPDATE `Instrument`
    SET status = 'SCHEDULED', scheduledDate = v_scheduledDate
    WHERE id = v_instrumentId;

    -- Increment officer workload
    UPDATE `Officer`
    SET currentWorkload = currentWorkload + 1, updatedAt = NOW()
    WHERE id = p_officerId;

    COMMIT;

    -- Return the created assignment
    SELECT * FROM `Assignment` WHERE id = v_assignmentId;
END$$


-- 2. sp_CompleteVerification(inspectionId, result)
CREATE PROCEDURE sp_CompleteVerification(
    IN p_inspectionId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_result VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_instrumentId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_assignmentId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_officerId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_applicationId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_ownerId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_officerName VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_officerBadge VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_officerDesig VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_certId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_certNo VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_nowDate VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_expDate VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Fetch inspection details
    SELECT instrumentId, assignmentId, officerId, applicationId
    INTO v_instrumentId, v_assignmentId, v_officerId, v_applicationId
    FROM `Inspection`
    WHERE id = p_inspectionId
    LIMIT 1;

    IF v_instrumentId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Inspection not found';
    END IF;

    -- Fetch ownerId from instrument
    SELECT ownerId INTO v_ownerId FROM `Instrument` WHERE id = v_instrumentId LIMIT 1;

    -- Fetch officer details
    SELECT name, badgeNumber, designation
    INTO v_officerName, v_officerBadge, v_officerDesig
    FROM `Officer`
    WHERE id = v_officerId
    LIMIT 1;

    SET v_nowDate = DATE_FORMAT(CURDATE(), '%Y-%m-%d');
    SET v_expDate = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 YEAR), '%Y-%m-%d');

    IF UPPER(p_result) = 'PASS' THEN
        -- Mark Inspection COMPLETED
        UPDATE `Inspection`
        SET status = 'COMPLETED', result = 'PASS', completedAt = NOW()
        WHERE id = p_inspectionId;

        -- Update Assignment COMPLETED
        UPDATE `Assignment` SET status = 'COMPLETED' WHERE id = v_assignmentId;

        -- Update Application if present
        IF v_applicationId IS NOT NULL THEN
            UPDATE `Application` SET status = 'COMPLETED' WHERE id = v_applicationId;
        END IF;

        -- Generate Certificate
        SET v_certId = CONCAT('CERT-', LPAD(FLOOR(RAND() * 999999), 6, '0'));
        SET v_certNo = CONCAT('TS-LM-', DATE_FORMAT(CURDATE(), '%Y'), '-', LPAD(FLOOR(RAND() * 999999), 6, '0'));

        INSERT INTO `Certificate` (
            id, certificateNumber, instrumentId, ownerId, applicationId, inspectionId,
            issueDate, validUntil, officerName, officerBadge, officerDesignation,
            qrCodeData, status, createdAt
        ) VALUES (
            v_certId, v_certNo, v_instrumentId, v_ownerId, v_applicationId, p_inspectionId,
            v_nowDate, v_expDate, IFNULL(v_officerName, 'Officer'), IFNULL(v_officerBadge, 'LM-000'),
            IFNULL(v_officerDesig, 'Legal Metrology Officer'),
            CONCAT('{"certificateNumber":"', v_certNo, '","instrumentId":"', v_instrumentId, '","status":"ACTIVE","issueDate":"', v_nowDate, '","validUntil":"', v_expDate, '"}'),
            'ACTIVE', NOW()
        );

        -- Update Instrument
        UPDATE `Instrument`
        SET status = 'VERIFIED',
            lastVerifiedDate = v_nowDate,
            expiryDate = v_expDate,
            certificateId = v_certId,
            updatedAt = NOW()
        WHERE id = v_instrumentId;

        -- Decrement officer workload
        UPDATE `Officer`
        SET currentWorkload = GREATEST(0, currentWorkload - 1), updatedAt = NOW()
        WHERE id = v_officerId;

    ELSE
        -- Result is FAIL
        UPDATE `Inspection`
        SET status = 'FAILED', result = 'FAIL', completedAt = NOW()
        WHERE id = p_inspectionId;

        -- Update Assignment REINSPECTION_REQUIRED
        UPDATE `Assignment` SET status = 'REINSPECTION_REQUIRED' WHERE id = v_assignmentId;

        -- Update Application if present
        IF v_applicationId IS NOT NULL THEN
            UPDATE `Application` SET status = 'FAILED' WHERE id = v_applicationId;
        END IF;

        -- Update Instrument REINSPECTION_REQUIRED
        UPDATE `Instrument`
        SET status = 'REINSPECTION_REQUIRED', updatedAt = NOW()
        WHERE id = v_instrumentId;

        -- Decrement officer workload
        UPDATE `Officer`
        SET currentWorkload = GREATEST(0, currentWorkload - 1), updatedAt = NOW()
        WHERE id = v_officerId;
    END IF;

    COMMIT;

    -- Return updated inspection & instrument state
    SELECT i.*, ins.status AS instrumentStatus, ins.certificateId AS generatedCertificateId
    FROM `Inspection` i
    JOIN `Instrument` ins ON i.instrumentId = ins.id
    WHERE i.id = p_inspectionId;
END$$


-- 3. sp_CalculateComplianceScore(ownerId)
CREATE PROCEDURE sp_CalculateComplianceScore(
    IN p_ownerId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_totalInstruments INT DEFAULT 0;
    DECLARE v_verifiedInstruments INT DEFAULT 0;
    DECLARE v_failedInspections INT DEFAULT 0;
    DECLARE v_expiredInstruments INT DEFAULT 0;
    DECLARE v_reinspectionReq INT DEFAULT 0;
    DECLARE v_score INT DEFAULT 100;
    DECLARE v_deductions INT DEFAULT 0;
    DECLARE v_explanation TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    -- Count owner instruments
    SELECT COUNT(*) INTO v_totalInstruments
    FROM `Instrument`
    WHERE ownerId = p_ownerId;

    -- Count expired instruments
    SELECT COUNT(*) INTO v_expiredInstruments
    FROM `Instrument`
    WHERE ownerId = p_ownerId AND (status = 'EXPIRED' OR (expiryDate IS NOT NULL AND expiryDate < CURDATE()));

    -- Count reinspection required
    SELECT COUNT(*) INTO v_reinspectionReq
    FROM `Instrument`
    WHERE ownerId = p_ownerId AND (status = 'REINSPECTION_REQUIRED' OR status = 'FAILED');

    -- Count failed inspections in past cycle
    SELECT COUNT(*) INTO v_failedInspections
    FROM `Inspection` insp
    JOIN `Instrument` inst ON insp.instrumentId = inst.id
    WHERE inst.ownerId = p_ownerId AND insp.result = 'FAIL';

    -- Deductions: 15 points per expired instrument, 20 points per failed/reinspection
    SET v_deductions = (v_expiredInstruments * 15) + (v_reinspectionReq * 20);
    IF v_deductions > 100 THEN
        SET v_score = 0;
    ELSE
        SET v_score = 100 - v_deductions;
    END IF;

    SET v_explanation = CONCAT(
        'Base Score: 100. Deductions: ', v_deductions, ' points. ',
        'Expired Instruments: ', v_expiredInstruments, ' (-', (v_expiredInstruments * 15), ' pts). ',
        'Failed/Pending Reinspections: ', v_reinspectionReq, ' (-', (v_reinspectionReq * 20), ' pts).'
    );

    -- Update Owner table
    UPDATE `Owner`
    SET complianceScore = v_score, updatedAt = NOW()
    WHERE id = p_ownerId;

    -- Return score breakdown
    SELECT
        p_ownerId AS ownerId,
        v_score AS complianceScore,
        v_totalInstruments AS totalInstruments,
        v_expiredInstruments AS expiredInstruments,
        v_reinspectionReq AS reinspectionRequired,
        v_failedInspections AS failedInspections,
        v_deductions AS totalDeductions,
        v_explanation AS explanation;
END$$


-- 4. sp_SplitBulkBatch(bulkRequestId, officerAllocationsJson)
CREATE PROCEDURE sp_SplitBulkBatch(
    IN p_bulkRequestId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_officerAllocationsJson JSON
)
BEGIN
    DECLARE v_ownerId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_category VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_preferredDate VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_allocLength INT DEFAULT 0;
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_officerId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_officerName VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_batchName VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_batchId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_instrumentId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_asgId VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_innerIdx INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT ownerId, category, preferredDate
    INTO v_ownerId, v_category, v_preferredDate
    FROM `BulkRequest`
    WHERE id = p_bulkRequestId
    LIMIT 1;

    IF v_ownerId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BulkRequest not found';
    END IF;

    SET v_allocLength = JSON_LENGTH(p_officerAllocationsJson);

    WHILE v_idx < v_allocLength DO
        SET v_officerId = JSON_UNQUOTE(JSON_EXTRACT(p_officerAllocationsJson, CONCAT('$[', v_idx, '].officerId')));
        SET v_count = JSON_EXTRACT(p_officerAllocationsJson, CONCAT('$[', v_idx, '].count'));
        SET v_batchName = JSON_UNQUOTE(JSON_EXTRACT(p_officerAllocationsJson, CONCAT('$[', v_idx, '].batchName')));

        IF v_batchName IS NULL OR v_batchName = 'null' THEN
            SET v_batchName = CONCAT('Batch ', CHAR(65 + v_idx));
        END IF;

        SELECT name INTO v_officerName FROM `Officer` WHERE id = v_officerId LIMIT 1;

        SET v_batchId = CONCAT('BATCH-', LPAD(FLOOR(RAND() * 999999), 6, '0'));

        -- Insert Batch row
        INSERT INTO `Batch` (
            id, batchName, bulkRequestId, totalCount, completedCount, pendingCount,
            status, assignedOfficerId, officerName, createdAt, updatedAt
        ) VALUES (
            v_batchId, v_batchName, p_bulkRequestId, v_count, 0, v_count,
            'Pending', v_officerId, v_officerName, NOW(), NOW()
        );

        -- Update officer workload
        UPDATE `Officer`
        SET currentWorkload = currentWorkload + v_count, updatedAt = NOW()
        WHERE id = v_officerId;

        -- Create placeholder instruments and assignments
        SET v_innerIdx = 0;
        WHILE v_innerIdx < v_count DO
            SET v_asgId = CONCAT('ASG-', LPAD(FLOOR(RAND() * 9999999), 7, '0'));
            SET v_instrumentId = CONCAT('INST-BULK-', v_batchId, '-', v_innerIdx + 1);

            -- Insert Instrument row to satisfy foreign key
            INSERT INTO `Instrument` (
                id, serialNumber, model, manufacturer, category, capacity, accuracyClass,
                ownerId, location, district, state, status, scheduledDate, createdAt, updatedAt
            ) VALUES (
                v_instrumentId,
                CONCAT('SN-BULK-', v_batchId, '-', v_innerIdx + 1),
                CONCAT('Bulk Instrument #', v_innerIdx + 1),
                'Bulk Fleet Logistics',
                v_category,
                'Standard Commercial Capacity',
                'Class III',
                v_ownerId,
                'Bulk Terminal Facility Yard',
                'Hyderabad',
                'Telangana',
                'SCHEDULED',
                IFNULL(v_preferredDate, DATE_FORMAT(CURDATE(), '%Y-%m-%d')),
                NOW(),
                NOW()
            );

            INSERT INTO `Assignment` (
                id, applicationId, instrumentId, ownerId, assignedOfficerId,
                batchId, bulkRequestId, status, scheduledDate, priority, assignedAt
            ) VALUES (
                v_asgId, NULL, v_instrumentId, v_ownerId, v_officerId,
                v_batchId, p_bulkRequestId, 'SCHEDULED', IFNULL(v_preferredDate, DATE_FORMAT(CURDATE(), '%Y-%m-%d')), 'NORMAL', NOW()
            );

            SET v_innerIdx = v_innerIdx + 1;
        END WHILE;

        SET v_idx = v_idx + 1;
    END WHILE;

    -- Update BulkRequest status
    UPDATE `BulkRequest`
    SET status = 'IN_PROGRESS', updatedAt = NOW()
    WHERE id = p_bulkRequestId;

    COMMIT;

    -- Return created batches
    SELECT * FROM `Batch` WHERE bulkRequestId = p_bulkRequestId;
END$$

DELIMITER ;
