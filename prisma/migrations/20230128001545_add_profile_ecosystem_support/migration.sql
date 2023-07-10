-- AlterTable
ALTER TABLE `Player` ADD COLUMN `profileId` VARCHAR(191) NULL,
    ADD COLUMN `profilePermissions` JSON NULL,
    MODIFY `password` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `Profile` (
    `id` VARCHAR(191) NOT NULL,
    `ecosystemId` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `connectedWalletId` VARCHAR(191) NULL,
    `username` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `accessToken` VARCHAR(255) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Profile_walletId_key`(`walletId`),
    UNIQUE INDEX `Profile_accessToken_key`(`accessToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ecosystem` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `iconImageUrl` VARCHAR(255) NULL,
    `coverImageUrl` VARCHAR(255) NULL,
    `primaryColorHex` VARCHAR(7) NOT NULL DEFAULT '#9549F5',
    `publishedKey` VARCHAR(255) NOT NULL,
    `secretKey` VARCHAR(255) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Ecosystem_email_key`(`email`),
    UNIQUE INDEX `Ecosystem_publishedKey_key`(`publishedKey`),
    UNIQUE INDEX `Ecosystem_secretKey_key`(`secretKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EcosystemGame` (
    `id` VARCHAR(191) NOT NULL,
    `ecosystemId` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `Profile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_ecosystemId_fkey` FOREIGN KEY (`ecosystemId`) REFERENCES `Ecosystem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_connectedWalletId_fkey` FOREIGN KEY (`connectedWalletId`) REFERENCES `Wallet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EcosystemGame` ADD CONSTRAINT `EcosystemGame_ecosystemId_fkey` FOREIGN KEY (`ecosystemId`) REFERENCES `Ecosystem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EcosystemGame` ADD CONSTRAINT `EcosystemGame_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Game`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
