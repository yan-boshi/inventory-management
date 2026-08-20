#!/bin/bash

# ========== 配置区（改成你自己的） ==========
SERVER="root@47.115.77.82"
REMOTE_PATH="/var/www/html/inventory"
# ==========================================

echo "🔨 开始构建..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ 构建失败！"
  exit 1
fi

echo "✅ 构建成功，开始上传..."
scp -r ./dist/ root@47.115.77.82:/var/www/inventory-management/dist

if [ $? -eq 0 ]; then
  echo "🎉 上传成功！"
else
  echo "❌ 上传失败！"
  exit 1
fi
