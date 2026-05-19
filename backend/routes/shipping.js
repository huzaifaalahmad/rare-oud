const r=require('express').Router(); const c=require('../controllers/shippingController'); const auth=require('../middleware/auth'); const {requirePermission}=require('../middleware/admin');
r.get('/',auth,requirePermission('settings.read'),c.list);
r.put('/zones',auth,requirePermission('settings.write'),c.saveZone);
r.delete('/zones/:id',auth,requirePermission('settings.write'),c.deleteZone);
r.put('/rates',auth,requirePermission('settings.write'),c.saveRate);
r.delete('/rates/:id',auth,requirePermission('settings.write'),c.deleteRate);
module.exports=r;
