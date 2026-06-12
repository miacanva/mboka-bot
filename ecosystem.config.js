module.exports = {
  apps: [{
    name: 'mboka-bot',
    script: 'index.js',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
