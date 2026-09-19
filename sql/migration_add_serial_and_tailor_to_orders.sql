-- ==============================================================================
-- MIGRATION: Penambahan Kolom serial_number & tailor_name pada Tabel orders
-- Database: management_garment_db
-- Tanggal: 19 September 2026
--
-- Deskripsi:
-- Memenuhi SOP Alur Prosedur Produksi (Poin 2) & Penyesuaian Dasbor PIC:
-- 1. `serial_number`: Kode seri barang (misal: "BRD 3011 (M)")
-- 2. `tailor_name`: Nama calon penjahit yang ditugaskan (misal: "SARIPIN")
-- ==============================================================================

USE `management_garment_db`;

-- Query sederhana (jika menggunakan GUI seperti Navicat / DBeaver / phpMyAdmin):
-- ALTER TABLE `orders` ADD COLUMN `serial_number` VARCHAR(100) NULL AFTER `target_qty`;
-- ALTER TABLE `orders` ADD COLUMN `tailor_name` VARCHAR(100) NULL AFTER `serial_number`;

-- Eksekusi aman (Idempotent - tidak akan error jika kolom sudah ada):
SET @dbname = DATABASE();
SET @tablename = "orders";

-- 1. Tambah kolom serial_number jika belum ada
SET @columnname = "serial_number";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Kolom serial_number sudah ada' AS notice;",
  "ALTER TABLE `orders` ADD COLUMN `serial_number` VARCHAR(100) NULL AFTER `target_qty`;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Tambah kolom tailor_name jika belum ada
SET @columnname = "tailor_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Kolom tailor_name sudah ada' AS notice;",
  "ALTER TABLE `orders` ADD COLUMN `tailor_name` VARCHAR(100) NULL AFTER `serial_number`;"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Update contoh data demo (ORD-2026-0001) agar sesuai screenshot PIC
UPDATE `orders`
SET 
  `serial_number` = 'BRD 3011 (M)',
  `tailor_name` = 'SARIPIN'
WHERE `order_number` = 'ORD-2026-0001' AND (`serial_number` IS NULL OR `serial_number` = '');

SELECT '✅ Migrasi database berhasil dijalankan!' AS status;
