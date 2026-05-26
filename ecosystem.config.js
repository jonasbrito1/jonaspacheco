module.exports = {
  apps: [
    {
      name: 'hub-backend',
      cwd: '/var/www/jonaspacheco/current/hub/backend',
      script: 'src/index.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_file: '/var/www/jonaspacheco/shared/hub-backend.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3200,
      },
    },
    {
      name: 'licita',
      cwd: '/var/www/jonaspacheco/current/licita',
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      env_file: '/var/www/jonaspacheco/shared/licita.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
      },
    },
  ],
}
