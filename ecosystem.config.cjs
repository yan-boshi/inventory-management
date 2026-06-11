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
