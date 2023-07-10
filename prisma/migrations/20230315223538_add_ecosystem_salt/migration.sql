/*
  Warnings:

  - Added the required column `saltCiphertext` to the `Ecosystem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Ecosystem` ADD COLUMN `saltCiphertext` TEXT NOT NULL;
