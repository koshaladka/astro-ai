import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
function module(path, names, mocks) {
  let source=readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/^import[\s\S]*?;\n/gm,'');
  source=stripTypeScriptTypes(source).replace(/^export /gm,'');
  return vm.runInNewContext(source+'\n;({'+names.join(',')+'})', {Date,process,TextEncoder,...mocks});
}
const lean = value => ({lean: async()=>value});
const connectDb = async()=>{};
const chart = (mocks={}) => module('lib/services/chart-pipeline.ts',['getChartById','deleteChart','clearChartChat','askChartQuestion'],{connectDb,...mocks});
const result = { _id:'chart', clientId:{userId:'owner',birthInput:{}},requestId:{}, status:'interpreted', messages:[],messagesVersion:0 };
test('sessions emit only userId and accept legacy claims without returning contact data',async()=>{
  let claims;class SignJWT { constructor(value){claims=value;} setProtectedHeader(){return this;} setIssuedAt(){return this;} setExpirationTime(){return this;} sign(){return 'signed';} }
  const api=module('lib/auth/session.ts',['createSessionToken','verifySessionToken'],{SignJWT,jwtVerify:async()=>({payload:{userId:'a'.repeat(24),email:'private@example.com',name:'Name'}})});
  process.env.AUTH_SECRET='test-test-test-test';
  await api.createSessionToken({userId:'a'.repeat(24),email:'private@example.com',name:'Name'});
  assert.deepEqual(JSON.parse(JSON.stringify(claims)),{userId:'a'.repeat(24)});
  assert.deepEqual(JSON.parse(JSON.stringify(await api.verifySessionToken('old'))),{userId:'a'.repeat(24)});
});
test('foreign, missing-owner and deleting charts are denied',async()=>{
  for(const entry of [{...result,clientId:{userId:'other'}},{...result,clientId:null},{...result,deleting:true}]){
    assert.equal(await chart({ChartResult:{findById:()=>({populate(){return this},lean:async()=>entry})}}).getChartById('chart','owner'),null);
  }
});
test('chart deletion marks it unavailable then removes overlays before parent records',async()=>{
  const calls=[];
  const api=chart({ChartResult:{findById:()=>lean(result),updateOne:async()=>calls.push('mark'),deleteOne:async()=>calls.push('result')}, Client:{findById:()=>lean({userId:'owner'}),deleteOne:async()=>calls.push('client')},Overlay:{deleteMany:async filter=>{assert.equal(filter.userId,'owner');assert.equal(filter.natalChartId,'chart');calls.push('overlays')}},ChartRequest:{deleteOne:async()=>calls.push('request')}});
  assert.equal(await api.deleteChart('chart','owner'),true);
  assert.deepEqual(calls,['mark','overlays','result','request','client']);
});
test('foreign chart cannot be deleted',async()=>{
 const api=chart({ChartResult:{findById:()=>lean(result)},Client:{findById:()=>lean({userId:'other'})}});
 assert.equal(await api.deleteChart('chart','owner'),false);
});
test('clearing natal chat increments revision and preserves interpretation',async()=>{
 let update;
 const api=chart({ChartResult:{findById:()=>({populate(){return this},lean:async()=>result}),updateOne:async(f,u)=>{update=u;return {matchedCount:1}}}});
 assert.equal(await api.clearChartChat('chart','owner'),true);
 assert.deepEqual(JSON.parse(JSON.stringify(update)),{$set:{messages:[]},$inc:{messagesVersion:1}});
});
test('in-flight natal AI response cannot append after revision changed',async()=>{
 let filter;
 const api=chart({ChartResult:{findById:()=>({populate(){return this},lean:async()=>result}),updateOne:async(f)=>{filter=f;return {matchedCount:0}}},askAboutChart:async()=> 'answer'});
 await assert.rejects(()=>api.askChartQuestion('chart','owner','question'),/История удалена/);
 assert.equal(filter.deleting.$ne,true);assert.equal(filter.$or[0].messagesVersion,0);
});
const schema=new Proxy(()=>schema,{get:(_,p)=>p==='parse'?(x=>x):()=>schema});
class OverlayError extends Error {constructor(message,status=400){super(message);this.status=status;}}
function overlay(mocks){return module('lib/services/overlay-service.ts',['clearOverlayChat','createOverlay','getOverlay'],{connectDb,z:{string:()=>schema,object:()=>schema},randomUUID:()=> 'lease',OverlayError,Eclipse:{init:async()=>{}},...mocks});}
test('overlay clear wipes current and archived chats without changing calculations or interpretation',async()=>{
 let update;
 const rec={_id:'overlay',natal:{chartId:'chart',label:'private birth data',birthInput:{date:'private'},positions:[],houses:[]},eclipse:{},aspects:[],messages:[1],interpretation:'keep',createdAt:new Date(),archivedContexts:[{interpretation:'archive',messages:[2]}]};
 const api=overlay({currentOverlayContext:r=>r,Overlay:{init:async()=>{},findOneAndUpdate:()=>lean(rec),updateOne:async(f,u)=>{if(u.$set)update=u},findOne:()=>lean(rec)}});
 const view=await api.clearOverlayChat('overlay','owner');
 assert.equal(update.$set.messages.length,0);assert.equal(update.$set.archivedContexts[0].messages.length,0);
 assert.equal(update.$set.archivedContexts[0].interpretation,'archive');assert.equal(update.$unset['previousContext.messages'],1);
 assert.equal(view.interpretation,'keep');assert.equal('birthInput' in view.natal,false);assert.equal(view.natal.label.includes('private'),false);
});
test('overlay clear rejects missing/foreign records and active AI leases',async()=>{
 for(const exists of [false,true]){
  const api=overlay({Overlay:{init:async()=>{},findOneAndUpdate:()=>lean(null),exists:async()=>exists}});
  await assert.rejects(()=>api.clearOverlayChat('overlay','owner'),e=>e.status===(exists?409:404));
 }
});
test('new overlay snapshots retain positions but no birth input or identifying label',async()=>{
 let created;
 const positions=[{id:'Sun',longitude:10}];
 const event={fetchStatus:'ready',positions,type:'solar-total',maximumAt:new Date(),sourceUrl:'https://example.com'};
 const api=overlay({CALCULATION_VERSION:'current',extractPositions:()=>positions,calculateEclipseAspects:()=>[],currentOverlayContext:r=>r,
 Eclipse:{init:async()=>{},findById:()=>lean(event)},Client:{find:()=>({select(){return this},lean:async()=>[{_id:'client',birthInput:{date:'private'}}]})},ChartResult:{findOne:()=>lean({clientId:'client',planets:[],housesDisplay:[]}),exists:async()=>true},
 Overlay:{init:async()=>{},findOne:()=>({sort(){return this},lean:async()=>null}),create:async data=>{created=data;return {...data,_id:'overlay',createdAt:new Date()}}}});
 await api.createOverlay({natalChartId:'a'.repeat(24),eclipseId:'b'.repeat(24)},'owner');
 assert.equal('birthInput' in created.natal,false);assert.equal(created.natal.label.includes('private'),false);assert.equal(created.natal.positions,positions);
});
