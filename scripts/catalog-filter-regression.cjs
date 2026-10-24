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
 return calls[0];
}
(async()=>{
 const out=await queryFor({available:'false',limit:12,offset:24});
 assert.match(out.sql,/p\.stock<=0/);assert.match(out.sql,/LIMIT 12 OFFSET 24/);
 const available=await queryFor({available:'true'});assert.match(available.sql,/p\.stock>0/);
 const all=await queryFor({});assert.doesNotMatch(all.sql,/p\.stock[><]/);
 console.log('PASS: out-of-stock filtering is applied before pagination; existing available/all behaviour retained.');
})().catch(e=>{console.error(e);process.exitCode=1;});
