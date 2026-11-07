(function registerCultivationResources(WIS) {
  "use strict";
  const R = WIS.Core.Resources, B = WIS.Core.BigNum, registry = WIS.Core.Registries.resources;
  const container = s => s.cultivation?.systems?.immortal?.resources;
  for (const shortName of ["mana", "immortalPower"]) {
    const base = R.storedDefinition({ id: `cultivation.immortal.${shortName}`,
      kind: "cultivation", owner: "immortal", shortName, container });
    if (shortName === "mana") {
      const usesDebit = s => !!s.cultivation?.systems?.immortal?.xiuzhen?.manaDebitResidual?.length;
      registry.register({ ...base,
        set(s, value, rebase) {
          const result = base.set(s, value, rebase);
          if (!rebase && s.cultivation.systems.immortal.xiuzhen)
            s.cultivation.systems.immortal.xiuzhen.manaDebitResidual = [];
          return result;
        },
        setExact(s,value){const result=base.setExact(s,value);if(s.cultivation.systems.immortal.xiuzhen)s.cultivation.systems.immortal.xiuzhen.manaDebitResidual=[];return result;},
        specialCanAffordExact:(s,cost)=>WIS.Cultivation.Xiuzhen.canSpend(s,'mana',cost),
        specialSpendExact:(s,cost)=>WIS.Cultivation.Xiuzhen.spendMana(s,cost),
        specialCanAfford: (s, cost) => usesDebit(s) ? WIS.Cultivation.Xiuzhen.canSpend(s, "mana", cost) : null,
        specialSpend: (s, cost) => WIS.Cultivation.Xiuzhen.spendMana(s, cost)
      });
    } else registry.register(base);
  }
  for (const shortName of ["xianForce", "yuanForce", "nieForce", "universeCoefficient", "multiverseCoefficient"]) {
    const entry = s => s.cultivation?.systems?.immortal?.xiuzhen?.resources?.[shortName];
    const requireEntry = s => {
      const e = entry(s);
      if (!e) throw Error(`修真资源不存在：${shortName}`);
      return e;
    };
    registry.register({ id: `cultivation.immortal.${shortName}`, owner: "immortal", shortName, kind: "cultivation",
      // These resources have never been fields in the public Resources snapshot.
      // Preserve that shape; their logical identity does not relocate save data.
      snapshot: false,
      get: s => entry(s)?.amount,
      getExact:s=>WIS.Core.Amount.field(requireEntry(s)),
      setExact(s,value){const A=WIS.Core.Amount,e=requireEntry(s);Object.assign(e,A.boundedFieldParts(value));if(A.compare(value,A.field(e,'peak'))>0)Object.assign(e,A.boundedFieldParts(value,'peak'));return value;},
      set(s, value) { const e = requireEntry(s); e.amount = value; e.residual = []; return value; },
      add(s, delta, terms) {
        const e = requireEntry(s);
        if(WIS.Core.Amount?.enabled()){
          const A=WIS.Core.Amount,L=WIS.Core.AmountLedger,income=L.safeNormalize(terms||[delta]),sign=L.strict.sign(income);
          if(!sign)return e.amount;const value=A.fromParts(0,[...A.words(A.field(e)),...income]);
          const statistics=A.add(A.field(e,sign>0?'total':'spent'),A.fromParts(0,sign>0?income:L.negate(income)));
          Object.assign(e,A.boundedFieldParts(value),A[sign>0?'boundedFieldParts':'fieldParts'](statistics,sign>0?'total':'spent'));
          if(A.compare(value,A.field(e,'peak'))>0)Object.assign(e,A.boundedFieldParts(value,'peak'));return e.amount;
        }
        if (!terms && (!B.isFiniteBN(delta) || B.isNaNBN(delta))) throw Error("新增资源无效，未提交");
        if (!terms && B.BN(delta).eq(0)) return e.amount;
        const next = R.prepareTerms({ amount: e.amount }, "amount", terms || [delta]);
        e.amount = next.amount; e.residual = []; return e.amount;
      },
      specialCanAffordExact:(s,cost)=>WIS.Cultivation.Xiuzhen.canSpend(s,shortName,cost),
      specialSpendExact:(s,cost)=>WIS.Cultivation.Xiuzhen.spendResource(s,shortName,cost),
      specialCanAfford: (s, cost) => !!entry(s) && WIS.Cultivation.Xiuzhen.canSpend(s, shortName, cost),
      specialSpend: (s, cost) => WIS.Cultivation.Xiuzhen.spendResource(s, shortName, cost)
    });
  }
  WIS.Meta.HighMultiverse.registerResource();
}(window.WIS));
