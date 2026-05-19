const { createQueue } = require('./baseQueue');
module.exports = createQueue('notification', { defaultJobOptions: { priority: 4 } });
