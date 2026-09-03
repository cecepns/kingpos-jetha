-- ============================================================
-- Migration: Fitur Point, Unit Konversi, Custom Item, Member
-- ============================================================

-- 1. Kolom baru di customers
ALTER TABLE `customers`
  ADD COLUMN `member_barcode` VARCHAR(64) DEFAULT NULL AFTER `notes`,
  ADD COLUMN `total_points` INT DEFAULT 0 AFTER `member_barcode`,
  ADD COLUMN `total_visits` INT DEFAULT 0 AFTER `total_points`;

-- Auto-generate member_barcode untuk existing customers
UPDATE `customers` SET `member_barcode` = CONCAT('MBR-', id) WHERE `member_barcode` IS NULL;

-- 2. Tabel log riwayat point pelanggan
CREATE TABLE IF NOT EXISTS `customer_points_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL,
  `transaction_id` BIGINT UNSIGNED DEFAULT NULL,
  `points` INT NOT NULL,
  `type` ENUM('earn','manual','redeem','adjustment') NOT NULL DEFAULT 'earn',
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_cpl_customer` (`customer_id`),
  KEY `idx_cpl_transaction` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel konversi unit produk
CREATE TABLE IF NOT EXISTS `product_unit_conversions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT UNSIGNED NOT NULL,
  `unit_name` VARCHAR(32) NOT NULL,
  `conversion_qty` INT NOT NULL DEFAULT 1,
  `sell_price` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_puc_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Kolom is_custom di transaction_items untuk custom item
ALTER TABLE `transaction_items`
  ADD COLUMN `is_custom` TINYINT(1) DEFAULT 0 AFTER `margin_amount`;

-- Buat product_id nullable agar custom item bisa tanpa product_id
ALTER TABLE `transaction_items`
  MODIFY COLUMN `product_id` INT(10) UNSIGNED DEFAULT NULL;

-- 5. Settings default point
INSERT INTO `settings` (`key`, `value`) VALUES
  ('point_per_amount', '10000'),
  ('point_enabled', '1')
ON DUPLICATE KEY UPDATE `value` = `value`;
