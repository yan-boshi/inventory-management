# Bug 清单

## 🔴 严重 Bug（功能失效或崩溃）

| # | 模块 | 问题 | 位置 |
|---|------|------|------|
| 1 | 供应商 | `getSupplierById` 解构错误 `const { id } = req.params.id`，导致按ID查询永远失败 | `server/controllers/supplierController.js:46` |
| 2 | 认证 | `getCurrentUser` 使用 `req.user.userId` 但数据库行中字段是 `user_id`，查询返回 undefined | `server/controllers/authController.js:106` |
| 3 | 入库单 | 查询参数 `productName` 映射到 `customer_name`、`productCode` 映射到 `purchase_order_number`，搜索功能完全错误 | `server/controllers/warehousingOrderController.js:22-30` |
| 4 | 销售订单 | 前端发送 `orderNumber`，后端接收 `quotationNumber`，订单号搜索功能无效 | `server/controllers/salesOrderController.js:10,17` |
| 5 | 出库单 | 创建出库单时不校验库存是否充足，库存可能变为负数 | `server/controllers/deliveryOrderController.js:125-131` |
| 6 | 采购订单 | `createPurchaseOrder` 未解构 `purchase_person`，该字段创建时丢失 | `server/controllers/purchaseOrderController.js:85` |
| 7 | 采购订单 | `updatePurchaseOrder` 未解构 `purchase_person`，该字段更新时丢失 | `server/controllers/purchaseOrderController.js:116` |
| 8 | 入库单/出库单 | 创建订单时已写入数据库后校验失败返回400，但不会回滚，导致数据不一致 | `warehousingOrderController.js:169`, `deliveryOrderController.js:156` |
| 9 | TypeScript | `PurchaseOrderDetail.vue` 访问 `PurchaseOrder` 类型上不存在的字段（15个错误） | `src/components/PurchaseOrderDetail.vue` |
| 10 | TypeScript | `PurchaseOrderForm.vue` API 返回值类型不匹配，`.map` 方法不存在（10+个错误） | `src/components/PurchaseOrderForm.vue` |
| 11 | TypeScript | `SalesOrderForm.vue` 多处类型错误 | `src/components/SalesOrderForm.vue` |
| 12 | TypeScript | `QuotationForm.vue` 多处类型错误 | `src/components/QuotationForm.vue` |

## 🟡 中等问题（数据不一致或逻辑错误）

| # | 模块 | 问题 | 位置 |
|---|------|------|------|
| 13 | 认证 | `AuthResponse.user.contact` 前端类型有 `contact` 字段，但后端返回的是 `phone`/`email` | `src/types/index.ts:499`, `src/api/auth.ts:8` |
| 14 | 产品 | `Product.create` 模型忽略了 `stock` 字段，创建产品时传入的库存被丢弃 | `server/models/Product.js:17-28` |
| 15 | 入库单/出库单 | 库存更新与订单操作未在同一事务中，中间步骤失败不会回滚 | `warehousingOrderController.js`, `deliveryOrderController.js` |
| 16 | 采购订单/销售订单 | 退货操作(status=4)不回退已出库/入库的库存 | `salesOrderController.js:175`, `purchaseOrderController.js` |
| 17 | 入库单/出库单 | 更新订单时如果修改了商品明细，不会同步更新产品库存 | `warehousingOrderController.js:220`, `deliveryOrderController.js:207` |
| 18 | 进销存报表 | 期末库存直接读取 `products.stock` 当前值，不是时点快照，报表数据不准确 | `server/controllers/inventoryReportController.js:72` |
| 19 | 前端类型 | `PurchaseOrder.status` 和 `SalesOrder.status` 定义为 `1\|2`，实际应为 `1\|2\|3\|4` | `src/types/index.ts:298,411` |
| 20 | 销售订单 | `startDate`/`endDate` 查询参数后端不支持，日期范围搜索无效 | `server/controllers/salesOrderController.js:12` |
| 21 | 出库单 | `UndeliveredSalesOrder` 前端类型缺少 `tax_included_amount`，多出不存在的 `customer_address` | `src/types/index.ts:705-714` |
| 22 | 认证 | 注册接口缺少 `phone` 和 `email` 的必填验证，数据库定义为 NOT NULL | `server/controllers/authController.js:10-31` |
| 23 | 数据库 | `products.stock` 定义为 `DECIMAL(15)` 无小数位，但代码中用 `parseFloat` 和 `.toFixed(2)` | `server/init.sql:87` |

## 🟠 安全问题

| # | 模块 | 问题 | 位置 |
|---|------|------|------|
| 24 | 数据库 | 硬编码数据库密码 `'abc1234!'`，环境变量配置被注释掉 | `server/config/database.js:19-29` |
| 25 | 认证 | JWT_SECRET 启动时打印到控制台，密钥泄露到日志 | `server/controllers/authController.js:7-8` |
| 26 | 认证 | `changePassword` 路由缺少权限控制，任何用户可修改任意用户密码 | `server/routes/userRoutes.js:19` |
| 27 | 认证 | JWT 密钥使用硬编码回退值，缺少 `.env` 时安全风险 | `server/controllers/authController.js:4` |
| 28 | 全局 | `Math.random()` 生成 UUID 不够安全，高并发可能重复 | `server/models/*.js` |

## 🔵 代码质量问题

| # | 模块 | 问题 | 位置 |
|---|------|------|------|
| 29 | 数据库 | `sales_orders` 表缺少 `sales_person` 字段但 Model 写入了该字段 | `server/init.sql`, `server/models/SalesOrder.js:81` |
| 30 | 数据库 | `purchase_orders` 表缺少 `purchase_person` 字段但 Model 写入了该字段 | `server/init.sql`, `server/models/PurchaseOrder.js:115` |
| 31 | 后端 | `constructor.pool` 访问数据库连接不可靠，应直接 import pool | `warehousingOrderController.js`, `deliveryOrderController.js` |
| 32 | 后端 | `BaseModel.create` 依赖对象属性顺序获取 UUID，设计脆弱 | `server/models/BaseModel.js:37` |
| 33 | 后端 | 大量遗留 `console.log` 调试语句未清理 | 多个 Controller 和 Model 文件 |
| 34 | 后端 | 缺少分页参数边界值验证，`pageSize=999999` 可获取全部数据 | 所有带分页的 Controller |
| 35 | 后端 | JSON 字段（items/expenses）缺少格式验证 | 多个 Controller |
| 36 | 后端 | `generateUUID()` 在每个 Model 中重复定义（8次） | `server/models/*.js` |
| 37 | 数据库 | `SET FOREIGN_KEY_CHECKS = 0` 但没有定义任何外键，设置无意义 | `server/init.sql:7,239` |

---

**总计：37个问题**，其中严重12个、中等11个、安全5个、代码质量9个。
