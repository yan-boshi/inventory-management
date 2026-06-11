-- Inventory Management System Database Schema

CREATE DATABASE IF NOT EXISTS inventory_management DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventory_management;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS quotations;
DROP TABLE IF EXISTS sales_orders;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS business_categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS warehousing_orders;
DROP TABLE IF EXISTS delivery_orders;

-- Quotations Table
CREATE TABLE quotations (
  quotation_id VARCHAR(36) PRIMARY KEY,
  quotation_number VARCHAR(50) UNIQUE NOT NULL COMMENT '报价编号 XSD-Q日期+递增数字',
  customer_name VARCHAR(255) NOT NULL,
  customer_code VARCHAR(50) NOT NULL,
  quotation_items TEXT COMMENT '报价内容JSON字符串',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('1', '2', '3', '4') NOT NULL DEFAULT '1' COMMENT '1:报价中, 2:已全部销售, 3:已部分销售, 4:已取消',
  validity_period VARCHAR(100) DEFAULT '自报价之日起10个工作日' COMMENT '报价有效期',
  delivery_method VARCHAR(50) DEFAULT '送货上门' COMMENT '送货方式',
  tax_rate DECIMAL(5, 2) DEFAULT 13.00 COMMENT '税率',
  tax_included_amount DECIMAL(15, 2) DEFAULT 0.00 COMMENT '含税总价',
  currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  remarks TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_quotation_number (quotation_number),
  INDEX idx_customer_name (customer_name),
  INDEX idx_customer_code (customer_code),
  INDEX idx_quotation_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users Table
CREATE TABLE users (
  user_id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'advanced', 'normal') NOT NULL DEFAULT 'normal',
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Business Categories Table
CREATE TABLE business_categories (
  business_category_id VARCHAR(36) PRIMARY KEY,
  business_category_name VARCHAR(100) UNIQUE NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (business_category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Methods Table
CREATE TABLE payment_methods (
  payment_method_id VARCHAR(36) PRIMARY KEY,
  payment_method_name VARCHAR(100) UNIQUE NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (payment_method_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products Table
CREATE TABLE products (
  product_id VARCHAR(36) PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  model VARCHAR(100),
  description VARCHAR(500),
  product_code VARCHAR(50) UNIQUE NOT NULL,
  unit VARCHAR(20),
  stock DECIMAL(15, 2) DEFAULT 0 COMMENT '库存数量',
  tax_included_price DECIMAL(10, 4) DEFAULT NULL COMMENT '含税单价（移动平均法）',
  tax_excluded_price DECIMAL(10, 4) DEFAULT NULL COMMENT '未税单价（移动平均法）',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_name (product_name),
  INDEX idx_product_code (product_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers Table
CREATE TABLE customers (
  customer_id VARCHAR(36) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_code VARCHAR(50) UNIQUE NOT NULL,
  customer_tax_number VARCHAR(50),
  register_address VARCHAR(500),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(100),
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  bank_code VARCHAR(50),
  contact VARCHAR(50),
  contact_phone VARCHAR(50),
  receiver VARCHAR(50),
  receiver_address VARCHAR(500),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_name (customer_name),
  INDEX idx_customer_code (customer_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suppliers Table
CREATE TABLE suppliers (
  supplier_id VARCHAR(36) PRIMARY KEY,
  supplier_name VARCHAR(255) NOT NULL,
  supplier_code VARCHAR(50) UNIQUE NOT NULL,
  supplier_tax_number VARCHAR(50),
  register_address VARCHAR(500),
  supplier_phone VARCHAR(50),
  supplier_email VARCHAR(100),
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  bank_code VARCHAR(50),
  contact VARCHAR(50),
  contact_phone VARCHAR(50),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supplier_name (supplier_name),
  INDEX idx_supplier_code (supplier_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sales Orders Table
CREATE TABLE sales_orders (
  sales_order_id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '默认单据编号 XSD-S日期+递增数字',
  contract_number VARCHAR(100) COMMENT '销售合同编号',
  customer_name VARCHAR(255) NOT NULL,
  customer_code VARCHAR(50) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  sales_items TEXT COMMENT '销售商品内容JSON字符串',
  sales_date DATE COMMENT '销售日期',
  status ENUM('1', '2', '3', '4') NOT NULL DEFAULT '1' COMMENT '1:未出库, 2:已全部出库, 3:已部分出库, 4:退货',
  tax_included_amount DECIMAL(15, 2) DEFAULT 0.00 COMMENT '含税总价',
  currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  exchange_rate DECIMAL(10, 4) DEFAULT 1.0000 COMMENT '汇率',
  delivery_date DATE COMMENT '发货日期',
  remarks TEXT,
  expenses TEXT COMMENT '销售费用登记JSON字符串',
  sales_person VARCHAR(100) DEFAULT NULL COMMENT '销售人员',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contract_number (contract_number),
  INDEX idx_customer_name (customer_name),
  INDEX idx_customer_code (customer_code),
  INDEX idx_sales_date (sales_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase Orders Table
CREATE TABLE purchase_orders (
  purchase_order_id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '默认单据编号 XSD-P日期+5位随机数字',
  contract_number VARCHAR(100) COMMENT '采购合同编号',
  supplier_name VARCHAR(255) NOT NULL,
  supplier_code VARCHAR(50) NOT NULL,
  purchase_items TEXT COMMENT '采购商品内容JSON字符串',
  currency VARCHAR(10) DEFAULT 'CNY',
  exchange_rate DECIMAL(10, 4) DEFAULT 1.0000,
  delivery_date DATE,
  arrival_date DATE,
  status ENUM('1', '2', '3', '4') NOT NULL DEFAULT '1' COMMENT '1:未入库, 2:已全部入库, 3:已部分入库, 4:退货',
  remarks TEXT,
  expenses TEXT COMMENT '采购费用登记JSON字符串',
  purchase_person VARCHAR(100) DEFAULT NULL COMMENT '采购人员',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contract_number (contract_number),
  INDEX idx_supplier_name (supplier_name),
  INDEX idx_supplier_code (supplier_code),
  INDEX idx_order_number (order_number),
  INDEX idx_purchase_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Warehousing Orders Table
CREATE TABLE warehousing_orders (
  warehousing_order_id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '入库单编号 XSD-W-日期+5位递增数字',
  purchase_order_number VARCHAR(100) COMMENT '采购订单编号',
  warehousing_items TEXT COMMENT '入库商品内容JSON字符串',
  warehousing_time DATETIME COMMENT '入库时间',
  customer_name VARCHAR(255) COMMENT '客户名称',
  customer_address VARCHAR(500) COMMENT '客户地址',
  total_amount DECIMAL(15, 2) DEFAULT 0.00 COMMENT '总计',
  currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  warehousing_person VARCHAR(100) COMMENT '入库人',
  contact_phone VARCHAR(50) COMMENT '联系电话',
  remarks TEXT COMMENT '备注',
  expenses TEXT COMMENT '入库费用登记JSON字符串',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_number (order_number),
  INDEX idx_purchase_order_number (purchase_order_number),
  INDEX idx_warehousing_time (warehousing_time),
  INDEX idx_customer_name (customer_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Delivery Orders Table
CREATE TABLE delivery_orders (
  delivery_order_id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE COMMENT '出库单编号 XSD-O-日期+5位递增数字',
  sales_order_number VARCHAR(50) DEFAULT NULL COMMENT '销售订单编号',
  customer_name VARCHAR(200) NOT NULL COMMENT '客户名称',
  customer_address VARCHAR(500) DEFAULT NULL COMMENT '客户地址',
  delivery_items TEXT COMMENT '出库商品内容(JSON字符串)',
  delivery_time DATETIME COMMENT '出库时间',
  delivery_date DATETIME DEFAULT NULL COMMENT '送货日期',
  currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  total_amount DECIMAL(15, 2) DEFAULT 0.00 COMMENT '总计金额',
  expenses TEXT COMMENT '出库费用登记(JSON字符串)',
  delivery_person VARCHAR(100) DEFAULT NULL COMMENT '发货人',
  contact_phone VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
  remarks TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_number (order_number),
  INDEX idx_sales_order_number (sales_order_number),
  INDEX idx_customer_name (customer_name),
  INDEX idx_delivery_time (delivery_time),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: admin123 - should be changed in production)
INSERT INTO users (user_id, username, password, role, phone, email, remarks)
VALUES (
  UUID(),
  'admin',
  '$2b$10$mtlhK8nN6rXHW7qs0Kt.R.m05FEryp1wVHfi4mS8amy9bgqOzOUiC',
  'admin',
  '15384280348',
  '1327764469@qq.com',
  'System Administrator'
);