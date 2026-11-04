// 环境变量预加载：必须在所有读取 process.env 的模块之前 import
//
// 背景：ESM 的 import 会先于模块体执行，原先 dotenv.config() 写在 index.js 的
// import 之后，导致 auth.js 等模块读 JWT_SECRET 时 .env 还没加载、只能吃内置回退值。
// 本模块被各入口最先 import，保证 .env 先落地。
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url)) // .../server

// 先读 server/.env（部署布局），再读项目根 .env 兜底；dotenv 不覆盖已有变量，先到先得
dotenv.config({ path: path.join(here, '.env') })
dotenv.config({ path: path.join(here, '..', '.env') })
