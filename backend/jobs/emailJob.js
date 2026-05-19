const emailService = require('../services/emailService');

async function run(job) {
  const { to, subject, html, text } = job.data;
  if (!to || !subject || (!html && !text)) throw new Error('Invalid email payload');
  return emailService.send({ to, subject, html, text });
}
module.exports = { run };
