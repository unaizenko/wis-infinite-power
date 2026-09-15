(function defineSignedLedger(WIS) {
  "use strict";
  const { BN, Decimal, ZERO } = WIS.Core.BigNum;
  const MAX_TERMS = 128, MAX_DIGITS = 2048;
  class LedgerError extends Error {}
  // The caller owns this optional, input-keyed mathematical memo. No domain lookup.
  let injectedCache = null;
  function setCache(cache) {
    if (cache !== null && (!cache || ["get", "wordText", "pow10"].some(k => typeof cache[k] !== "function")))
      throw Error("Invalid signed ledger cache");
    injectedCache = cache;
  }
  // A bounded page is an exact archive, not a rounded replacement. Its
  // projection is used only for display; signed comparisons refine its words.
  // Each page has <= 64 entries and immutable length-prefixed text, so caches
  // reuse old pages without re-expanding every historic source on every tick.
  function page(text) {
    const negative=String(text).startsWith('-'),body=negative?String(text).slice(1):String(text);
    if(!body.startsWith('@sum:'))return null;
    const words=[];let cursor=5;
    while(cursor<body.length){
      const colon=body.indexOf(':',cursor),sizeText=body.slice(cursor,colon);
      const size=/^[1-9]\d{0,8}$/.test(sizeText)?Number(sizeText):NaN;
      if(colon<0||!Number.isSafeInteger(size)||colon+1+size>body.length||words.length>=64)
        throw new LedgerError('账本压缩页无效');
      words.push(body.slice(colon+1,colon+1+size));cursor=colon+1+size;
    }
    if(!words.length)throw new LedgerError('账本压缩页为空');
    return negative?words.map(w=>w.startsWith('-')?w.slice(1):'-'+w):words;
  }
  const packPage=words=>'@sum:'+words.map(w=>String(w).length+':'+w).join('');
  const depths=new Map();
  function pageDepth(word){
    if(depths.has(word))return depths.get(word);
    const children=page(word),depth=children?1+Math.max(...children.map(pageDepth)):0;
    if(depths.size>8192)depths.clear();depths.set(word,depth);return depth;
  }
  function* expand(values,depth=0) {
    if(depth>32)throw new LedgerError('账本压缩页嵌套超过输入安全容量');
    for(const raw of values){const item=counted(raw),children=page(item.term);
      if(children){for(const word of expand(children,depth+1)){
        const w=counted(word);yield w.term+(w.count*item.count===1n?'':'*'+String(w.count*item.count));
      }}else yield String(raw);
    }
  }
  // The bundled Decimal parser first tries Number on integer coefficients.
  // A 309+ digit coefficient can therefore become Infinity and be misparsed.
  // Move the decimal point BEFORE entering that parser. Only the bounded
  // significand is rounded by Decimal; the exact word remains in the ledger.
  function project(raw) {
    const cache = injectedCache;
    return cache ? cache.get('project', raw, prepared => uncached_project(prepared)) : uncached_project(raw);
  }
  function counted(raw) {
    if(/^-?@sum:/.test(String(raw)))return {term:String(raw),count:1n};
    const match = /^(.*?)\*([1-9]\d*)$/.exec(String(raw));
    if (!match) return { term: String(raw), count: 1n };
    if (match[2].length > MAX_DIGITS) throw new LedgerError("账本重复次数超过安全容量，输入保留");
    return { term: match[1], count: BigInt(match[2]) };
  }
  function repeatWord(raw,n){
    const item=counted(raw),children=page(item.term);
    if(children)return packPage(children.map(w=>repeatWord(w,n*item.count)));
    const count=n*item.count;return item.term+(count===1n?'':'*'+count);
  }
  function uncached_project(raw) {
    const countedTerm = counted(raw);
    if (countedTerm.count !== 1n) return project(countedTerm.term).mul(project(String(countedTerm.count)));
    const children=page(countedTerm.term);
    if(children)return value(children);
    const text=String(raw).trim().replace(/^\+/, "");
    const m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
    let safe=text;
    if(m) {
      const digits=(m[2]+(m[3]||"")).replace(/^0+/, "");
      if(!digits) return ZERO;
      const exponent=BigInt(m[4]||0)-BigInt((m[3]||"").length)+BigInt(digits.length-1);
      if (String(exponent).replace('-', '').length > 300) {
        const result=Decimal.pow(10,project(String(exponent))).mul(new Decimal(`${m[1]}${digits[0]}.${digits.slice(1)||'0'}`));
        if(!result.isFinite()||result.isNan())throw new LedgerError('账本层级投影无效');
        return result;
      }
      // The complete significand is < 10, regardless of the coefficient length.
      safe=`${m[1]}${digits[0]}.${digits.slice(1)||"0"}e${exponent}`;
    }
    const result=new Decimal(safe);
    if(!result.isFinite() || result.isNan()) throw new LedgerError("宝物账本词项无法安全投影");
    return result;
  }
  // Local additive accounting, NOT a replacement for the game's number library.
  // Decimal words use BigInt only for aligning nearby decimal places. Widely
  // separated / higher-layer words stay separate instead of being rounded away.
  function decimalWord(text) {
    const cache = injectedCache;
    return cache ? cache.get('decimalWord', text, prepared => uncached_decimalWord(prepared)) : uncached_decimalWord(text);
  }
  function uncached_decimalWord(text) {
    const m = /^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
    if (!m) return null;
    const digits = m[2] + (m[3] || ""), e = Number(m[4] || 0) - (m[3] || "").length;
    if (!Number.isSafeInteger(e) || digits.length > MAX_DIGITS * 2) return null;
    let c = BigInt((m[1] || "") + digits), exponent = e;
    while (c !== 0n && c % 10n === 0n) { c /= 10n; exponent++; }
    return { c, e: exponent };
  }
  const wordText = w => injectedCache?.wordText(w) ?? `${w.c}e${w.e}`;
  function normalize(values, limit = MAX_TERMS) {
    if (limit !== MAX_TERMS) return uncached_normalize(values, limit);
    const cache = injectedCache;
    return cache ? cache.get('normalize', values, prepared => uncached_normalize(prepared)) : uncached_normalize(values);
  }
  function uncached_normalize(values, limit = MAX_TERMS) {
    const words = [], opaque = new Map();
    for (const raw of values) {
      const item = counted(raw), text = item.term, parsedWord = exactWord(text), word = parsedWord ? { ...parsedWord } : null;
      if(page(text)){
        const negative=text.startsWith('-'),key=negative?text.slice(1):text;
        opaque.set(key,(opaque.get(key)||0n)+(negative?-1n:1n)*item.count);continue;
      }
      if (word) word.c *= item.count;
      if (word) { if (word.c !== 0n) words.push(word); }
      else {
        // Do not round away exact decimal words that exceed our local capacity.
        if (/^-?\d+(?:\.\d*)?(?:e[+-]?\d+)?$/i.test(text))
          throw new LedgerError("宝物账本十进制词项超过安全容量，操作未提交");
        const value = project(text);
        if (!value.isFinite() || value.isNan()) throw new LedgerError("宝物账本包含非法数值");
        if (!value.eq(0)) {
          const key = String(value.abs());
          const finiteParsed=exactWord(String(value)),finiteWord=finiteParsed?{...finiteParsed}:null;
          if(finiteWord){finiteWord.c*=item.count;words.push(finiteWord);continue;}
          // Exact integer logarithms fit a sparse exponent (ee1000 requires
          // 1001 exponent digits, not 10^1000 digits of the value). Larger
          // towers stay as layer atoms and use dominance bounds below.
          if(value.layer===2&&Number.isSafeInteger(value.mag)&&Math.abs(value.mag)<=4000){
            words.push({c:BigInt(value.sign)*item.count,e:(value.mag<0?-1n:1n)*10n**BigInt(Math.abs(value.mag))});continue;
          }
          opaque.set(key, (opaque.get(key) || 0n) + BigInt(value.sign) * item.count);
        }
      }
    }
    words.sort((a,b) => a.e<b.e?-1:a.e>b.e?1:0);
    const merged = [];
    for (const word of words) {
      const last = merged[merged.length-1];
      if (last && word.e-last.e <= BigInt(MAX_DIGITS) &&
          BigInt(word.c.toString().length) + word.e-last.e <= BigInt(MAX_DIGITS * 2)) {
        last.c += word.c * (injectedCache?.pow10(word.e-last.e) ?? 10n ** BigInt(word.e-last.e));
        if (last.c === 0n) merged.pop();
      } else merged.push({ ...word });
    }
    const result = [...merged.filter(w=>w.c!==0n).map(wordText), ...Array.from(opaque, ([term, count]) => {
      if (count === 0n) return null;
      const magnitude = count < 0n ? -count : count;
      if (String(magnitude).length > MAX_DIGITS) throw new LedgerError("账本重复次数超过安全容量，输入保留");
      return `${count < 0n ? "-" : ""}${repeatWord(term,magnitude)}`;
    }).filter(Boolean)];
    if(result.some(t=>/^-?@sum:/.test(t))&&exactSign(result)===0)return [];
    if (result.length > limit) {
      const error=new LedgerError("宝物账本残差层数超过安全容量，操作未提交");
      error.code='ledger-capacity';error.terms=result;throw error;
    }
    // One projection per word, not two parses on every sort comparison.
    return result.map(text=>({text,magnitude:project(text).abs()}))
      .sort((a,b)=>b.magnitude.cmp(a.magnitude)).map(item=>item.text);
  }
  function value(terms) { return terms.reduceRight((sum,t)=>sum.add(project(t)), ZERO); }
  function safeNormalize(values,limit=MAX_TERMS) {
    try{return normalize(values,limit);}catch(error){
      if(error.code!=='ledger-capacity')throw error;
      let words=error.terms;
      // Lossless interval compression: the exact children remain available
      // for refinement. MAX_TERMS still bounds every active normalization;
      // no discarded tail, guessed sign, or enlarged flat ledger.
      while(words.length>limit){
        words.sort((a,b)=>pageDepth(a)-pageDepth(b));
        const size=Math.min(64,words.length);
        words=[packPage(words.slice(0,size)),...words.slice(size)];
      }
      return normalize(words,limit);
    }
  }
  // Sparse base-10 blocks: work is proportional to represented digits/terms,
  // never to the exponent. Signed carries cancel exactly without filling gaps.
  // This also handles overlapping words which cannot fit one local coefficient.
  function exactSign(values) {
    const proof=decimalDominance(values);if(proof!==null)return proof;
    const width=256n,base=10n**width,blocks=new Map();
    const put=(e,c)=>blocks.set(e,(blocks.get(e)||0n)+c);
    for(const raw of expand(values)){
      const item=counted(raw),w=exactWord(item.term);
      if(!w)return null;
      let q=w.e/width,r=w.e%width;if(r<0n){q--;r+=width;}
      let c=w.c*item.count*10n**r;
      while(c){put(q,c%base);c/=base;q++;}
    }
    const keys=[...blocks.keys()].sort((a,b)=>a<b?-1:a>b?1:0);
    let leading=0n;
    for(let i=0;i<keys.length;i++){
      const e=keys[i],c=blocks.get(e),carry=c/base,remainder=c%base;
      if(remainder)leading=remainder;
      if(carry){const next=e+1n;if(!blocks.has(next))keys.splice(i+1,0,next);put(next,carry);}
    }
    return leading<0n?-1:leading>0n?1:0;
  }
  const wordCache=new Map(),boundsCache=new Map();
  function decimalBounds(raw){
    const key=String(raw);if(boundsCache.has(key))return boundsCache.get(key);
    const item=counted(key),children=page(item.term);
    let bound;
    if(children)bound=combineBounds(children.map(decimalBounds));
    else {const w=exactWord(item.term);if(!w)return null;
      const c=w.c*item.count,order=w.e+BigInt((c<0n?-c:c).toString().length);
      bound={p:c>0n?order:null,n:c<0n?order:null,pc:c>0n?1n:0n,nc:c<0n?1n:0n};}
    if(boundsCache.size>=8192)boundsCache.delete(boundsCache.keys().next().value);
    boundsCache.set(key,bound);return bound;
  }
  function combineBounds(rows){
    if(rows.some(r=>r===null))return null;
    const max=(a,b)=>a===null?b:b===null?a:a>b?a:b;
    return rows.reduce((a,b)=>({p:max(a.p,b.p),n:max(a.n,b.n),pc:a.pc+b.pc,nc:a.nc+b.nc}),{p:null,n:null,pc:0n,nc:0n});
  }
  function decimalDominance(values){
    const b=combineBounds(values.map(decimalBounds));if(!b)return null;
    if(!b.pc&&!b.nc)return 0;if(!b.nc)return 1;if(!b.pc)return -1;
    // Largest positive >= 10^(p-1); every opposing word < 10^n.
    // These are exact integer-exponent bounds, without floating log estimates.
    if(b.p-1n>=b.n+BigInt(String(b.nc).length))return 1;
    if(b.n-1n>=b.p+BigInt(String(b.pc).length))return -1;
    return null;
  }
  function exactWord(text) {
    if(wordCache.has(text))return wordCache.get(text);
    const m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(text));
    if(!m)return null;
    if(m[2].length+(m[3]||'').length>8192||(m[4]||'').length>4096)
      throw new LedgerError('账本词项文本超过局部安全容量，输入保留');
    const result={c:BigInt(m[1]+m[2]+(m[3]||'')),e:BigInt(m[4]||0)-BigInt((m[3]||'').length)};
    // The common normalizer repeatedly carries unchanged exact words through
    // signed tails. Retain their canonical text, including arbitrary BigInt
    // exponents; stringifying a thousand-digit exponent on every pass dominates
    // browser settlement cost. Arithmetic still uses the original exact integers.
    Object.assign(result,{_originalC:result.c,_originalE:result.e,
      _coefficientLength:String(result.c).length,_canonical:`${result.c}e${result.e}`});
    if(wordCache.size>=8192)wordCache.delete(wordCache.keys().next().value);wordCache.set(text,result);return result;
  }
  // Directed fixed-point intervals for the rare true near-cancellation case.
  // All roundoff and the remaining positive Taylor/atanh tails are enclosed.
  // This is local comparison precision, independent of the game's projections.
  const comparisonContexts=new Map();
  let retryGuardDigits=4096;
  function comparisonPrecision(digits){
    if(comparisonContexts.has(digits))return comparisonContexts.get(digits);
    const Q=10n**BigInt(digits),point=n=>[n,n];
    const floor=(a,b)=>{const q=a/b;return a<0n&&a%b?q-1n:q;};
    const ceil=(a,b)=>-floor(-a,b);
    const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],neg=a=>[-a[1],-a[0]],sub=(a,b)=>add(a,neg(b));
    const mul=(a,b)=>{const v=[a[0]*b[0],a[0]*b[1],a[1]*b[0],a[1]*b[1]];
      return [floor(v.reduce((x,y)=>x<y?x:y),Q),ceil(v.reduce((x,y)=>x>y?x:y),Q)];};
    const divideInteger=(a,n)=>[floor(a[0],n),ceil(a[1],n)];
    const div=(a,b)=>{if(b[0]<=0n)throw new LedgerError('比较区间分母非正');
      const v=[floor(a[0]*Q,b[0]),floor(a[0]*Q,b[1]),ceil(a[1]*Q,b[0]),ceil(a[1]*Q,b[1])];
      return [v.reduce((x,y)=>x<y?x:y),v.reduce((x,y)=>x>y?x:y)];};
    const one=point(Q);
    function lnMantissa(a){
      const z=div(sub(a,one),add(a,one)),zz=mul(z,z);let power=z,total=z;
      for(let k=3n;;k+=2n){power=mul(power,zz);const term=divideInteger(power,k);total=add(total,term);
        if(term[1]<=1n){total=[total[0],total[1]+4n];break;}}
      return [2n*total[0],2n*total[1]];
    }
    const ln2=lnMantissa(point(2n*Q));
    function lnInteger(n){if(n===1n)return point(0n);
      const k=BigInt(n.toString(2).length-1),a=divideInteger(point(n*Q),2n**k);
      return add(lnMantissa(a),[k*ln2[0],k*ln2[1]]);}
    const ln10=lnInteger(10n);
    function expPositive(a){let halves=0;
      while(a[1]>Q/8n){a=divideInteger(a,2n);halves++;}
      let term=one,total=one;
      for(let k=1n;;k++){term=divideInteger(mul(term,a),k);total=add(total,term);
        if(term[1]<=1n){total=[total[0],total[1]+2n];break;}}
      while(halves--)total=mul(total,total);return total;}
    const exp=a=>a[1]<=0n?div(one,expPositive(neg(a))):a[0]>=0n?expPositive(a)
      :[div(one,expPositive(point(-a[0])))[0],expPositive(point(a[1]))[1]];
    function fixedWord(w){const e=w.e+BigInt(digits);return e>=0n?point(w.c*10n**e)
      :[floor(w.c,10n**(-e)),ceil(w.c,10n**(-e))];}
    const ctx={Q,point,add,sub,mul,div,exp,ln10,lnInteger,fixedWord,logs:new Map()};
    if(comparisonContexts.size>=4)comparisonContexts.delete(comparisonContexts.keys().next().value);
    comparisonContexts.set(digits,ctx);return ctx;
  }
  function intervalSign(atoms){
    // Opaque tower logs with a manageable represented coordinate can be
    // refined locally. Higher towers normally have already proved dominance.
    let extra=0;
    for(const raw of atoms){const item=counted(raw);if(exactWord(item.term))continue;
      const v=project(item.term).abs();if(v.layer!==2||v.mag<0||v.mag>8192)return null;
      extra=Math.max(extra,Math.ceil(v.mag));}
    const precisions=[80,160,320,640,1280,2560,4096];
    for(let p=8192;p<=retryGuardDigits;p*=2)precisions.push(p);
    for(const guards of precisions){
      const c=comparisonPrecision(extra+guards),logs=[];
      for(const raw of atoms){const item=counted(raw),w=exactWord(item.term);
        const cached=c.logs.get(String(raw));if(cached){logs.push(cached);continue;}
        let log,negative;
        if(w){const coefficient=(w.c<0n?-w.c:w.c)*item.count;if(!coefficient)continue;
          log=c.add(c.point(w.e*c.Q),c.div(c.lnInteger(coefficient),c.ln10));negative=w.c<0n;
        }else{
          const value=project(item.term),m=exactWord(String(value.mag));
          log=c.add(c.exp(c.mul(c.fixedWord(m),c.ln10)),c.div(c.lnInteger(item.count),c.ln10));negative=value.sign<0;
        }
        const row={log,negative};logs.push(row);
        if(c.logs.size>=8192)c.logs.delete(c.logs.keys().next().value);c.logs.set(String(raw),row);
      }
      if(!logs.length)return 0;
      const anchor=logs.reduce((a,r)=>a>r.log[1]?a:r.log[1],logs[0].log[1]);
      let sum=[0n,0n];
      for(const row of logs){const delta=c.sub(row.log,c.point(anchor));
        // Each term below the precision window contributes strictly < 1 ulp.
        const value=delta[1]<-BigInt(extra+guards)*c.Q?[0n,1n]:c.exp(c.mul(delta,c.ln10));
        sum=c.add(sum,row.negative?[-value[1],-value[0]]:value);
      }
      if(sum[0]>0n)return 1;if(sum[1]<0n)return -1;
    }
    return null;
  }
  function sign(terms, limit = MAX_TERMS) {
    terms = safeNormalize(terms, limit);
    if (!terms.length) return 0;
    // Normalization has already validated atoms and removed exact zeros. A
    // one-sided sum needs no sparse BigInt alignment or logarithm interval.
    // Archive pages may contain mixed signs, so they still use full refinement.
    if(!terms.some(t=>/^-?@sum:/.test(t))){
      if(terms.every(t=>!String(t).startsWith('-')))return 1;
      if(terms.every(t=>String(t).startsWith('-')))return -1;
    }
    const exact=exactSign(terms);if(exact!==null)return exact;
    const refined=safeNormalize([...expand(terms)],limit);
    const atoms=[...expand(refined)];
    if(!atoms.length)return 0;
    const positive=atoms.filter(t=>!t.startsWith('-')),negative=atoms.filter(t=>t.startsWith('-'));
    if(!positive.length)return -1;if(!negative.length)return 1;
    // Cancel equal represented tower atoms before any projection. Distinct
    // tower magnitudes are ordered using the vendor's layer/magnitude model.
    // Comparing the largest atom against an upper bound for ALL opponents
    // proves the sign; it never assumes that the first approximate sum wins.
    const bound=side=>side.map(t=>project(t).abs()).sort((a,b)=>b.cmp(a));
    const p=bound(positive),n=bound(negative);
    if(positive.length===1&&negative.length===1){
      const a=counted(positive[0]),b=counted(negative[0]);
      if(a.count===b.count&&!exactWord(a.term)&&!exactWord(b.term)){
        const cmp=project(a.term).abs().cmp(project(b.term).abs());if(cmp)return cmp;
      }
    }
    const dominates=(a,b)=>{
      if(!a.gt(b[0]))return false;
      const ratio=a.log10().sub(b[0].log10());
      // Four decimal guard orders bound projection/addition roundoff. Near
      // cancellation falls through to exact decimal blocks, not a sign guess.
      return ratio.gt(BN(b.length).log10().add(4));
    };
    // Outside the local logarithm domain, canonical layer spacing dwarfs all
    // bounded integer coefficients. A magnitude gap still must be proved;
    // equal projections never choose a sign here.
    if(dominates(p[0],n))return 1;if(dominates(n[0],p))return -1;
    // Refine only genuine near cancellation. Building thousands of BigInt
    // logarithm digits before this already-proven bound can block a tick for
    // seconds after a high batch, despite an obvious dominant sign.
    const refinedSign=intervalSign(atoms);if(refinedSign!==null)return refinedSign;
    const error=new LedgerError('账本区间包含零，需要精确抵消或批量边界恢复');
    error.code='signed-interval';error.interval={low:negative.slice(),high:positive.slice(),representation:'exact signed word sums'};
    error.recoverable=true;
    throw error;
  }
  const negate = terms => terms.map(t=>String(t).startsWith("-") ? String(t).slice(1) : "-"+t);
  const add = (terms, amount, limit = MAX_TERMS) => normalize([...terms, ...amount], limit);
  const subtract = (terms, amount, limit = MAX_TERMS) => add(terms, negate(amount), limit);
  const compare = (terms, amount, limit = MAX_TERMS) => sign(safeNormalize([...terms,...negate(amount)],limit),limit);
  const bounded = limit => Object.freeze({ project, value, normalize: t => safeNormalize(t,limit), sign: t => sign(t,limit), add: (a,b) => safeNormalize([...a,...b],limit), subtract: (a,b) => safeNormalize([...a,...negate(b)],limit), compare: (a,b) => compare(a,b,limit) });
  function scale(terms, factor) {
    const f = exactWord(String(factor));
    return normalize(terms.map(t=>{
      const children=page(String(t));
      if(children)return packPage(scale(children,factor));
      const item=counted(t),w = exactWord(item.term);
      if (w && f) {
        const c=w.c*f.c*item.count,e=w.e+f.e;
        if(c.toString().replace(/^-/,"").length>8192 || String(e).length>4096)
          throw new LedgerError("宝物账本精确乘积超过安全容量，操作未提交");
        return wordText({c,e});
      }
      if(f&&f.e>=0n&&f.e<=4096n){
        const n=f.c*10n**f.e;
        if(!n)return '0';
        return repeatWord(n<0n?negate([String(t)])[0]:String(t),n<0n?-n:n);
      }
      const termValue=project(t), factorValue=project(factor), product=termValue.mul(factorValue);
      if (!product.isFinite() || product.isNan() || (!termValue.eq(0) && !factorValue.eq(0) && product.eq(0)))
        throw new LedgerError("宝物账本乘积无法表示，操作未提交");
      return String(product);
    }));
  }
  // Exact reduced fractions of represented decimal inputs. No reciprocal expansion,
  // expression chain or per-award denominator accumulation. The separate bound
  // accommodates an existing 4096-digit word plus its decimal place alignment.
  const FRACTION_DIGITS=8192;
  const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const r=a%b;a=b;b=r;}return a;};
  function fraction(n,d=1n,reduced=false) {
    if(d===0n) throw new LedgerError("奖励进度分母为零");
    if(d<0n){n=-n;d=-d;}
    if(!reduced){const g=gcd(n,d);n/=g;d/=g;}
    if(n.toString().length>FRACTION_DIGITS || d.toString().length>FRACTION_DIGITS)
      throw new LedgerError("奖励进度分式超过安全容量，输入保留");
    return {n,d};
  }
  function fromDecimal(raw) {
    const w=decimalWord(String(raw));
    if(!w || Math.abs(w.e)>FRACTION_DIGITS) throw new LedgerError("奖励进度分式无法精确表示此数值");
    return w.e>=0 ? fraction(w.c*10n**BigInt(w.e)) : fraction(w.c,10n**BigInt(-w.e));
  }
  const plus=(a,b)=>{const g=gcd(a.d,b.d),n=a.n*(b.d/g)+b.n*(a.d/g),h=gcd(n,g);
    return fraction(n/h,(a.d/g)*(b.d/h),true);};
  const times=(a,b)=>{const g=gcd(a.n,b.d),h=gcd(b.n,a.d);return fraction((a.n/g)*(b.n/h),(a.d/h)*(b.d/g),true);};
  const minus=(a,b)=>plus(a,{n:-b.n,d:b.d});
  const quotient=(a,b)=>times(a,fraction(b.d,b.n,true));
  const fromWords=words=>words.reduce((a,w)=>plus(a,fromDecimal(w)),fraction(0n));
  const creditCache=new WeakMap();
  // A validated fraction may follow an exact in-memory domain copy. The
  // source words are checked every time: edits and imported JSON must validate.
  const cachedCredit=c=>{const v=creditCache.get(c);return v&&v.n===c.n&&v.d===c.d?v:null;};
  const cacheCredit=(c,value)=>{const entry={n:c.n,d:c.d,value:Object.freeze(value)};creditCache.set(c,entry);return entry.value;};
  const readCredit=c=>cachedCredit(c)?.value || cacheCredit(c,fraction(BigInt(c.n),BigInt(c.d)));
  function inheritCredit(source,target) {
    if(!source||!target)return;
    const entry=cachedCredit(source);
    if(entry&&source.n===target.n&&source.d===target.d)creditCache.set(target,entry);
  }
  const Credit=Object.freeze({fraction,fromDecimal,fromWords,plus,minus,times,quotient,
    compare:(a,b)=>{const v=a.n*b.d-b.n*a.d;return v>0n?1:v<0n?-1:0;},
    floor:a=>a.n>=0n?a.n/a.d:(a.n-a.d+1n)/a.d,
    read:readCredit,inherit:inheritCredit,actual:c=>times(readCredit(c),fromDecimal(c.unit)),
    value:a=>project(String(a.n)).div(project(String(a.d))),
    store:(a,unit)=>{const c={version:1,n:String(a.n),d:String(a.d),unit:String(unit)};cacheCredit(c,a);return c;},
    limit:FRACTION_DIGITS});
  function integer(amount) {
    if (!(typeof amount === "number" || typeof amount === "string" || amount instanceof Decimal) ||
        (typeof amount === "string" && !amount.trim())) throw new LedgerError("宝物数量必须是有效非负整数");
    if(typeof amount === "string" && (amount.length>MAX_DIGITS*2 ||
        !/^(?:\+?\d+(?:\.\d*)?(?:e[+-]?\d+)?|e{2,}\+?\d+(?:\.\d+)?|\(e\^\d+\)\+?\d+(?:\.\d+)?)$/i.test(amount.trim())))
      throw new LedgerError("宝物数量格式无效");
    const parsed = project(amount);
    if (!parsed.isFinite() || parsed.isNan() || parsed.lt(0) || !parsed.floor().eq(parsed))
      throw new LedgerError("宝物数量必须是有效非负整数");
    // Inspect decimal input BEFORE Decimal can round a fractional huge value.
    const word=decimalWord(typeof amount === "string" ? amount.trim().replace(/^\+/,"") : String(amount));
    if(word && word.c!==0n && word.e<0) throw new LedgerError("宝物数量不能包含小数");
    return parsed;
  }
  WIS.Core.SignedLedger=Object.freeze({...bounded(MAX_TERMS),setCache,LedgerError,Credit,bounded,scale,integer,safeNormalize,negate,
    strict:Object.freeze({normalize,sign,add,subtract,compare}),exactSign,expand,MAX_TERMS,
    retryPrecision:()=>{retryGuardDigits=Math.min(65536,retryGuardDigits*2);}});
}(window.WIS));

