-- AlterTable
ALTER TABLE `ServiceRequest` ADD COLUMN `completionNote` TEXT NULL,
    ADD COLUMN `customerNote` TEXT NULL,
    ADD COLUMN `materialsUsed` TEXT NULL,
    ADD COLUMN `serviceFee` DECIMAL(10, 2) NULL;

-- CreateIndex
CREATE INDEX `ServiceRequest_companyId_status_idx` ON `ServiceRequest`(`companyId`, `status`);

-- CreateIndex
CREATE INDEX `ServiceRequest_companyId_scheduledAt_idx` ON `ServiceRequest`(`companyId`, `scheduledAt`);

-- CreateIndex
CREATE INDEX `ServiceRequest_companyId_slaDeadline_idx` ON `ServiceRequest`(`companyId`, `slaDeadline`);
