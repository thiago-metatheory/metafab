/*
  Warnings:

  - Added the required column `forwarderAddress` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Contract` ADD COLUMN `forwarderAddress` VARCHAR(255) NOT NULL;
