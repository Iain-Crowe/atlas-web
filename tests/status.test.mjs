import test from 'node:test';
import assert from 'node:assert/strict';
import { retainReadings } from '../src/utils/retainReadings.ts';
import { maintenancePresentation } from '../src/utils/maintenanceStatus.ts';

test('failed poll retains last successful reading without hiding failure', () => {
  const previous = { cpu: { state: 'ready', updated_at: 100, value: 42 } };
  const incoming = { cpu: { state: 'error', updated_at: null, value: null } };
  assert.deepEqual(retainReadings(previous, incoming), {cpu:{state:'error',updated_at:100,value:42}});
  assert.equal(previous.cpu.state,'ready');
  assert.equal(incoming.cpu.value,null);
});
test('successful poll replaces retained values', () => {
  const incoming={cpu:{state:'ready',updated_at:200,value:7}};
  assert.deepEqual(retainReadings({cpu:{state:'error',updated_at:100,value:42}},incoming),incoming);
});
test('invalid old timestamp does not become a retained successful reading', () => {
  const incoming={cpu:{state:'error',updated_at:null,value:null}};
  assert.deepEqual(retainReadings({cpu:{state:'ready',updated_at:NaN,value:42}},incoming),incoming);
  assert.deepEqual(retainReadings(null,incoming),incoming);
});
const now=1700000000;
const base={version:1,node:'atlas',enabled:true,simulation:false,phase:'idle',updated_at:new Date(now*1000).toISOString(),scheduled_for:null,message:'',pending_updates:null,reboot_required:null};
test('missing and unavailable maintenance are distinct',()=>{
 assert.equal(maintenancePresentation(null,false,now).label,'Not configured');
 assert.equal(maintenancePresentation(base,true,now).label,'Status unavailable');
});
test('stale or invalid maintenance data cannot look current',()=>{
 for(const updated_at of [new Date((now-181)*1000).toISOString(),'bad timestamp',new Date((now+61)*1000).toISOString()]){
  assert.equal(maintenancePresentation({...base,updated_at},false,now).stale,true);
 }
});
test('simulation does not look like actual maintenance',()=>{
 assert.deepEqual(maintenancePresentation({...base,simulation:true,phase:'running'},false,now),{label:'Test mode',tone:'neutral',stale:false});
});
test('maintenance starting within fifteen minutes is distinguished from later schedules',()=>{
 assert.equal(maintenancePresentation({...base,phase:'scheduled',scheduled_for:new Date((now+900)*1000).toISOString()},false,now).label,'Starting soon');
 assert.equal(maintenancePresentation({...base,phase:'scheduled',scheduled_for:new Date((now+901)*1000).toISOString()},false,now).label,'Scheduled');
});
test('failed maintenance remains actionable and completed maintenance is explicit',()=>{
 assert.equal(maintenancePresentation({...base,phase:'failed'},false,now).tone,'danger');
 assert.equal(maintenancePresentation({...base,phase:'complete'},false,now).label,'Complete');
});
