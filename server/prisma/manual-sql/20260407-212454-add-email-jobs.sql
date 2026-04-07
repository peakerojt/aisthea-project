-- CreateTable
CREATE TABLE `EmailJobs` (
    `EmailJobId` INTEGER NOT NULL AUTO_INCREMENT,
    `EventKey` VARCHAR(191) NOT NULL,
    `EventType` VARCHAR(100) NOT NULL,
    `Recipient` VARCHAR(255) NOT NULL,
    `PayloadJson` JSON NOT NULL,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `Attempts` INTEGER NOT NULL DEFAULT 0,
    `LastError` TEXT NULL,
    `Provider` VARCHAR(50) NULL,
    `ProviderMessageId` VARCHAR(255) NULL,
    `ScheduledAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `SentAt` DATETIME(0) NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `EmailJobs_EventKey_key`(`EventKey`),
    INDEX `IX_EmailJobs_Status_ScheduledAt`(`Status`, `ScheduledAt`),
    PRIMARY KEY (`EmailJobId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
