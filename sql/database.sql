-- ==============================================================================
-- DATABASE: management_garment_db
-- Garment Production Tracking & Management System (Ekspedisi Model)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `management_garment_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `management_garment_db`;

-- 1. Roles
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `display_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `avatar` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`role_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Customers
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Products
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `standard_time_days` INT DEFAULT 7,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Orders (Surat Perintah Kerja / Work Orders)
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `target_qty` INT NOT NULL,
  `completed_qty` INT DEFAULT 0,
  `reject_qty` INT DEFAULT 0,
  `deadline` DATE NULL,
  `current_stage` ENUM('cutting', 'sewing', 'finishing', 'qc', 'packing', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'cutting',
  `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'in_progress',
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`customer_id`),
  INDEX (`product_id`),
  INDEX (`current_stage`),
  INDEX (`status`),
  FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Handovers (Perpindahan Antar Divisi / Serah Terima Ala Transit Ekspedisi)
DROP TABLE IF EXISTS `handovers`;
CREATE TABLE `handovers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `handover_code` VARCHAR(50) NOT NULL UNIQUE,
  `from_stage` ENUM('cutting', 'sewing', 'finishing', 'qc', 'packing') NOT NULL,
  `to_stage` ENUM('sewing', 'finishing', 'qc', 'packing', 'delivered') NOT NULL,
  `from_user_id` INT NOT NULL,
  `to_user_id` INT NULL,
  `qty_sent` INT NOT NULL,
  `qty_received` INT DEFAULT 0,
  `status` ENUM('in_transit', 'received', 'rejected') NOT NULL DEFAULT 'in_transit',
  `notes` TEXT NULL,
  `discrepancy_reason` TEXT NULL,
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `received_at` TIMESTAMP NULL,
  INDEX (`order_id`),
  INDEX (`status`),
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. QC Inspections (Pemeriksaan Kualitas, Good, Reject & Rework)
DROP TABLE IF EXISTS `qc_inspections`;
CREATE TABLE `qc_inspections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `inspector_id` INT NOT NULL,
  `qty_checked` INT NOT NULL,
  `qty_passed` INT NOT NULL,
  `qty_reject` INT DEFAULT 0,
  `qty_rework` INT DEFAULT 0,
  `reject_reason` TEXT NULL,
  `rework_target_stage` ENUM('cutting', 'sewing', 'finishing') DEFAULT 'sewing',
  `rework_status` ENUM('pending', 'repaired', 're_checked') DEFAULT 'pending',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`order_id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`inspector_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Production Logs / Timeline Audit Trail
DROP TABLE IF EXISTS `production_logs`;
CREATE TABLE `production_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `stage` ENUM('order_created', 'cutting', 'sewing', 'finishing', 'qc', 'packing', 'delivered', 'rework') NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `actor_id` INT NULL,
  `qty_affected` INT DEFAULT 0,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`order_id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- SEED DATA
-- Default password untuk semua demo user: password123 ($2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR5e0kO1B8yZ5uWwQ5KvZv9jF6S2q)
-- ==============================================================================

-- 1. Insert Roles
INSERT INTO `roles` (`id`, `name`, `display_name`, `description`) VALUES
(1, 'owner', 'Owner / Direktur', 'Akses penuh seluruh operasional, analitik, dan audit trail'),
(2, 'admin', 'Admin Produksi', 'Manajemen pesanan, master data, pengaturan PIC, dan cetak QR tag'),
(3, 'cutting', 'PIC Cutting', 'Pemotongan kain, inisiasi batch, dan handover kain ke penjahit'),
(4, 'sewing', 'PIC Sewing', 'Penerimaan kain jahit, proses perakitan baju, dan penerimaan tiket rework'),
(5, 'finishing', 'PIC Finishing', 'Pembersihan benang, setrika uap, kancing, dan handover ke QC'),
(6, 'qc', 'PIC Quality Control', 'Inspeksi kualitas: sortir Good, Reject, dan Rework tiket'),
(7, 'packing', 'PIC Packing & Delivery', 'Pengemasan baju jadi dan serah terima pengiriman ke klien');

