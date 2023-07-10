-- AlterTable
ALTER TABLE `Player` ADD COLUMN `connectedWalletId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_connectedWalletId_fkey` FOREIGN KEY (`connectedWalletId`) REFERENCES `Wallet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
