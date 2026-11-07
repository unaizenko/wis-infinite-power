(function defineInfinityUI(WIS){
  'use strict';
  WIS.UI.Infinity=Object.freeze({create(context){
    const I=WIS.Meta.Infinity,C=WIS.Meta.InfinityConfig,R=WIS.Core.Runtime,s=R.state,$=id=>document.getElementById(id);
    const f=value=>context.format(value,0),label={unimplemented:'尚未实装 / 后续开放',purchased:'已购买',exclusive:'互斥锁定',prerequisite:'未满足前置',available:'可购买',unaffordable:'点数不足'};
    let selected=false,upgrades=false,branch='regular',nodeId='B1-1',displayedRun=0;
    const nodeViews=new Map();
    const nodeName=node=>`${node.id} ${node.name}`;
    const text=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
    const attribute=(el,name,value)=>{if(el.getAttribute(name)!==value)el.setAttribute(name,value);};
    const repaint=()=>R.call('renderImmediately');
    const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
    function rebirth(respec){const v=I.previewRebirth(s,{respec});if(!v.allowed)return;
      const expectedRebirthCount=displayedRun;
      const retained=WIS.Meta.Achievements.has(s,'eternalWitness');
      if(!window.confirm(`${respec?'重置无限强化':'无限转生'}：获得 ${f(v.points)} 无限点数，${`每种宝物最多保留 ${f(v.cap)}${retained?'；一证永证保留体系挑战':''}`}${respec?`；清空无限强化，返还 ${f(v.refund)} 实际支付点数`:''}；高阶多元阶位和历史最高记录保留，当前库存清零。确定继续吗？`))return;
      try{R.call('infinityRebirth',{respec,expectedRebirthCount});repaint();}catch(error){console.error(error);R.call('showNotice',`无限转生未完成：${error.message}`);}
    }
    function renderActions(){const n=I.get(s);$('infinity-tab').hidden=!n.unlocked;if(!n.unlocked)selected=false;
      if(n.unlocked)$('big-number-tabs').hidden=false;
      $('infinity-panel').hidden=!selected;$('infinity-tab').setAttribute('aria-selected',String(selected));
      if(!selected)return false;
      for(const id of ['ordinary-actions-panel','big-number-panel','tree-panel'])$(id).hidden=true;
      for(const id of ['ordinary-actions-tab','big-number-tab','tree-tab'])$(id).setAttribute('aria-selected','false');
      const X=WIS.Cultivation.Xiuzhen,H=WIS.Meta.HighMultiverse,third=X.thirdStepActive(s),fourth=X.fourthStepActive(s);
      const record=H.highest(s),hasHistory=record.order!=='0',retainedTier=H.unlocked(s);
      $('infinity-universe-resources').hidden=!third&&!retainedTier&&!hasHistory;
      $('infinity-high-multiverse-highest-row').hidden=!hasHistory;
      if(hasHistory)text($('infinity-high-multiverse-highest'),context.format(record.coefficient,2)+' '+H.symbol(record.order));
      for(const [key,visible] of [['universeCoefficient',third],['multiverseCoefficient',fourth]]){
        $('infinity-'+key+'-row').hidden=!visible;
        if(visible)text($('infinity-'+key),context.format(X.amount(s,key),2));
      }
      $('infinity-high-multiverse-row').hidden=!retainedTier;
      if(retainedTier){text($('infinity-high-multiverse-label'),'高阶多元（'+H.symbol(H.get(s).order)+'）'+(H.active(s)?'':' · 阶位已保留，产出未恢复'));text($('infinity-high-multiverse'),context.format(H.amount(s),2));}
      $('high-multiverse-upgrade').hidden=!fourth&&!retainedTier&&!H.eligible(s);
      if(fourth||retainedTier||H.eligible(s)){
        const advance=H.preview(s);
        text($('high-multiverse-condition'),'升阶条件：C6·体系高阶多元'+(advance.prerequisite?'（已解锁）':'（未解锁）')+'；当前体系高阶多元资格'+(advance.eligible?'（已满足）':'（未满足或封印）')+'；当前'+advance.fromSymbol+'系数 ≥ '+advance.threshold+'（当前 '+context.format(advance.coefficient,2)+'）');
        text($('high-multiverse-cost'),'费用：'+f(advance.cost)+' 无限点数'+(advance.enoughPoints?'':'（点数不足）'));
        text($('high-multiverse-preview'),'升阶预览：'+context.format(advance.coefficient,2)+' '+advance.fromSymbol+' → '+context.format(advance.nextAmount,2)+' '+advance.toSymbol+'；N、N²库存保留');
        $('high-multiverse-promote').disabled=!advance.allowed;
      }
      const v=I.previewRebirth(s);displayedRun=n.rebirthCount;
      $('infinity-balance').textContent=`无限点数：${f(n.points)}　累计获得：${f(n.totalPointsEarned)}　无限转生：${n.rebirthCount}次`;
      $('infinity-silver-sea').hidden=!WIS.Meta.Achievements.has(s,'silverSea');
      if(!$('infinity-silver-sea').hidden)text($('infinity-silver-sea'),'银海：+'+context.format(I.silverSeaRate(s),2)+' 无限点数/秒（当前无限转生收益的1%；当前需达到单体宇宙且TREE≥3，小数累计，离线生效）');
      $('infinity-preview').textContent=`${`重置行动、强化与体系进度，保留高阶多元阶位和历史最高记录、清空当前高阶库存；每种宝物最多保留 ${f(v.cap)}${WIS.Meta.Achievements.has(s,'eternalWitness')?'；一证永证保留体系挑战':'；挑战按无限强化保留规则重置'}`}；获得 ${f(v.points)} 无限点数`;
      $('infinity-rebirth').disabled=!v.allowed;$('infinity-requirement').textContent=v.allowed?'当前可无限转生':'需要当前 TREE ≥ TREE(3)';return true;
    }
    function renderUpgrades(){const n=I.get(s);$('infinity-upgrade-tabs').hidden=!n.upgradesUnlocked;if(!n.upgradesUnlocked)upgrades=false;
      $('ordinary-upgrades-panel').hidden=upgrades;$('infinity-upgrades-panel').hidden=!upgrades;
      $('ordinary-upgrades-tab').setAttribute('aria-selected',String(!upgrades));$('infinity-upgrades-tab').setAttribute('aria-selected',String(upgrades));
      $('ordinary-upgrades-panel').classList.toggle('hide-unlocked-upgrades',s.hideUnlockedUpgrades);
      for(const [id,hidden] of [['toggle-upgrade-filter',s.hideUnlockedUpgrades],['toggle-infinity-upgrade-filter',s.hideUnlockedInfinityUpgrades]]){
        text($(id),hidden?'显示全部强化':'隐藏已解锁强化');attribute($(id),'aria-pressed',String(hidden));
      }
      if(!upgrades)return false;displayedRun=n.rebirthCount;
      const visibleNodes=Object.values(C.nodes).filter(node=>node.branch===branch&&(!s.hideUnlockedInfinityUpgrades||!I.has(s,node.id)));
      const visibleRows=[...new Set(visibleNodes.map(node=>node.position.row))].sort((a,b)=>a-b);
      if(!visibleNodes.some(node=>node.id===nodeId))nodeId=visibleNodes[0]?.id||null;
      $('infinity-filter-empty').hidden=visibleNodes.length>0;
      $('infinity-points').textContent=`无限点数：${f(n.points)}`;
      for(const el of $('infinity-branches').children)el.setAttribute('aria-selected',String(el.dataset.branch===branch));
      const tree=$('infinity-tree');
      const rowNodes=new Map(visibleRows.map(row=>[row,visibleNodes.filter(n=>n.position.row===row).sort((a,b)=>a.position.column-b.position.column)]));
      const gcd=(a,b)=>b?gcd(b,a%b):a;
      const columns=[...rowNodes.values()].reduce((count,nodes)=>count*nodes.length/gcd(count,nodes.length),1);
      tree.style.setProperty('--infinity-columns',columns);
      for(const node of Object.values(C.nodes)){
        let view=nodeViews.get(node.id);
        if(!view){
          const button=element('button');button.type='button';button.dataset.node=node.id;
          button.style.gridRow=String(node.position.row+1);button.style.gridColumn=Object.values(C.nodes).filter(n=>n.branch===node.branch&&n.position.row===node.position.row).length===1?'1 / -1':String(node.position.column+1);
          view={button,name:element('strong'),price:element('span'),status:element('small')};
          button.append(view.name,view.price,view.status);
          button.addEventListener('click',()=>{nodeId=node.id;renderDetails();});
          nodeViews.set(node.id,view);tree.append(button);
        }
        const status=I.status(s,node.id),classes=`infinity-node ${status}${node.position.row>0?' infinity-child':''}`;
        if(view.button.className!==classes)view.button.className=classes;
        const hidden=node.branch!==branch||(s.hideUnlockedInfinityUpgrades&&I.has(s,node.id));if(view.button.hidden!==hidden)view.button.hidden=hidden;
        const row=s.hideUnlockedInfinityUpgrades?visibleRows.indexOf(node.position.row)+1:node.position.row+1;
        if(!hidden){
          const siblings=rowNodes.get(node.position.row),span=columns/siblings.length;
          view.button.style.gridRow=String(row);view.button.style.gridColumn=String(siblings.indexOf(node)*span+1)+' / span '+span;
          view.button.classList.toggle('infinity-child',row>1);
        }
        text(view.name,nodeName(node));text(view.price,`${node.price} 无限点`);text(view.status,label[status]);
        attribute(view.button,'aria-pressed',String(nodeId===node.id));
      }
      $('infinity-invested').textContent=`已投入无限点数：${f(I.invested(s))}`;renderDetails();return true;
    }
    function renderDetails(){const node=C.nodes[nodeId];$('infinity-details').hidden=!node;if(!node)return;
      $('infinity-node-name').textContent=nodeName(node);
      $('infinity-node-price').textContent=`价格：${node.price} 无限点数`;
      $('infinity-node-prerequisites').textContent=`前置：${node.prerequisites.map(id=>nodeName(C.nodes[id])).join(node.prerequisiteMode==='any'?' / ':' + ')||'无'}${node.prerequisiteMode==='any'?'（任意一项）':''}`;
      $('infinity-node-effect').textContent=node.description;$('infinity-buy').disabled=I.status(s,nodeId)!=='available';
      for(const el of $('infinity-tree').children)attribute(el,'aria-pressed',String(el.dataset.node===nodeId));
    }
    function renderChallenges(){for(const [id,def] of Object.entries(C.challenges)){const card=$(`infinity-challenge-${id}`);card.hidden=!WIS.Meta.Challenges.challengeVisible(id);if(card.hidden)continue;
      card.querySelector('.infinity-challenge-status').textContent=`${(def.achievementKey||def.rewardKey)?'本轮完成':'完成'}：${s.challengeCompletions[id]||0}/${def.maxCompletions}${I.isChallengeActive(s,id)?id==='infinityRing'?'　进行中':`　当前 ${context.format(s.activeChallengeElapsedSeconds,2)}秒`:''}`;
      const earned=def.rewardKey?I.rewardUnlocked(s,id):def.achievementKey&&WIS.Meta.Achievements.has(s,def.achievementKey);
      card.querySelector('.infinity-challenge-reward').textContent=def.rewardKey
        ? `${earned?'永久奖励已获得':'首次完成奖励'}：${def.rewardDescription}；当前 ×${context.format(I.rapidPointMultiplier(s),4)}`
        : def.achievementKey
        ? earned?'对应成就已获得':`首次完成：${def.rewardDescription}`
        : `奖励：${def.rewardDescription}`;
      const button=card.querySelector('button');button.textContent=I.isChallengeActive(s,id)?'退出挑战':((def.achievementKey||def.rewardKey)?earned:s.challengeCompletions[id])?'重复挑战（无额外奖励）':'开启挑战';button.disabled=!I.isChallengeActive(s,id)&&!WIS.Meta.Challenges.challengeStartable(id);}}
    function bind(){
      const tab=element('button','','无限');tab.id='infinity-tab';tab.type='button';tab.setAttribute('role','tab');$('big-number-tabs').append(tab);
      tab.addEventListener('click',()=>{selected=true;repaint();});for(const id of ['ordinary-actions-tab','big-number-tab','tree-tab'])$(id).addEventListener('click',()=>{selected=false;repaint();});
      const panel=element('section','infinity-panel');panel.id='infinity-panel';panel.hidden=true;
      panel.innerHTML='<h2>无限转生</h2><p id="infinity-balance"></p><section class="infinity-details" id="infinity-universe-resources" hidden><h3>宇宙数量</h3><p id="infinity-universeCoefficient-row" hidden>单体宇宙（N）：<strong id="infinity-universeCoefficient">0</strong></p><p id="infinity-multiverseCoefficient-row" hidden>多元宇宙（N²）：<strong id="infinity-multiverseCoefficient">0</strong></p><p id="infinity-high-multiverse-row" hidden><span id="infinity-high-multiverse-label">高阶多元</span>：<strong id="infinity-high-multiverse">0</strong></p><p id="infinity-high-multiverse-highest-row" hidden>历史最高高阶多元：<strong id="infinity-high-multiverse-highest">0</strong>（跨转生保留）</p></section><section class="infinity-details" id="high-multiverse-upgrade" hidden><h3>高阶多元</h3><p id="high-multiverse-condition"></p><p id="high-multiverse-cost"></p><p id="high-multiverse-preview"></p><button type="button" class="primary-button" id="high-multiverse-promote">高阶多元+</button></section><p id="infinity-silver-sea" hidden></p><p id="infinity-preview"></p><p id="infinity-requirement"></p><button type="button" class="primary-button" id="infinity-rebirth">无限转生</button>';
      $('actions-page').append(panel);$('infinity-rebirth').addEventListener('click',()=>rebirth(false));
      $('high-multiverse-promote').addEventListener('click',()=>context.performSavedAction(()=>WIS.Meta.HighMultiverse.promote(s),renderActions));
      const page=$('upgrades-page'),ordinary=element('div');ordinary.id='ordinary-upgrades-panel';
      for(const child of [...page.children])if(!child.classList.contains('page-header'))ordinary.append(child);
      const tabs=element('div','big-number-tabs');tabs.id='infinity-upgrade-tabs';tabs.hidden=true;tabs.innerHTML='<button type="button" id="ordinary-upgrades-tab">普通强化</button><button type="button" id="infinity-upgrades-tab">无限强化</button>';
      const up=element('section','infinity-panel');up.id='infinity-upgrades-panel';up.hidden=true;
      up.innerHTML='<h2>无限强化</h2><p id="infinity-points"></p><div class="infinity-branches" id="infinity-branches" role="tablist"></div><div class="infinity-tree" id="infinity-tree"></div><p id="infinity-filter-empty" hidden>本分支强化已全部解锁。</p><section class="infinity-details" id="infinity-details"><h3 id="infinity-node-name"></h3><p id="infinity-node-price"></p><p id="infinity-node-prerequisites"></p><p id="infinity-node-effect"></p><button type="button" class="primary-button" id="infinity-buy">购买</button></section><p id="infinity-invested"></p><button type="button" id="infinity-respec">重置无限强化</button>';
      for(const [parent,id,key] of [[ordinary,'toggle-upgrade-filter','hideUnlockedUpgrades'],[up,'toggle-infinity-upgrade-filter','hideUnlockedInfinityUpgrades']]){
        const filter=element('button','secondary-button','隐藏已解锁强化');filter.id=id;filter.type='button';filter.setAttribute('aria-pressed','false');parent.prepend(filter);
        filter.addEventListener('click',()=>{s[key]=!s[key];context.saveState();repaint();});
      }
      page.append(tabs,ordinary,up);$('ordinary-upgrades-tab').addEventListener('click',()=>{upgrades=false;repaint();});$('infinity-upgrades-tab').addEventListener('click',()=>{upgrades=true;repaint();});
      for(const [key,name] of Object.entries(C.branches)){const button=element('button','',name);button.type='button';button.dataset.branch=key;button.setAttribute('role','tab');button.addEventListener('click',()=>{branch=key;nodeId=Object.values(C.nodes).find(n=>n.branch===key).id;renderUpgrades();});$('infinity-branches').append(button);}
      $('infinity-buy').addEventListener('click',()=>context.performSavedAction(()=>I.purchase(s,nodeId),renderUpgrades));$('infinity-respec').addEventListener('click',()=>rebirth(true));
      const root=$('challenge-list'),challengePanel=root.querySelector('[data-catalog-system-group="普通"] > .item-list');
      const infiniteGroup=element('details','upgrade-group catalog-group');infiniteGroup.dataset.catalogSystemGroup='无限';
      const summary=element('summary');summary.innerHTML='<span><b>无限挑战</b><small>按各挑战规则重置进度</small></span>';
      const infinitePanel=element('div','item-list');infiniteGroup.append(summary,infinitePanel);
      challengePanel.closest('details').after(infiniteGroup);
      for(const [id,def] of Object.entries(C.challenges)){const card=element('article','item-row');card.id=`infinity-challenge-${id}`;card.dataset.challengeKey=id;card.dataset.catalogSystem=I.isInfinityChallenge(id)?'无限':'普通';card.hidden=true;
        const info=element('div','item-content'),control=element('div','purchase-control'),button=element('button','primary-button','开启挑战');button.type='button';
        info.append(element('h2','',['trueG1','trueGraham','trueTree3','infinityRing'].includes(id)?def.name:`${I.isInfinityChallenge(id)?'无限挑战':'挑战'}·${def.name}`),element('p','',def.description));
        control.append(element('span','infinity-challenge-status'),element('small','',`目标：${def.targetG?`G${def.targetG}`:def.targetTree?`TREE(${def.targetTree})`:def.targetXiuzhenRealm?'抵达单体宇宙量级':'无限转生后5秒内抵达宇宙结构'}`),element('small','infinity-challenge-reward'),button);
        button.addEventListener('click',()=>{if(I.isChallengeActive(s,id))WIS.Meta.Challenges.exitChallenge(id);else WIS.Meta.Challenges.startChallenge(id);});card.append(info,control);(I.isInfinityChallenge(id)?infinitePanel:challengePanel).append(card);}
    }
    return {bind,renderActions,renderUpgrades,renderChallenges};
  }});
}(window.WIS));

