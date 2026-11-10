module.exports = {
  apps: [
    {
      name: "hos-cms",
      cwd: "/var/www/hos-cms/current",
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      kill_timeout: 30000,
      listen_timeout: 15000,
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: "3000",
      },
    },
  ],
};