-- 2. Insert Users (Password: password123)
-- bcrypt hash for 'password123': $2a$10$1WkOtwB6kG5rZq7dY7g/uep7oFh7oM.lK3qP9ZJ4t5A2y6F7n2gS.
INSERT INTO `users` (`id`, `role_id`, `name`, `username`, `password`, `phone`, `is_active`) VALUES
(1, 1, 'Bapak Hendra (Owner)', 'owner', '$2a$10$1WkOtwB6kG5rZq7dY7g/uep7oFh7oM.lK3qP9ZJ4t5A2y6F7n2gS.', '08123456701', 1),
(2, 2, 'Cecep Supriadi (Admin)', 'admin', '$2a$10$1WkOtwB6kG5rZq7dY7g/uep7oFh7oM.lK3qP9ZJ4t5A2y6F7n2gS.', '08123456702', 1),
(3, 3, 'Budi Santoso (Cutting)', 'pic_cutting', '$2a$10$1WkOtwB6kG5rZq7dY7g/uep7oFh7oM.lK3qP9ZJ4t5A2y6F7n2gS.', '08123456703', 1),
(4, 4, 'Andi Wijaya (Sewing)', 'pic_sewing', '$2a$10$1WkOtwB6kG5rZq7dY7g/uep7oFh7oM.lK3qP9ZJ4t5A2y6F7n2gS.', '08123456704', 1),
(5, 5, 'Rudi Hermawan (Finishing)', 'pic_finishing', '$2a$10$1WkOtwB6kG5rZq7dY7g/uep7oFh7oM.lK3qP9ZJ4t5A2y6F7n2gS.', '08123456705', 1),
(6, 6, 'Siti Nurhaliza (QC)', 'pic_qc', '$2a$10$1WkOtwB6kG5rZq7dY7g/uep7oFh7oM.lK3qP9ZJ4t5A2y6F7n2gS.', '08123456706', 1),
(7, 7, 'Dedi Supardi (Packing)', 'pic_packing', '$2a$10$1WkOtwB6kG5rZq7dY7g/uep7oFh7oM.lK3qP9ZJ4t5A2y6F7n2gS.', '08123456707', 1);

-- 3. Insert Customers
INSERT INTO `customers` (`id`, `code`, `name`, `phone`, `email`, `address`) VALUES
(1, 'CUST-001', 'PT Sinar Makmur Sejahtera', '08119876543', 'procurement@sinarmakmur.com', 'Jl. Industri Garmen No. 12, Bandung'),
(2, 'CUST-002', 'Distro Urban Culture Jakarta', '08128877665', 'orders@urbanculture.id', 'Jl. Senopati Raya No. 45, Jakarta Selatan'),
(3, 'CUST-003', 'CV Berkah Busana Mandiri', '08137788990', 'berkahbusana@gmail.com', 'Kawasan Niaga Baru Blok C, Solo');

-- 4. Insert Products
INSERT INTO `products` (`id`, `code`, `name`, `category`, `description`, `standard_time_days`) VALUES
(1, 'PRD-KMJ-01', 'Kemeja Pria Oxford Lengan Panjang', 'Kemeja', 'Bahan kain katun Oxford premium, kancing cadangan, pola slim fit', 5),
(2, 'PRD-KOS-01', 'Kaos Polos Cotton Combed 30s', 'Kaos', 'Kain katun combed 30s lembut, jahitan rantai pundak standar distro', 3),
(3, 'PRD-CHN-01', 'Celana Chino Stretch Kasual', 'Celana', 'Bahan twill stretch katun, resleting YKK, saku dalam katun tebal', 7),
(4, 'PRD-JKT-01', 'Jaket Varsity Fleece Kombinasi Kulit', 'Jaket', 'Bahan fleece tebal 330gsm kombinasi kulit sintetis premium', 8);

-- 5. Insert Sample Orders
INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `product_id`, `target_qty`, `completed_qty`, `reject_qty`, `deadline`, `current_stage`, `status`, `notes`, `created_by`, `created_at`) VALUES
(1, 'ORD-2026-0001', 1, 1, 500, 0, 0, DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), 'sewing', 'in_progress', 'Pesanan seragam kantor PT Sinar Makmur warna Navy & Putih', 2, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'ORD-2026-0002', 2, 2, 1000, 0, 0, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'qc', 'in_progress', 'Kaos distro Urban Culture edisi Autumn drop, warna Hitam & Sage Green', 2, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 'ORD-2026-0003', 3, 3, 300, 0, 0, DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), 'cutting', 'in_progress', 'Celana Chino krem ukuran 29-34', 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 'ORD-2026-0004', 1, 4, 150, 150, 2, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), 'delivered', 'completed', 'Jaket merchandise anniversary selesai serah terima klien', 2, DATE_SUB(NOW(), INTERVAL 7 DAY));

