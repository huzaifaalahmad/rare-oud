const vm=require('node:vm');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../backend/repositories/productRepository.js'),'utf8');
async function queryFor(query){
 const calls=[];
 const context={require:()=>({query:async(sql,params)=>{calls.push({sql,params});return /COUNT\(\*\)/.test(sql)?[{total:0}]:[];}}),module:{exports:{}}};
 vm.runInNewContext(source,context);
 await context.module.exports.listProducts(query);
 return { ...calls[0], count: calls[1] };
}
(async()=>{
 const out=await queryFor({available:'false',limit:12,offset:24});
 assert.match(out.sql,/p\.stock<=0/);assert.match(out.sql,/LIMIT 12 OFFSET 24/);
 const available=await queryFor({available:'true'});assert.match(available.sql,/p\.stock>0/);
 const all=await queryFor({});assert.doesNotMatch(all.sql,/p\.stock[><]/);
 const ouds=await queryFor({kind:'oud',category:'rare',limit:12,offset:12});
 assert.match(ouds.sql,/c\.slug<>'accessories'/);assert.match(ouds.count.sql,/c\.slug<>'accessories'/);
 assert.match(ouds.sql,/c\.slug=:category/);assert.equal(ouds.params.category,'rare');assert.match(ouds.sql,/LIMIT 12 OFFSET 12/);
 const accessories=await queryFor({kind:'accessory'});assert.match(accessories.sql,/c\.slug='accessories'/);assert.match(accessories.count.sql,/c\.slug='accessories'/);
 console.log('PASS: collection boundaries apply to rows and counts before pagination; out-of-stock filtering is applied before pagination; existing available/all behaviour retained.');
})().catch(e=>{console.error(e);process.exitCode=1;});
