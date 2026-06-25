DROP TABLE IF EXISTS users;
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
INSERT INTO users (user_id, username, password, role, phone, email, remarks)
VALUES (
  UUID(),
  'admin',
  '$2b$10$mtlhK8nN6rXHW7qs0Kt.R.m05FEryp1wVHfi4mS8amy9bgqOzOUiC',
  'admin',
  '13800138000',
  'admin@company.com',
  'System Administrator'
);