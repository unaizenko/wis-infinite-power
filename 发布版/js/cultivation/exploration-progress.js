(function defineExplorationProgress(WIS) {
  'use strict';
  const B=WIS.Core.BigNum;
  const L=()=>WIS.Meta.TreasureLedger;
  const fail=message=>{throw new Error('探寻进度：'+message+'；本帧未提交，输入与时间保留');};
  // Local fixed-point precision grows with the number of digits in the
  // level/exponent. Its 40+ guard digits are spent on this formula chain only.
  // Each cumulative boundary deterministically selects its own precision, so
  // saving, cache eviction and splitting cannot change an earlier boundary.
  function abs(n){return n<0n?-n:n;}
  const precisionCache=new Map();
  function precision(integerDigits=1){
    const digits=Math.max(80,Math.ceil((integerDigits+40)/32)*32);
    if(digits>4096)fail('需求精度超过 4000 位等级的局部容量');
    if(precisionCache.has(digits))return precisionCache.get(digits);
    const DP=BigInt(digits),FP=10n**DP;
    const fixed=text=>{const t=parse(text),e=t.e+DP;if(abs(e)>8192n)fail('高精度常量超出范围');
      return e>=0n?t.c*10n**e:t.c/10n**(-e);};
    const logMantissa=x=>{const z=(x-FP)*FP/(x+FP),zz=z*z/FP;let term=z,sum=z;
      for(let n=3n;n<BigInt(digits*4+32);n+=2n){term=term*zz/FP;const delta=term/n;sum+=delta;if(!delta)break;}
      return 2n*sum;};
    const LN2=logMantissa(2n*FP);
    function ln(x){if(x<=0n)fail('对数输入无效');let k=0n;
      while(x>=2n*FP){x/=2n;k++;}while(x<FP){x*=2n;k--;}
      return logMantissa(x)+k*LN2;}
    const LN10=ln(10n*FP),log=x=>ln(x)*FP/LN10;
    function exp(x){let halves=0;while(abs(x)>FP/8n){x/=2n;halves++;if(halves>20)fail('指数超出局部高精度域');}
      let sum=FP,term=FP;for(let n=1n;n<BigInt(digits*2+64);n++){term=term*x/(FP*n);sum+=term;if(!term)break;}
      while(halves--)sum=sum*sum/FP;return sum;}
    const ctx={DP,FP,LN10,fixed,ln,exp,LOW:(ln(20n*FP)-ln(13n*FP))*FP/LN10,
      HIGH:(ln(5n*FP)-ln(3n*FP))*FP/LN10,BASE:log(2000n*FP),LOG15:log(15n*FP/10n)};
    if(precisionCache.size>=8)precisionCache.delete(precisionCache.keys().next().value);
    precisionCache.set(digits,ctx);return ctx;
  }
  const pack=(c,e)=>{if(!c)return null;while(c%10n===0n){c/=10n;e++;}return `${c}e${e}`;};
  function parse(word){const counted=/^(.*?)\*([1-9]\d*)$/.exec(String(word));
    const text=String(counted?counted[1]:word).replace(/^(-?)\./,(_m,sign)=>sign+'0.');
    const m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
    if(!m||m[2].length+(m[3]||'').length>8192||(m[4]||'').length>4096)fail('进度词项格式或容量无效');
    return {c:BigInt((m[1]||'')+m[2]+(m[3]||''))*BigInt(counted?counted[2]:1),e:BigInt(m[4]||0)-BigInt((m[3]||'').length)};}
  function fromLog(log,ctx){const {FP,DP,LN10,exp}=ctx;let exponent=log/FP,tail=log%FP;if(tail<0n){tail+=FP;exponent--;}
    return pack(exp(tail*LN10/FP),exponent-DP);}
  function input(value){
    if(/^-?\d+(?:\.\d*)?(?:e[+-]?\d+)?$/i.test(String(value)))return normalize([String(value)]);
    const v=B.BN(value);if(!v.isFinite()||v.sign<0)fail('有效探寻量必须有限非负');if(v.eq(0))return [];
    if(v.layer===0)return normalize([String(v)]);
    if(v.layer>=3||(v.layer===2&&Math.abs(v.mag)>4000))return normalize([String(v)]);
    let exponent;const ctx=precision(v.layer===2?Math.ceil(Math.abs(v.mag))+1:1);
    if(v.layer===1)exponent=ctx.fixed(String(v.mag));
    else if(v.layer===2&&Math.abs(v.mag)<=4000)exponent=ctx.exp(ctx.fixed(String(Math.abs(v.mag)))*ctx.LN10/ctx.FP)*(v.mag<0?-1n:1n);
    else return normalize([String(v)]);
    return [fromLog(exponent,ctx)];
  }
  const signed=()=>WIS.Core.SignedLedger;
  const normalize=values=>signed().normalize(values);
  const add=(a,b)=>signed().add(a,b);
  const minus=(a,b)=>signed().subtract(a,b);
  const sign=words=>signed().sign(words);
  const compare=(a,b)=>signed().compare(a,b);
  const scale=(a,n,d=1n)=>normalize(a.map(word=>{const t=parse(word);if((t.c*n)%d===0n)return pack(t.c*n/d,t.e);
    // Used only with denominator 2 in the cumulative analytic expression.
    if(d===2n)return pack(t.c*n*5n,t.e-1n);fail('非有限十进制缩放');}));
  function project(words){return normalize(words).reduceRight((sum,word)=>{if(!/^-?\d/.test(word))return B.add(sum,signed().project(word));const t=parse(word),digits=abs(t.c).toString();
    // A thousand-digit exponent cannot go through the vendor's Number-first
    // scientific string parser. This is a UI/formula projection only; the
    // exact signed word is retained for all requirement/debit decisions.
    const exponent=L().project(String(t.e+BigInt(digits.length-1)));
    const value=B.mul(B.pow10(exponent),B.BN(`${digits[0]}.${digits.slice(1,33)||0}`));
    return B.add(sum,t.c<0n?B.mul(value,-1):value);},B.ZERO);}
  function integer(words){const all=normalize(words);let n=0n;
    for(const w of signed().expand(all)){const t=parse(w);if(t.e<0n||t.e>4096n)fail('等级整数超出可验证范围');n+=t.c*10n**t.e;}
    if(n<0n)fail('等级为负');return n;}
  function logValue(words,ctx=precision()){const {FP,DP,LN10,ln}=ctx;const n=normalize(words);if(sign(n)<=0)fail('累计需求必须为正');
    const t=parse(n[0]),digits=t.c.toString(),head=BigInt((digits+'0'.repeat(Number(DP))).slice(0,Number(DP)+1));
    return (t.e+BigInt(digits.length-1))*FP+ln(head)*FP/LN10;}
  const costCache=new Map();
  function cumulative(n){if(n<0n||String(n).length>4000)fail('需求超过 4000 位等级的局部容量');const key=String(n);if(costCache.has(key))return costCache.get(key);
    let result=[];const ctx=precision(key.length);
    if(n<=10n){for(let k=0n;k<n;k++)result=add(result,[fromLog(ctx.FP+k*ctx.LOW,ctx)]);}
    else result=add(cumulative(10n),minus(scale([fromLog(ctx.BASE+(n-10n)*ctx.HIGH,ctx)],3n,2n),['3000']));
    if(costCache.size>=128)costCache.delete(costCache.keys().next().value);costCache.set(key,result);return result;}
  const fresh=()=>({version:1,natural:[],seize:[],levelResidual:[]});
  const levelWords=s=>L().normalize([s.naturalTreasureLevel??0,...(s.explorationRewards?.levelResidual||[])]);
  const capWords=s=>L().add([s.spiritWorldAscensionUnlocked?20:10],L().scale(L().stock(s,'mysticHeavenSacredTree'),2));
  const belowCap=s=>L().compare(levelWords(s),capWords(s))<0;
  function ensure(s){
    let p=s.explorationRewards;
    if(p?.version===1)return p;
    if(p?.version!=null&&p.version!==0)fail('不支持的进度版本');
    p={...fresh(),levelResidual:[...(p?.levelResidual||[])]};
    // Only the old not-yet-integer exploration remainder was unconsumed by
    // either random judgement. Never reconstruct inputs from lifetime totals.
    const old=L().normalize([s.explorationProgress??0,...(s.explorationProgressResidual||[])]);
    if(L().sign(old)>0){if(s.goldenCoreUnlocked&&belowCap(s))p.natural=normalize(old);
      if(!s.unlockedAchievements?.seizeFoundation)p.seize=normalize(old);}
    s.explorationRewards=p;return p;
  }
  function validate(s){const p=ensure(s);if(p.version!==1)fail('不支持的进度版本');
    for(const key of ['natural','seize']){if(!Array.isArray(p[key]))fail('进度格式无效');const words=normalize(p[key]);if(sign(words)<0)fail('进度为负');}
    const words=levelWords(s);if(L().sign(words)<0)fail('等级余额为负');
    for(const w of signed().expand(words))L().integer(String(w).replace(/^-/,'').replace(/\*\d+$/,''));return s;}
  function localInteger(words){try{const n=integer(words);return String(n).length<=3900?n:null;}catch(error){
    if(!signed().value(words).isFinite()||sign(words)<0)throw error;return null;}}
  const layeredCost=n=>B.mul(3000,B.pow(B.div(5,3),B.sub(n,10)));
  function layeredNatural(s,incoming,ceiling){
    const previous=ensure(s),progress=add(previous.natural,incoming),current=levelWords(s);
    const n=signed().value(current),pv=signed().value(progress),cv=layeredCost(n);
    // The same geometric inverse, evaluated in the vendor's layer model.
    // Once a single integer level is unresolvable, report the approximation
    // explicitly. No loop expands levels or exponent digits.
    const credit=B.add(cv,pv),target=B.min(signed().value(ceiling),
      B.max(n,B.add(10,B.div(B.log10(B.div(credit,3000)),B.log10(B.div(5,3))))).floor());
    if(!B.gt(target,n)){s.explorationRewards={...previous,natural:progress};return B.ZERO;}
    const words=[...signed().expand(progress)];
    const low=words.filter(w=>!String(w).startsWith('-')&&signed().project(w).abs().layer<2);
    const closed=words.filter(w=>String(w).startsWith('-')||signed().project(w).abs().layer>=2);
    // Preserve every exactly represented low word. The high closure follows
    // the existing inverse-batch convention and keeps its source receipt.
    const atCap=compare([target],ceiling)>=0;
    const main=atCap?signed().value(ceiling):target;
    s.naturalTreasureLevel=main;
    s.explorationRewards={...previous,natural:atCap?[]:normalize(low),
      levelResidual:atCap?minus(ceiling,[main]):[],
      approximation:{version:1,code:'high-geometric-batch',exactRemainder:false,
        previousLevel:current,estimatedLevel:String(main),closedProgress:closed,
        remainderLower:'0',remainderUpper:String(layeredCost(B.add(main,1))),
        policy:'represented-layer inverse; unresolved phase retained as an interval, not exact zero'}};
    WIS.Core.Effects?.invalidate?.();return B.sub(main,n);
  }
  function natural(s,amount,frozen){const previous=ensure(s);const ceiling=frozen?.cap || capWords(s);
    if(!(frozen?.eligible ?? s.goldenCoreUnlocked)||L().compare(levelWords(s),ceiling)>=0)return B.ZERO;
    const incoming=Array.isArray(amount)?normalize(amount):input(amount);if(sign(incoming)<0)fail('收入为负');
    if(!incoming.length&&!previous.natural.length)return B.ZERO;
    const current=localInteger(levelWords(s)),cap=localInteger(ceiling);
    if(current===null||[...signed().expand(incoming),...signed().expand(previous.natural)].some(w=>
      !/^[-\d]/.test(w)||abs(parse(w).e).toString().length>3900))
      return layeredNatural(s,incoming,ceiling);
    const priorProgress=previous.natural,progress=add(priorProgress,incoming),credit=add(cumulative(current),progress);
    if(compare(credit,cumulative(current+1n))<0){s.explorationRewards={...previous,natural:progress};return B.ZERO;}
    let target;
    if(compare(credit,cumulative(10n))<0){target=current;while(target<10n&&compare(credit,cumulative(target+1n))>=0)target++;}
    else {const scaled=add(minus(credit,cumulative(10n)),['3000']);
      const leading=parse(scaled[0]),ctx=precision(abs(leading.e).toString().length+1);
      target=10n+(logValue(scaled,ctx)-ctx.BASE-ctx.LOG15)/ctx.HIGH;
      if(target<10n)target=10n;}
    if(cap!==null&&target>cap)target=cap;if(target<current)target=current;
    let checks=0;while(compare(credit,cumulative(target))<0){if(++checks>8)fail('升级下界无法确认');target--;}
    while((cap===null||target<cap)&&compare(credit,cumulative(target+1n))>=0){if(++checks>8)fail('升级上界无法确认');target++;}
    const gained=target-current,words=L().normalize([String(target)]),main=L().value(words);
    // The old partial progress was consumed in reaching this new cap. Excess
    // from this input is discarded for this system alone. If ALREADY capped
    // at entry, the early return above preserves existing unfinished progress.
    let remainder=minus(credit,cumulative(target));
    if(target===cap)remainder=[];
    s.naturalTreasureLevel=main;
    s.explorationRewards={...previous,natural:remainder,levelResidual:L().subtract(words,[main])};
    if(gained>0n)WIS.Core.Effects?.invalidate?.();return L().project(String(gained));
  }
  function seize(s,amount){if(s.unlockedAchievements?.seizeFoundation)return false;const previous=ensure(s);
    const progress=add(previous.seize,Array.isArray(amount)?amount:input(amount));if(sign(progress)<0)fail('夺基进度为负');
    if(compare(progress,['100'])<0){s.explorationRewards={...previous,seize:progress};return false;}
    WIS.Meta.Achievements.record(s,'seizeFoundation');s.explorationRewards={...previous,seize:[]};return true;}
  function view(s){const p=ensure(s),atCap=!belowCap(s);let demand=null,reason=null;
    try{if(!atCap){const n=localInteger(levelWords(s));demand=n===null
      ? B.mul(B.div(2,3),layeredCost(signed().value(levelWords(s))))
      : project(minus(cumulative(n+1n),cumulative(n)));}}catch(e){reason=e.message;}
    return {level:L().value(levelWords(s)),levelResidual:p.levelResidual,cap:L().value(capWords(s)),atCap,
      progress:project(p.natural),demand,seizeProgress:project(p.seize),reason};}
  function boundaries(s,rate){if(!B.gt(rate,0))return [];const p=ensure(s),rows=[];
    if(s.goldenCoreUnlocked&&belowCap(s)){
      const n=localInteger(levelWords(s));
      const demand=n===null?[String(B.mul(B.div(2,3),layeredCost(signed().value(levelWords(s)))))]:minus(cumulative(n+1n),cumulative(n));
      const left=minus(demand,p.natural);
      rows.push({key:'naturalTreasure',pausedReason:null,remainingSeconds:B.div(B.max(0,project(left)),rate)});
    }
    if(!s.unlockedAchievements?.seizeFoundation)rows.push({key:'seizeFoundation',pausedReason:null,
      remainingSeconds:B.div(B.max(0,project(minus(['100'],p.seize))),rate)});
    return rows;
  }
  function atomicNatural(s,amount,frozen){const progress=s.explorationRewards,level=s.naturalTreasureLevel;
    try{return natural(s,amount,frozen);}catch(error){s.explorationRewards=progress;s.naturalTreasureLevel=level;WIS.Core.Effects?.invalidate?.();throw error;}}
  WIS.Cultivation.ExplorationProgress=Object.freeze({fresh,ensure,validate,natural:atomicNatural,seize,view,boundaries,levelWords,capWords,belowCap,
    math:Object.freeze({normalize,add,minus,compare,project,input,cumulative,integer,logValue})});
}(window.WIS));
