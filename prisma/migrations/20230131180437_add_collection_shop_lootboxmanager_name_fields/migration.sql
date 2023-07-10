-- AlterTable
ALTER TABLE `Collection` ADD COLUMN `name` VARCHAR(255) NOT NULL DEFAULT 'Unnamed Collection';

-- AlterTable
ALTER TABLE `LootboxManager` ADD COLUMN `name` VARCHAR(255) NOT NULL DEFAULT 'Unnamed Lootbox Manager';

-- AlterTable
ALTER TABLE `Shop` ADD COLUMN `name` VARCHAR(255) NOT NULL DEFAULT 'Unnamed Shop';
