const { createQueue } = require('./baseQueue');
module.exports = createQueue('audit', { defaultJobOptions: { priority: 5 } });
