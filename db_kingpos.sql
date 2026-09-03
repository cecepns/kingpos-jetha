-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Waktu pembuatan: 05 Agu 2026 pada 11.21
-- Versi server: 10.4.28-MariaDB
-- Versi PHP: 8.0.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_kingpos`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `attendances`
--

CREATE TABLE `attendances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `work_date` date NOT NULL,
  `check_in` time DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `status` enum('hadir','izin','sakit','alpha') DEFAULT 'hadir',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `cash_accounts`
--

CREATE TABLE `cash_accounts` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `type` enum('kas','bank','ewallet') DEFAULT 'kas',
  `balance` decimal(18,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `cash_accounts`
--

INSERT INTO `cash_accounts` (`id`, `name`, `type`, `balance`, `is_active`) VALUES
(1, 'Kas Utama / Laci', 'kas', 0.00, 1),
(2, 'Rekening Bank BCA', 'bank', 0.00, 1),
(4, 'QRIS / E-Wallet', 'ewallet', 0.00, 1);

-- --------------------------------------------------------

--
-- Struktur dari tabel `cash_flows`
--

CREATE TABLE `cash_flows` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cash_account_id` int(10) UNSIGNED NOT NULL,
  `type` enum('in','out','transfer_in','transfer_out') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `category_id` int(10) UNSIGNED DEFAULT NULL,
  `category_type` enum('income','expense') DEFAULT NULL,
  `reference` varchar(128) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `flow_date` date NOT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `catalog_categories`
--

CREATE TABLE `catalog_categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `code` varchar(16) DEFAULT NULL,
  `slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `catalog_products`
--

CREATE TABLE `catalog_products` (
  `id` int(10) UNSIGNED NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `subcategory_id` int(10) UNSIGNED DEFAULT NULL,
  `sku` varchar(64) DEFAULT NULL,
  `barcode` varchar(64) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `sell_price` decimal(18,2) NOT NULL DEFAULT 0.00,
  `crossed_price` decimal(18,2) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `image_path` varchar(512) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `catalog_product_images`
--

CREATE TABLE `catalog_product_images` (
  `id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `image_path` varchar(512) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `catalog_subcategories`
--

CREATE TABLE `catalog_subcategories` (
  `id` int(10) UNSIGNED NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `code` varchar(16) DEFAULT NULL,
  `slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `categories`
--

CREATE TABLE `categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `code` varchar(16) DEFAULT NULL,
  `slug` varchar(128) DEFAULT NULL,
  `parent_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `categories`
--

INSERT INTO `categories` (`id`, `name`, `code`, `slug`, `parent_id`, `created_at`, `updated_at`) VALUES
(1, 'Makanan', '01', 'makanan', NULL, '2026-08-05 08:51:22', '2026-08-05 08:51:22');

-- --------------------------------------------------------

--
-- Struktur dari tabel `customers`
--

CREATE TABLE `customers` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `whatsapp` varchar(32) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `category` varchar(64) DEFAULT 'umum',
  `notes` text DEFAULT NULL,
  `member_barcode` varchar(64) DEFAULT NULL,
  `total_points` int(11) DEFAULT 0,
  `total_visits` int(11) DEFAULT 0,
  `total_purchase` decimal(18,2) DEFAULT 0.00,
  `balance_receivable` decimal(18,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `customers`
--

INSERT INTO `customers` (`id`, `name`, `whatsapp`, `address`, `category`, `notes`, `member_barcode`, `total_points`, `total_visits`, `total_purchase`, `balance_receivable`, `created_at`, `updated_at`) VALUES
(1, 'Cecep Nandang', '082214094779', 'Subang', 'umum', NULL, 'MBR-1', 0, 0, 0.00, 0.00, '2026-08-05 08:54:50', '2026-08-05 08:54:50');

-- --------------------------------------------------------

--
-- Struktur dari tabel `customer_points_log`
--

CREATE TABLE `customer_points_log` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `transaction_id` bigint(20) UNSIGNED DEFAULT NULL,
  `points` int(11) NOT NULL,
  `type` enum('earn','manual','redeem','adjustment') NOT NULL DEFAULT 'earn',
  `notes` varchar(255) DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_cpl_customer` (`customer_id`),
  KEY `idx_cpl_transaction` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `employees`
--

CREATE TABLE `employees` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `position` varchar(64) DEFAULT NULL,
  `base_salary` decimal(18,2) NOT NULL DEFAULT 0.00,
  `hire_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `employee_bonuses`
--

CREATE TABLE `employee_bonuses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `bonus_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `employee_deductions`
--

CREATE TABLE `employee_deductions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `deduction_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `employee_loans`
--

CREATE TABLE `employee_loans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `balance` decimal(18,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `expense_categories`
--

CREATE TABLE `expense_categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `type` enum('operational','alat','pos','lainnya') DEFAULT 'operational',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `expense_categories`
--

INSERT INTO `expense_categories` (`id`, `name`, `type`, `created_at`) VALUES
(4, 'GAJI KARYAWAN', 'lainnya', '2026-05-12 14:48:54'),
(9, 'KONSUMSI', 'operational', '2026-05-12 14:50:32'),
(10, 'BELANJA BARANG', 'operational', '2026-05-12 14:50:57'),
(12, 'LAIN LAIN', 'lainnya', '2026-05-12 17:23:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `income_categories`
--

CREATE TABLE `income_categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `installment_payments`
--

CREATE TABLE `installment_payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `receivable_id` bigint(20) UNSIGNED DEFAULT NULL,
  `payable_id` bigint(20) UNSIGNED DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `payment_date` date NOT NULL,
  `cash_account_id` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `installment_payments`
--

INSERT INTO `installment_payments` (`id`, `receivable_id`, `payable_id`, `amount`, `payment_date`, `cash_account_id`, `notes`, `created_at`) VALUES
(2, 2, NULL, 80000.00, '2026-05-19', 1, NULL, '2026-05-19 14:30:50'),
(3, NULL, 1, 2754700.00, '2026-05-28', 1, NULL, '2026-05-28 07:32:20'),
(4, NULL, 2, 2741669.00, '2026-05-28', 4, NULL, '2026-05-28 09:03:02'),
(5, NULL, 3, 1855000.00, '2026-05-28', 2, NULL, '2026-05-28 09:03:22'),
(6, NULL, 4, 2786200.00, '2026-05-28', 1, NULL, '2026-05-28 09:03:27'),
(7, NULL, 5, 4398500.00, '2026-06-08', 1, NULL, '2026-06-08 16:03:50'),
(8, 5, NULL, 150000.00, '2026-06-09', 4, NULL, '2026-06-09 08:41:25'),
(9, 4, NULL, 130000.00, '2026-06-09', 4, NULL, '2026-06-09 08:41:33'),
(10, 3, NULL, 189000.00, '2026-06-09', 4, NULL, '2026-06-09 08:41:38'),
(11, NULL, 6, 2382499.00, '2026-06-16', 1, NULL, '2026-06-16 14:21:22'),
(12, NULL, 7, 39000.00, '2026-06-16', 1, NULL, '2026-06-16 15:26:06'),
(13, 6, NULL, 140000.00, '2026-06-21', 2, NULL, '2026-06-21 09:43:04');

-- --------------------------------------------------------

--
-- Struktur dari tabel `payables`
--

CREATE TABLE `payables` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` int(10) UNSIGNED NOT NULL,
  `reference` varchar(128) DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `paid_amount` decimal(18,2) DEFAULT 0.00,
  `balance` decimal(18,2) NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('open','partial','paid','overdue') DEFAULT 'open',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `payables`
--

INSERT INTO `payables` (`id`, `supplier_id`, `reference`, `amount`, `paid_amount`, `balance`, `due_date`, `status`, `notes`, `created_at`, `updated_at`) VALUES
(1, 3, '0001', 2754700.00, 2754700.00, 0.00, '2026-05-29', 'paid', NULL, '2026-05-28 07:32:04', '2026-05-28 07:32:20'),
(2, 3, '00723', 2741669.00, 2741669.00, 0.00, '2026-05-07', 'paid', NULL, '2026-05-28 09:00:52', '2026-05-28 09:03:02'),
(3, 5, NULL, 1855000.00, 1855000.00, 0.00, '2026-05-25', 'paid', NULL, '2026-05-28 09:01:38', '2026-05-28 09:03:22'),
(4, 3, NULL, 2786200.00, 2786200.00, 0.00, '2026-05-13', 'paid', NULL, '2026-05-28 09:02:18', '2026-05-28 09:03:27'),
(5, 3, '00793', 4398500.00, 4398500.00, 0.00, '2026-06-07', 'paid', NULL, '2026-06-04 09:13:39', '2026-06-08 16:03:50'),
(6, 6, NULL, 2382499.00, 2382499.00, 0.00, '2026-06-12', 'paid', NULL, '2026-06-16 14:21:04', '2026-06-16 14:21:22'),
(7, 3, NULL, 39000.00, 39000.00, 0.00, '2026-06-14', 'paid', NULL, '2026-06-16 15:25:23', '2026-06-16 15:26:06');

-- --------------------------------------------------------

--
-- Struktur dari tabel `permissions`
--

CREATE TABLE `permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `code` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `permissions`
--

INSERT INTO `permissions` (`id`, `code`, `description`, `created_at`) VALUES
(1, 'all', 'Semua akses', '2026-05-10 06:29:01'),
(2, 'pos', 'Kasir POS', '2026-05-10 06:29:01'),
(3, 'products', 'Produk', '2026-05-10 06:29:01'),
(4, 'customers', 'Pelanggan', '2026-05-10 06:29:01'),
(5, 'suppliers', 'Supplier', '2026-05-10 06:29:01'),
(6, 'transactions', 'Transaksi', '2026-05-10 06:29:01'),
(7, 'cashflow', 'Cash flow', '2026-05-10 06:29:01'),
(8, 'reports', 'Laporan', '2026-05-10 06:29:01'),
(9, 'employees', 'Karyawan', '2026-05-10 06:29:01'),
(10, 'settings', 'Pengaturan', '2026-05-10 06:29:01'),
(11, 'dashboard', 'Dashboard', '2026-05-11 03:40:15'),
(12, 'categories', 'Kategori produk', '2026-05-11 03:40:15'),
(13, 'barcode_labels', 'Cetak barcode', '2026-05-11 03:40:15'),
(14, 'stock_summary', 'Data stok', '2026-05-11 03:40:15'),
(15, 'stock_adjust', 'Penyesuaian stok', '2026-05-11 03:40:15'),
(16, 'low_stock', 'Stok menipis', '2026-05-11 03:40:15'),
(17, 'expenses', 'Pengeluaran', '2026-05-11 03:40:15'),
(18, 'expense_categories', 'Kategori pengeluaran', '2026-05-11 03:40:15'),
(19, 'users', 'Pengguna & hak akses', '2026-05-11 03:40:15');

-- --------------------------------------------------------

--
-- Struktur dari tabel `printers`
--

CREATE TABLE `printers` (
  `id` int(10) UNSIGNED NOT NULL,
  `store_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `connection_type` enum('usb','bluetooth','network') DEFAULT 'bluetooth',
  `address` varchar(255) DEFAULT NULL,
  `paper_width_mm` tinyint(4) DEFAULT 58,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `printers`
--

INSERT INTO `printers` (`id`, `store_id`, `name`, `connection_type`, `address`, `paper_width_mm`, `is_default`, `created_at`) VALUES
(1, 1, 'Thermal Kasir', 'bluetooth', NULL, 58, 1, '2026-05-10 06:29:01');

-- --------------------------------------------------------

--
-- Struktur dari tabel `products`
--

CREATE TABLE `products` (
  `id` int(10) UNSIGNED NOT NULL,
  `sku` varchar(64) NOT NULL,
  `barcode` varchar(64) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(512) DEFAULT NULL,
  `supplier_id` int(10) UNSIGNED DEFAULT NULL,
  `purchase_price` decimal(18,2) NOT NULL DEFAULT 0.00,
  `sell_price` decimal(18,2) NOT NULL DEFAULT 0.00,
  `wholesale_price` decimal(18,2) NOT NULL DEFAULT 0.00,
  `wholesale_min_qty` int(11) NOT NULL DEFAULT 0,
  `stock` int(11) NOT NULL DEFAULT 0,
  `min_stock` int(11) NOT NULL DEFAULT 0,
  `unit` varchar(32) NOT NULL DEFAULT 'PCS',
  `location` varchar(255) DEFAULT NULL,
  `brand` varchar(128) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_variants`
--

CREATE TABLE `product_variants` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `sku` varchar(64) DEFAULT NULL,
  `barcode` varchar(64) DEFAULT NULL,
  `sell_price` decimal(18,2) NOT NULL DEFAULT 0.00,
  `wholesale_price` decimal(18,2) NOT NULL DEFAULT 0.00,
  `wholesale_min_qty` int(11) NOT NULL DEFAULT 0,
  `stock` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pv_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_tiers`
--

CREATE TABLE `product_tiers` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int(10) UNSIGNED NOT NULL,
  `min_qty` int(11) NOT NULL DEFAULT 1,
  `price` decimal(18,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pt_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_unit_conversions`
--

CREATE TABLE `product_unit_conversions` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int(10) UNSIGNED NOT NULL,
  `unit_name` varchar(32) NOT NULL,
  `conversion_qty` int(11) NOT NULL DEFAULT 1,
  `sell_price` decimal(18,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_puc_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `variant_tiers`
--

CREATE TABLE `variant_tiers` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `variant_id` int(10) UNSIGNED NOT NULL,
  `min_qty` int(11) NOT NULL DEFAULT 1,
  `price` decimal(18,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_vt_variant` (`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_categories`
--

CREATE TABLE `product_categories` (
  `product_id` int(10) UNSIGNED NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `product_categories`
--

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(5, 1),
(6, 1),
(7, 2),
(8, 2),
(9, 3),
(10, 5),
(11, 5),
(12, 5),
(13, 2),
(14, 8),
(15, 7),
(16, 5),
(17, 5),
(18, 2),
(19, 2),
(20, 2),
(21, 8),
(22, 8),
(23, 2),
(24, 8),
(25, 2),
(26, 7),
(27, 7),
(28, 8),
(29, 10),
(30, 2),
(31, 2),
(32, 2),
(33, 2),
(34, 2),
(35, 9),
(36, 3),
(37, 10),
(38, 8),
(39, 8),
(40, 8),
(41, 8),
(42, 8),
(43, 6),
(44, 6),
(45, 6),
(46, 7),
(47, 2),
(48, 1),
(50, 1),
(51, 1),
(52, 1),
(53, 2),
(54, 8),
(55, 11),
(56, 2),
(57, 8),
(58, 7),
(59, 7),
(60, 8),
(62, 8),
(63, 2),
(64, 6),
(65, 6),
(66, 6),
(67, 1),
(68, 9),
(69, 4),
(71, 2),
(72, 2),
(73, 2),
(74, 8),
(75, 6),
(76, 10),
(77, 11),
(78, 2),
(79, 2),
(80, 1),
(81, 8),
(82, 8),
(83, 2),
(84, 2),
(85, 2),
(86, 2),
(87, 2),
(88, 2),
(89, 2),
(90, 2),
(91, 2),
(92, 8),
(94, 2),
(95, 2),
(96, 2),
(97, 2),
(98, 2),
(99, 6),
(100, 8),
(101, 2),
(102, 5),
(103, 2),
(104, 2),
(105, 2),
(106, 8),
(107, 2),
(129, 2),
(130, 8);

-- --------------------------------------------------------

--
-- Struktur dari tabel `receivables`
--

CREATE TABLE `receivables` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `transaction_id` bigint(20) UNSIGNED DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `paid_amount` decimal(18,2) DEFAULT 0.00,
  `balance` decimal(18,2) NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('open','partial','paid','overdue') DEFAULT 'open',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `receivables`
--

INSERT INTO `receivables` (`id`, `customer_id`, `transaction_id`, `amount`, `paid_amount`, `balance`, `due_date`, `status`, `notes`, `created_at`, `updated_at`) VALUES
(2, 6, 121, 80000.00, 80000.00, 0.00, NULL, 'paid', NULL, '2026-05-15 09:00:17', '2026-05-19 14:30:50'),
(3, 11, 167, 189000.00, 189000.00, 0.00, NULL, 'paid', NULL, '2026-05-28 08:28:26', '2026-06-09 08:41:38'),
(4, 21, 212, 130000.00, 130000.00, 0.00, NULL, 'paid', NULL, '2026-06-03 16:51:54', '2026-06-09 08:41:33'),
(5, 21, 214, 150000.00, 150000.00, 0.00, NULL, 'paid', NULL, '2026-06-03 16:53:57', '2026-06-09 08:41:25'),
(6, 30, 290, 140000.00, 140000.00, 0.00, NULL, 'paid', NULL, '2026-06-19 10:18:38', '2026-06-21 09:43:04'),
(7, 45, 439, 190000.00, 0.00, 190000.00, NULL, 'open', NULL, '2026-08-04 02:49:46', '2026-08-04 02:49:46');

-- --------------------------------------------------------

--
-- Struktur dari tabel `roles`
--

CREATE TABLE `roles` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` enum('admin','kasir','owner') NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'Akses penuh', '2026-05-10 06:29:01', '2026-05-10 06:29:01'),
(2, 'kasir', 'POS & transaksi', '2026-05-10 06:29:01', '2026-05-10 06:29:01'),
(3, 'owner', 'Laporan & analisis', '2026-05-10 06:29:01', '2026-05-10 06:29:01');

-- --------------------------------------------------------

--
-- Struktur dari tabel `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` int(10) UNSIGNED NOT NULL,
  `permission_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1, 1),
(2, 2),
(2, 4),
(2, 6),
(2, 7),
(2, 11),
(2, 12),
(2, 14),
(2, 16),
(2, 17),
(3, 2),
(3, 3),
(3, 4),
(3, 5),
(3, 6),
(3, 7),
(3, 8),
(3, 11),
(3, 12),
(3, 13),
(3, 14),
(3, 15),
(3, 16),
(3, 17),
(3, 18);

-- --------------------------------------------------------

--
-- Struktur dari tabel `salaries`
--

CREATE TABLE `salaries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `period_month` tinyint(3) UNSIGNED NOT NULL,
  `period_year` smallint(5) UNSIGNED NOT NULL,
  `base_amount` decimal(18,2) NOT NULL,
  `bonus_total` decimal(18,2) DEFAULT 0.00,
  `deduction_total` decimal(18,2) DEFAULT 0.00,
  `loan_deduction` decimal(18,2) DEFAULT 0.00,
  `net_amount` decimal(18,2) NOT NULL,
  `status` enum('draft','paid') DEFAULT 'draft',
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `settings`
--

CREATE TABLE `settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `key` varchar(64) NOT NULL,
  `value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `settings`
--

INSERT INTO `settings` (`id`, `key`, `value`, `updated_at`) VALUES
(1, 'store_name', 'King POS', '2026-08-05 08:26:39'),
(2, 'tax_default', '0', '2026-05-10 06:29:01'),
(3, 'currency', 'IDR', '2026-05-10 06:29:01'),
(4, 'whatsapp_sender_note', 'Terima kasih Pelanggan King POS, perlu Konsultasi Jangan Ragu untuk Chat ya.. Follow @kingcreativestudio.my.id ', '2026-08-05 08:26:39'),
(10, 'store_address', 'Jl Bantarwaru, Kec Gantar Indramayu', '2026-08-05 08:26:39'),
(11, 'store_phone', '082214094779', '2026-08-05 08:26:39'),
(12, 'receipt_footer', 'Terima kasih sudah berbelanja di King POS', '2026-08-05 08:26:39'),
(13, 'thermal_width_mm', '58', '2026-05-10 19:44:46'),
(81, 'catalog_ig', '@anggrek_sekargumilang', '2026-06-06 15:23:14'),
(82, 'catalog_tiktok', '@anggrekmurahpurwokerto', '2026-06-06 15:23:14'),
(83, 'catalog_fb', 'kebunsekargumilang', '2026-06-07 15:24:55'),
(84, 'catalog_youtube', 'Anggrek Sekargumilang', '2026-06-07 00:19:55'),
(85, 'catalog_wa', '[{\"name\":\"Admin Kebun\",\"phone\":\"085174064521\"},{\"name\":\"OWNER\",\"phone\":\"082137425699\"}]', '2026-06-06 20:32:21');

-- --------------------------------------------------------

--
-- Struktur dari tabel `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `type` enum('in','out','adjustment','sale','refund','purchase') NOT NULL,
  `qty` int(11) NOT NULL,
  `reference_type` varchar(32) DEFAULT NULL,
  `reference_id` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `stores`
--

CREATE TABLE `stores` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(128) NOT NULL,
  `contact_name` varchar(128) DEFAULT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `whatsapp` varchar(32) DEFAULT NULL,
  `email` varchar(128) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `category` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `total_purchase` decimal(18,2) DEFAULT 0.00,
  `balance_payable` decimal(18,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `supplier_purchases`
--

CREATE TABLE `supplier_purchases` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` int(10) UNSIGNED NOT NULL,
  `total` decimal(18,2) NOT NULL,
  `purchase_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `transactions`
--

CREATE TABLE `transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_no` varchar(32) NOT NULL,
  `store_id` int(10) UNSIGNED DEFAULT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('draft','hold','completed','refunded','cancelled') NOT NULL DEFAULT 'completed',
  `subtotal` decimal(18,2) NOT NULL DEFAULT 0.00,
  `discount_total` decimal(18,2) NOT NULL DEFAULT 0.00,
  `tax_percent` decimal(5,2) DEFAULT 0.00,
  `tax_amount` decimal(18,2) DEFAULT 0.00,
  `additional_fee` decimal(18,2) DEFAULT 0.00,
  `additional_fee_name` varchar(128) DEFAULT NULL,
  `grand_total` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_cost` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_margin` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_profit` decimal(18,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `sale_date` date DEFAULT NULL COMMENT 'Tanggal transaksi POS',
  `paid_amount` decimal(18,2) DEFAULT 0.00,
  `change_amount` decimal(18,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `transaction_items`
--

CREATE TABLE `transaction_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `transaction_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED DEFAULT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `variant_name` varchar(128) DEFAULT NULL,
  `barcode` varchar(64) DEFAULT NULL,
  `purchase_price` decimal(18,2) NOT NULL,
  `sell_price` decimal(18,2) NOT NULL,
  `qty` int(11) NOT NULL,
  `discount_amount` decimal(18,2) DEFAULT 0.00,
  `subtotal` decimal(18,2) NOT NULL,
  `line_total` decimal(18,2) NOT NULL,
  `margin_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `is_custom` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `transaction_payments`
--

CREATE TABLE `transaction_payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `transaction_id` bigint(20) UNSIGNED NOT NULL,
  `method` enum('cash','transfer','qris','hutang') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `cash_account_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `store_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `email` varchar(128) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `role_id`, `store_id`, `name`, `email`, `password_hash`, `is_active`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'Admin Utama', 'admin@pos.local', '$2a$12$CJ6hj6GHBQJG2wC6yrCSEu1hWWoe1Sjmh/Ep6N5Cz7YbDGz/.gYsC', 1, '2026-08-05 16:06:01', '2026-05-10 06:29:01', '2026-08-05 09:06:01'),
(5, 1, NULL, 'OWNER GALIH', 'g_priambudi@yahoo.co.id', '$2a$10$2x8jRJmWjgXFlkbzy4ELiOIB4ubVwacJfsAUXUlJ2KwNWFbGa3uW6', 1, '2026-07-22 12:24:39', '2026-05-12 14:09:37', '2026-07-22 05:24:39'),
(6, 1, NULL, 'OWNER FRYDA', 'frydasavia@gmail.com', '$2a$10$6TPmaWEz4fVqDRsvbHt09eqTp8p0T9Ffk28px0sCLNGDK149dhbeW', 1, '2026-08-04 09:14:21', '2026-05-12 14:11:13', '2026-08-04 02:14:21'),
(8, 1, NULL, 'KASIR SG', 'kasirkebun@com', '$2a$10$PMbmoz9BoIw0fj/IMIYuwOzpqv4CAPUC740xpprrkBKF/WRrmDdKi', 1, '2026-06-25 13:13:41', '2026-05-14 09:14:42', '2026-06-25 06:19:48'),
(9, 2, NULL, 'KASIR DEV', 'cecep@gmail.com', '$2a$10$7ieI5sKlB1MJK.bFpTxEn.FW8g.kjCJ7.xd3KvLi7Sd9wEHyewbLq', 1, '2026-05-15 16:19:24', '2026-05-14 09:37:46', '2026-05-15 09:19:24'),
(10, 1, NULL, 'ADMIN KATALOG', 'adminkatalog@com', '$2a$10$gvet2RTHDFWas7LrK7QgGumfs32iQzZ.J34qLJVDGOR3aR3iC9Dp6', 1, '2026-07-01 14:56:44', '2026-06-25 06:21:32', '2026-07-01 07:56:44');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `attendances`
--
ALTER TABLE `attendances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_attendance_day` (`employee_id`,`work_date`),
  ADD KEY `idx_att_date` (`work_date`);

--
-- Indeks untuk tabel `cash_accounts`
--
ALTER TABLE `cash_accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `cash_flows`
--
ALTER TABLE `cash_flows`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cf_user` (`created_by`),
  ADD KEY `idx_cf_date` (`flow_date`),
  ADD KEY `idx_cf_account` (`cash_account_id`);

--
-- Indeks untuk tabel `catalog_categories`
--
ALTER TABLE `catalog_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ccategories_name` (`name`);

--
-- Indeks untuk tabel `catalog_products`
--
ALTER TABLE `catalog_products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cprod_cat` (`category_id`),
  ADD KEY `fk_cprod_sub` (`subcategory_id`),
  ADD KEY `idx_cproducts_name` (`name`),
  ADD KEY `idx_cproducts_sort` (`sort_order`,`id`);

--
-- Indeks untuk tabel `catalog_product_images`
--
ALTER TABLE `catalog_product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cpi_sort` (`product_id`,`sort_order`,`id`);

--
-- Indeks untuk tabel `catalog_subcategories`
--
ALTER TABLE `catalog_subcategories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_csub_cat` (`category_id`),
  ADD KEY `idx_csubcategories_name` (`name`);

--
-- Indeks untuk tabel `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cat_parent` (`parent_id`),
  ADD KEY `idx_categories_name` (`name`),
  ADD KEY `idx_categories_code` (`code`);

--
-- Indeks untuk tabel `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customers_name` (`name`),
  ADD KEY `idx_customers_wa` (`whatsapp`);

--
-- Indeks untuk tabel `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_emp_user` (`user_id`);

--
-- Indeks untuk tabel `employee_bonuses`
--
ALTER TABLE `employee_bonuses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bonus_emp` (`employee_id`);

--
-- Indeks untuk tabel `employee_deductions`
--
ALTER TABLE `employee_deductions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ded_emp` (`employee_id`);

--
-- Indeks untuk tabel `employee_loans`
--
ALTER TABLE `employee_loans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_loan_emp` (`employee_id`);

--
-- Indeks untuk tabel `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `income_categories`
--
ALTER TABLE `income_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `installment_payments`
--
ALTER TABLE `installment_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_inst_recv` (`receivable_id`),
  ADD KEY `fk_inst_pay` (`payable_id`),
  ADD KEY `fk_inst_cash` (`cash_account_id`);

--
-- Indeks untuk tabel `payables`
--
ALTER TABLE `payables`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pay_supplier` (`supplier_id`),
  ADD KEY `idx_pay_status` (`status`),
  ADD KEY `idx_pay_due` (`due_date`);

--
-- Indeks untuk tabel `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indeks untuk tabel `printers`
--
ALTER TABLE `printers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_printer_store` (`store_id`);

--
-- Indeks untuk tabel `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD UNIQUE KEY `barcode` (`barcode`),
  ADD KEY `fk_products_supplier` (`supplier_id`),
  ADD KEY `idx_products_name` (`name`),
  ADD KEY `idx_products_barcode` (`barcode`),
  ADD KEY `idx_products_active` (`is_active`);

--
-- Indeks untuk tabel `product_categories`
--
ALTER TABLE `product_categories`
  ADD PRIMARY KEY (`product_id`,`category_id`),
  ADD KEY `fk_pc_category` (`category_id`);

--
-- Indeks untuk tabel `receivables`
--
ALTER TABLE `receivables`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_recv_customer` (`customer_id`),
  ADD KEY `fk_recv_tx` (`transaction_id`),
  ADD KEY `idx_recv_status` (`status`),
  ADD KEY `idx_recv_due` (`due_date`);

--
-- Indeks untuk tabel `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indeks untuk tabel `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `fk_rp_perm` (`permission_id`);

--
-- Indeks untuk tabel `salaries`
--
ALTER TABLE `salaries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_salary_period` (`employee_id`,`period_month`,`period_year`),
  ADD KEY `idx_salary_period` (`period_year`,`period_month`);

--
-- Indeks untuk tabel `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key` (`key`);

--
-- Indeks untuk tabel `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sm_user` (`created_by`),
  ADD KEY `idx_sm_product` (`product_id`),
  ADD KEY `idx_sm_created` (`created_at`);

--
-- Indeks untuk tabel `stores`
--
ALTER TABLE `stores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_stores_active` (`is_active`);

--
-- Indeks untuk tabel `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_suppliers_name` (`name`);

--
-- Indeks untuk tabel `supplier_purchases`
--
ALTER TABLE `supplier_purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sp_supplier` (`supplier_id`);

--
-- Indeks untuk tabel `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_no` (`invoice_no`),
  ADD KEY `fk_tx_store` (`store_id`),
  ADD KEY `fk_tx_user` (`user_id`),
  ADD KEY `idx_tx_date` (`created_at`),
  ADD KEY `idx_tx_status` (`status`),
  ADD KEY `idx_tx_customer` (`customer_id`);

--
-- Indeks untuk tabel `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ti_product` (`product_id`),
  ADD KEY `idx_ti_tx` (`transaction_id`);

--
-- Indeks untuk tabel `transaction_payments`
--
ALTER TABLE `transaction_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tp_tx` (`transaction_id`),
  ADD KEY `fk_tp_cash` (`cash_account_id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_users_store` (`store_id`),
  ADD KEY `idx_users_role` (`role_id`),
  ADD KEY `idx_users_email` (`email`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `attendances`
--
ALTER TABLE `attendances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `cash_accounts`
--
ALTER TABLE `cash_accounts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `cash_flows`
--
ALTER TABLE `cash_flows`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `catalog_categories`
--
ALTER TABLE `catalog_categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `catalog_products`
--
ALTER TABLE `catalog_products`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `catalog_product_images`
--
ALTER TABLE `catalog_product_images`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `catalog_subcategories`
--
ALTER TABLE `catalog_subcategories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `employee_bonuses`
--
ALTER TABLE `employee_bonuses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `employee_deductions`
--
ALTER TABLE `employee_deductions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `employee_loans`
--
ALTER TABLE `employee_loans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT untuk tabel `income_categories`
--
ALTER TABLE `income_categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `installment_payments`
--
ALTER TABLE `installment_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT untuk tabel `payables`
--
ALTER TABLE `payables`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT untuk tabel `printers`
--
ALTER TABLE `printers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `products`
--
ALTER TABLE `products`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `receivables`
--
ALTER TABLE `receivables`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `salaries`
--
ALTER TABLE `salaries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=174;

--
-- AUTO_INCREMENT untuk tabel `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `stores`
--
ALTER TABLE `stores`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `supplier_purchases`
--
ALTER TABLE `supplier_purchases`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `transaction_items`
--
ALTER TABLE `transaction_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `transaction_payments`
--
ALTER TABLE `transaction_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `attendances`
--
ALTER TABLE `attendances`
  ADD CONSTRAINT `fk_att_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `cash_flows`
--
ALTER TABLE `cash_flows`
  ADD CONSTRAINT `fk_cf_account` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`),
  ADD CONSTRAINT `fk_cf_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `catalog_products`
--
ALTER TABLE `catalog_products`
  ADD CONSTRAINT `fk_cprod_cat` FOREIGN KEY (`category_id`) REFERENCES `catalog_categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cprod_sub` FOREIGN KEY (`subcategory_id`) REFERENCES `catalog_subcategories` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `catalog_product_images`
--
ALTER TABLE `catalog_product_images`
  ADD CONSTRAINT `fk_cpi_prod` FOREIGN KEY (`product_id`) REFERENCES `catalog_products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `catalog_subcategories`
--
ALTER TABLE `catalog_subcategories`
  ADD CONSTRAINT `fk_csub_cat` FOREIGN KEY (`category_id`) REFERENCES `catalog_categories` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_cat_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_emp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `employee_bonuses`
--
ALTER TABLE `employee_bonuses`
  ADD CONSTRAINT `fk_bonus_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `employee_deductions`
--
ALTER TABLE `employee_deductions`
  ADD CONSTRAINT `fk_ded_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `employee_loans`
--
ALTER TABLE `employee_loans`
  ADD CONSTRAINT `fk_loan_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `installment_payments`
--
ALTER TABLE `installment_payments`
  ADD CONSTRAINT `fk_inst_cash` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_inst_pay` FOREIGN KEY (`payable_id`) REFERENCES `payables` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_inst_recv` FOREIGN KEY (`receivable_id`) REFERENCES `receivables` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `payables`
--
ALTER TABLE `payables`
  ADD CONSTRAINT `fk_pay_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Ketidakleluasaan untuk tabel `printers`
--
ALTER TABLE `printers`
  ADD CONSTRAINT `fk_printer_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `fk_pv_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_tiers`
--
ALTER TABLE `product_tiers`
  ADD CONSTRAINT `fk_pt_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `variant_tiers`
--
ALTER TABLE `variant_tiers`
  ADD CONSTRAINT `fk_vt_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_categories`
--
ALTER TABLE `product_categories`
  ADD CONSTRAINT `fk_pc_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pc_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `receivables`
--
ALTER TABLE `receivables`
  ADD CONSTRAINT `fk_recv_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `fk_recv_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `salaries`
--
ALTER TABLE `salaries`
  ADD CONSTRAINT `fk_sal_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_sm_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sm_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `supplier_purchases`
--
ALTER TABLE `supplier_purchases`
  ADD CONSTRAINT `fk_sp_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Ketidakleluasaan untuk tabel `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_tx_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tx_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tx_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Ketidakleluasaan untuk tabel `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD CONSTRAINT `fk_ti_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_ti_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `transaction_payments`
--
ALTER TABLE `transaction_payments`
  ADD CONSTRAINT `fk_tp_cash` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tp_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `fk_users_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL;
SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
