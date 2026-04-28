-- Minimal MySQL schema for warehouse management app

CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  status ENUM('Active', 'Suspended') NOT NULL DEFAULT 'Active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE inventory_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  reorder_point INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE vendors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  contact VARCHAR(255),
  supplied_items TEXT
);

CREATE TABLE purchase_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  po_ref VARCHAR(64) NOT NULL UNIQUE,
  order_date DATE NOT NULL,
  item_code VARCHAR(64) NOT NULL,
  qty INT NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL
);

CREATE TABLE receiving_docs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  po_ref VARCHAR(64) NOT NULL,
  received_qty INT NOT NULL,
  receiver VARCHAR(64) NOT NULL,
  received_date DATE NOT NULL
);

CREATE TABLE issue_docs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  issue_no VARCHAR(64) NOT NULL UNIQUE,
  item_code VARCHAR(64) NOT NULL,
  qty INT NOT NULL,
  reason VARCHAR(255),
  issue_date DATE NOT NULL
);

CREATE TABLE delivery_docs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  issue_no VARCHAR(64) NOT NULL,
  receiver VARCHAR(255),
  delivery_date DATE NOT NULL,
  staff VARCHAR(64) NOT NULL
);
