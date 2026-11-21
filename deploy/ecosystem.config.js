const path = require('path');

const root = path.resolve(__dirname, '..');
const logs = path.join(root, 'logs');

module.exports = {
  apps: [
    {
      name: 'mwaminifu-api',
      cwd: path.join(root, 'backend'),
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '5000' },
      max_memory_restart: '600M',
      kill_timeout: 20000,
      time: true,
      merge_logs: true,
      out_file: path.join(logs, 'api.out.log'),
      error_file: path.join(logs, 'api.err.log'),
    },
    {
      name: 'mwaminifu-web',
      cwd: path.join(root, 'frontend-mwaminifu'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '3000' },
      max_memory_restart: '800M',
      time: true,
      merge_logs: true,
      out_file: path.join(logs, 'web.out.log'),
      error_file: path.join(logs, 'web.err.log'),
    },
  ],
};
