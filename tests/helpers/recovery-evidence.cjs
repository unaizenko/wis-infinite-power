'use strict';
// Deliberately runtime-independent: the same assertions execute in a real Worker.
function assertRecoveryEvidence(e){const near=(a,b)=>Math.abs(a-b)<=1e-6,fail=m=>{throw Error('Recovery evidence: '+m);};if(e.pending!==0)fail('remaining debt');if(!near(e.elapsed,e.requested))fail('elapsed time not installed');if(!near(e.confirmed,e.requested))fail('settlement confirmation missing');if(e.requested>0&&!(e.checkpoints>0))fail('durable checkpoint not executed');if(e.requested>0&&e.phase!=='completed')fail('runner did not complete');return true;}
module.exports={assertRecoveryEvidence};
