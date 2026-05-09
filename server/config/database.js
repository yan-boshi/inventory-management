import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT || 3306),
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || 'password',
//   database: process.env.DB_NAME || 'inventory_management',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   enableKeepAlive: true,
//   keepAliveInitialDelay: 0
// })

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'abc1234!',
  database: 'inventory_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
})

pool.on('connection', (connection) => {
  console.log('MySQL pool created a new connection')
})

pool.on('acquire', (connection) => {
  console.log('Connection %d acquired', connection.threadId)
})

pool.on('release', (connection) => {
  console.log('Connection %d released', connection.threadId)
})

pool.on('enqueue', () => {
  console.log('Waiting for available connection slot')
})

export default pool