-- 6. Insert Sample Handovers
INSERT INTO `handovers` (`id`, `order_id`, `handover_code`, `from_stage`, `to_stage`, `from_user_id`, `to_user_id`, `qty_sent`, `qty_received`, `status`, `notes`, `sent_at`, `received_at`) VALUES
(1, 1, 'HND-202609-0001', 'cutting', 'sewing', 3, 4, 500, 500, 'received', 'Kain kemeja sudah dipotong 500 pcs sesuai pola', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 22 HOUR)),
(2, 2, 'HND-202609-0002', 'cutting', 'sewing', 3, 4, 1000, 1000, 'received', 'Kaos 1000 pcs potong rapih', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 46 HOUR)),
(3, 2, 'HND-202609-0003', 'sewing', 'finishing', 4, 5, 1000, 1000, 'received', 'Jahit selesai, lanjut buang benang & gosok uap', DATE_SUB(NOW(), INTERVAL 20 HOUR), DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(4, 2, 'HND-202609-0004', 'finishing', 'qc', 5, 6, 1000, 1000, 'received', 'Serah terima ke QC untuk inspeksi akhir', DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(5, 1, 'HND-202609-0005', 'sewing', 'finishing', 4, 5, 200, 0, 'in_transit', 'Partial handover: 200 pcs kemeja yang sudah selesai dijahit duluan', DATE_SUB(NOW(), INTERVAL 1 HOUR), NULL);

-- 7. Insert Sample QC Inspections
INSERT INTO `qc_inspections` (`id`, `order_id`, `inspector_id`, `qty_checked`, `qty_passed`, `qty_reject`, `qty_rework`, `reject_reason`, `rework_target_stage`, `rework_status`, `notes`, `created_at`) VALUES
(1, 4, 6, 150, 148, 2, 0, 'Kancing patah dan sobekan kain pada lengan jaket', 'sewing', 'repaired', '148 pcs lolos langsung kemas', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 2, 6, 400, 385, 5, 10, 'Jahitan leher miring dan noda oli mesin pada kerah', 'sewing', 'pending', 'Batch 1 diperiksa: 385 lolos, 10 rework kirim balik ke penjahit Andi', DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- 8. Insert Production Logs
INSERT INTO `production_logs` (`order_id`, `stage`, `action`, `actor_id`, `qty_affected`, `description`, `created_at`) VALUES
(1, 'order_created', 'ORDER_CREATED', 2, 500, 'SPK diterbitkan oleh Admin Produksi untuk PT Sinar Makmur', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 'cutting', 'CUTTING_COMPLETED', 3, 500, 'Pemotongan 500 pcs kain kemeja selesai oleh Budi Santoso', DATE_SUB(NOW(), INTERVAL 25 HOUR)),
(1, 'cutting', 'HANDOVER_SENT', 3, 500, 'Budi Santoso mengirim 500 pcs potongan kain ke Sewing (In Transit)', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, 'sewing', 'HANDOVER_ACCEPTED', 4, 500, 'Andi Wijaya memindai QR dan mengonfirmasi terima 500 pcs potongan kain', DATE_SUB(NOW(), INTERVAL 22 HOUR)),
(1, 'sewing', 'HANDOVER_SENT', 4, 200, 'Andi Wijaya mengirim partial handover 200 pcs kemeja selesai ke Finishing', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 'order_created', 'ORDER_CREATED', 2, 1000, 'SPK Kaos Combed 30s 1.000 pcs dibuat', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 'cutting', 'HANDOVER_ACCEPTED', 4, 1000, 'Sewing menerima 1000 pcs potongan kaos', DATE_SUB(NOW(), INTERVAL 46 HOUR)),
(2, 'sewing', 'HANDOVER_ACCEPTED', 5, 1000, 'Finishing menerima 1000 pcs kaos jahit', DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(2, 'finishing', 'HANDOVER_ACCEPTED', 6, 1000, 'QC menerima 1000 pcs kaos untuk inspeksi', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(2, 'qc', 'QC_INSPECTED', 6, 400, 'QC Inspeksi Batch 1: 385 Lolos, 5 Reject, 10 Rework', DATE_SUB(NOW(), INTERVAL 3 HOUR));
