const { createQueue } = require('./baseQueue');
module.exports = createQueue('email', { defaultJobOptions: { priority: 3 } });
