-- AlterTable
ALTER TABLE `Player` ADD COLUMN `recoveryEmailCode` VARCHAR(255) NULL,
    ADD COLUMN `recoveryEmailLookup` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `Profile` ADD COLUMN `recoveryEmailLookup` VARCHAR(255) NULL;
