const createWorker = require('./createWorker');
const auditJob = require('../jobs/auditJob');
module.exports = createWorker('audit', auditJob.run, { concurrency: 10 });
