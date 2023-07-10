/*
  Warnings:

  - The required column `verificationCode` was added to the `Game` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE `Game` ADD COLUMN `verificationCode` VARCHAR(255) NOT NULL,
    ADD COLUMN `verified` BOOLEAN NOT NULL DEFAULT false;
