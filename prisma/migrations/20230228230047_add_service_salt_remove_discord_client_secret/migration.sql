/*
  Warnings:

  - You are about to drop the column `discordClientSecret` on the `Game` table. All the data in the column will be lost.
  - Added the required column `saltCiphertext` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Game` DROP COLUMN `discordClientSecret`,
    ADD COLUMN `saltCiphertext` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Player` ADD COLUMN `serviceAuthLookup` VARCHAR(255) NULL;
