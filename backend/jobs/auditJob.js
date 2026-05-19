const db = require('../config/database');
async function run(job) {
  const p = job.data;
  await db.query(
    'INSERT INTO admin_audit_logs (admin_id,action,entity_type,entity_id,ip_address,user_agent,details) VALUES (:admin_id,:action,:entity_type,:entity_id,:ip,:ua,:details)',
    p
  );
  await db.query(
    'INSERT INTO audit_logs (admin_id,action,target_type,target_id,details) VALUES (:admin_id,:action,:target_type,:target_id,:details)',
    p
  ).catch(() => {});
}
module.exports = { run };
