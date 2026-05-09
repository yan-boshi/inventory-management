# 库存管理系统

基于 Vue3 + TypeScript + Node.js + MySQL 的库存管理系统。

## 功能特性

- 销售订单管理
- 采购订单管理
- 客户管理
- 供应商管理
- 结算方式管理
- 产品管理
- 业务分类管理

## 技术栈

- 前端：Vue3 + Vite + TypeScript + SCSS + Ant Design Vue
- 后端：Node.js + Express + MySQL
- 容器化：Docker Compose

## 快速开始

### 1. 启动 MySQL 数据库

```bash
docker-compose up -d
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

前端：
```bash
npm run dev
```

后端：
```bash
npm run server:dev
```

## 项目结构

```
.
├── src/                # 前端源码
│   ├── api/           # API 接口
│   ├── assets/        # 静态资源
│   ├── components/    # 公共组件
│   ├── layouts/       # 布局组件
│   ├── router/        # 路由配置
│   ├── stores/        # 状态管理
│   ├── types/         # 类型定义
│   ├── utils/         # 工具函数
│   └── views/         # 页面组件
├── server/            # 后端源码
│   ├── config/        # 配置
│   ├── controllers/   # 控制器
│   ├── middleware/    # 中间件
│   ├── models/        # 数据模型
│   ├── routes/        # 路由
│   └── utils/         # 工具函数
└── .plan/             # 项目规划文档
```

## 开发规范

- ESLint：代码风格检查
- Prettier：代码格式化
- CSpell：拼写检查
- Vitest：单元测试

## 提交规范

遵循 Conventional Commits 规范：

- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建/工具相关
