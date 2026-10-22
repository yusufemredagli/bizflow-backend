-- AlterTable
ALTER TABLE `ServiceRequest` ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `scheduledAt` DATETIME(3) NULL,
    ADD COLUMN `slaDeadline` DATETIME(3) NULL;
