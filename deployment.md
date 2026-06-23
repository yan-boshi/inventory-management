# 库存管理系统部署手册

## 目录

1. [环境要求](#1-环境要求)
2. [服务器准备](#2-服务器准备)
3. [数据库配置](#3-数据库配置)
4. [后端部署](#4-后端部署)
5. [前端部署](#5-前端部署)
6. [Nginx 配置](#6-nginx-配置)
7. [PM2 进程管理](#7-pm2-进程管理)
8. [SSL 配置（可选）](#8-ssl-配置可选)
9. [防火墙配置](#9-防火墙配置)
10. [常见问题排查](#10-常见问题排查)

---

## 1. 环境要求

### 服务器配置
- **操作系统**: Ubuntu 20.04/22.04 LTS 或 CentOS 7/8
- **CPU**: 2核以上
- **内存**: 4GB 以上
- **硬盘**: 50GB 以上
- **网络**: 公网 IP，开放 80/443 端口

### 软件依赖
| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18.0.0 | 推荐 20.x LTS |
| MySQL | >= 8.0 | 或 MariaDB 10.5+ |
| Nginx | >= 1.18 | 反向代理 |
| PM2 | >= 5.0 | Node.js 进程管理 |
| Git | >= 2.0 | 代码拉取 |

---

## 2. 服务器准备

### 2.1 更新系统

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2.2 安装 Node.js

```bash
# 使用 NodeSource 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version

# 配置 npm 镜像（可选，国内服务器推荐）
npm config set registry https://registry.npmmirror.com
```

### 2.3 安装 MySQL

```bash
# Ubuntu/Debian
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation
```

### 2.4 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.5 安装 PM2

```bash
sudo npm install -g pm2
```

### 2.6 安装 Git

```bash
sudo apt install git -y
```

---

## 3. 数据库配置

### 3.1 创建数据库和用户

```bash
# 登录 MySQL
sudo mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE inventory_management
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（替换 your_password 为强密码）
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'abc1234!';

-- 授权
GRANT ALL PRIVILEGES ON inventory_management.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 3.2 导入数据库结构

```bash
# 进入项目目录
cd /var/www/inventory-management

# 导入数据库结构
mysql -u admin -p inventory_management < server/init.sql
```

### 3.3 验证数据库

```bash
mysql -u admin -p inventory_management -e "SHOW TABLES;"
```

应该看到以下表：
```
+-----------------------------------+
| Tables_in_inventory_management    |
+-----------------------------------+
| business_categories               |
| customers                         |
| delivery_orders                   |
| payment_methods                   |
| products                          |
| purchase_orders                   |
| quotations                        |
| sales_orders                      |
| suppliers                         |
| users                             |
| warehousing_orders                |
+-----------------------------------+
```

---

## 4. 后端部署

### 4.1 拉取代码

```bash
# 创建项目目录
sudo mkdir -p /var/www
cd /var/www

# 克隆代码（替换为你的仓库地址）
git clone https://github.com/yan-boshi/inventory-management.git
cd inventory-management
```

### 4.2 安装依赖

```bash
# 安装后端依赖
npm install --production
```

### 4.3 配置环境变量

```bash
# 创建 .env 文件
nano server/.env
```

```env
# 服务器配置
PORT=3003
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=abc1234!
DB_NAME=inventory_management

# JWT 配置（必须修改为强密码）
JWT_SECRET=x7K9mP2nR8vQz1wB4fL6sYjD5cVhN0pXqEaTgWuZiSbFkMlJdHrOyC
JWT_EXPIRES_IN=24h
```

```bash
# 保存并退出 (Ctrl+X, Y, Enter)
```

### 4.4 测试后端启动

```bash
# 测试运行
node server/index.js

# 如果看到以下输出表示成功：
# Server running on port 3003

# 按 Ctrl+C 停止
```

---

## 5. 前端部署

### 5.1 配置 API 地址

```bash
# 创建前端环境变量文件
nano .env.production
```

```env
# API 地址（替换为你的服务器域名或 IP）
VITE_API_BASE_URL=https://47.115.77.82:3003/api
```

### 5.2 修改 Vite 配置

```bash
nano vite.config.ts
```

确保配置正确：

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
```

### 5.3 构建前端

```bash
# 安装所有依赖（包括开发依赖）
npm install

# 构建生产版本
npm run build

# 构建完成后，dist 目录包含所有静态文件
ls -la dist/
```

### 5.4 部署静态文件

```bash
# 复制到 Nginx 目录
sudo cp -r dist/* /var/www/html/inventory/

# 或者创建软链接
sudo mkdir -p /var/www/html/inventory
sudo cp -r /var/www/inventory-management/dist/* /var/www/html/inventory/

# 设置权限
sudo chown -R www-data:www-data /var/www/html/inventory
sudo chmod -R 755 /var/www/html/inventory
```

---

## 6. Nginx 配置

### 6.1 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/inventory
```

```nginx
server {
    listen 80;
    server_name 47.115.77.82;  # 替换为你的域名或 IP

    # 前端静态文件
    root /var/www/html/inventory;
    index index.html;

    # 前端路由支持（Vue Router history 模式）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 请求体大小限制
        client_max_body_size 10M;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 错误日志
    access_log /var/log/nginx/inventory_access.log;
    error_log /var/log/nginx/inventory_error.log;
}
```

### 6.2 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/inventory /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 7. PM2 进程管理

### 7.1 创建 PM2 配置文件

```bash
cd /var/www/inventory-management
nano ecosystem.config.cjs
```

```javascript
module.exports = {
  apps: [{
    name: 'inventory-api',
    script: 'server/index.js',
    cwd: '/var/www/inventory-management',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3003
    },
    env_file: 'server/.env',
    watch: false,
    max_memory_restart: '500M',
    error_file: '/var/log/pm2/inventory-error.log',
    out_file: '/var/log/pm2/inventory-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000
  }]
};
```

### 7.2 创建日志目录

```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 7.3 启动服务

```bash
# 启动
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status

# 查看日志
pm2 logs inventory-api

# 保存进程列表（开机自启）
pm2 save

# 设置开机自启
pm2 startup
# 按提示执行输出的命令
```

### 7.4 PM2 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs inventory-api

# 重启服务
pm2 restart inventory-api

# 停止服务
pm2 stop inventory-api

# 查看监控
pm2 monit

# 重载服务（0秒停机）
pm2 reload inventory-api
```

---

## 8. SSL 配置（可选）

### 8.1 使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run

# 设置自动续期
sudo crontab -e
# 添加以下行
0 0 1 * * /usr/bin/certbot renew --quiet
```

### 8.2 手动配置 SSL

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # SSL 优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 其他配置同上...
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 9. 防火墙配置

### 9.1 UFW（Ubuntu）

```bash
# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP
sudo ufw allow 80/tcp

# 允许 HTTPS
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 9.2 firewalld（CentOS）

```bash
# 允许 HTTP
sudo firewall-cmd --permanent --add-service=http

# 允许 HTTPS
sudo firewall-cmd --permanent --add-service=https

# 重载
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

---

## 10. 常见问题排查

### 10.1 数据库连接失败

```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 检查用户权限
mysql -u root -p -e "SELECT user, host FROM mysql.user;"

# 测试连接
mysql -u inventory_user -p -h localhost inventory_management
```

### 10.2 后端启动失败

```bash
# 查看 PM2 日志
pm2 logs inventory-api --lines 50

# 手动测试启动
cd /var/www/inventory-management
node server/index.js
```

### 10.3 前端 404 错误

```bash
# 检查 Nginx 配置
sudo nginx -t

# 检查文件权限
ls -la /var/www/html/inventory/

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/inventory_error.log
```

### 10.4 API 请求失败

```bash
# 测试后端 API
curl http://localhost:3003/health

# 测试 Nginx 代理
curl http://your-domain.com/health

# 查看 Nginx 访问日志
sudo tail -f /var/log/nginx/inventory_access.log
```

### 10.5 权限问题

```bash
# 修复文件权限
sudo chown -R www-data:www-data /var/www/html/inventory
sudo chmod -R 755 /var/www/html/inventory

# 修复项目权限
sudo chown -R $USER:$USER /var/www/inventory-management
```

### 10.6 内存不足

```bash
# 查看内存使用
free -h

# 查看 PM2 内存使用
pm2 status

# 调整 PM2 内存限制
nano ecosystem.config.cjs
# 修改 max_memory_restart: '1G'
```

---

## 附录 A：部署检查清单

- [ ] Node.js 已安装（v18+）
- [ ] MySQL 已安装并运行
- [ ] Nginx 已安装并运行
- [ ] PM2 已安装
- [ ] 数据库已创建并导入结构
- [ ] 环境变量已配置（server/.env）
- [ ] 后端依赖已安装
- [ ] 前端已构建（npm run build）
- [ ] 静态文件已部署到 Nginx 目录
- [ ] Nginx 配置已测试并重载
- [ ] PM2 服务已启动
- [ ] 防火墙已配置
- [ ] SSL 证书已配置（可选）
- [ ] 开机自启已设置

## 附录 B：更新部署流程

```bash
# 1. 进入项目目录
cd /var/www/inventory-management

# 2. 拉取最新代码
git pull origin main

# 3. 安装新依赖（如有）
npm install --production

# 4. 重新构建前端
npm install
npm run build

# 5. 部署前端
sudo cp -r dist/* /var/www/html/inventory/

# 6. 重启后端
pm2 restart inventory-api

# 7. 验证服务
curl http://localhost:3003/health
```

## 附录 C：备份策略

### 数据库备份

```bash
# 创建备份脚本
nano /home/user/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -u inventory_user -p'your_password' inventory_management > $BACKUP_DIR/inventory_$DATE.sql

# 保留最近 30 天的备份
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
```

```bash
# 设置执行权限
chmod +x /home/user/backup.sh

# 添加定时任务
crontab -e
# 每天凌晨 2 点备份
0 2 * * * /home/user/backup.sh
```

---

**部署完成！**

访问地址：http://your-domain.com
默认管理员账号：admin / admin123（请立即修改密码）
