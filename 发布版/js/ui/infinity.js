(function defineInfinityUI(WIS){
  'use strict';
  WIS.UI.Infinity=Object.freeze({create(context){
    const I=WIS.Meta.Infinity,C=WIS.Meta.InfinityConfig,R=WIS.Core.Runtime,s=R.state,$=id=>document.getElementById(id);
    const f=value=>context.format(value,0),label={unimplemented:'尚未实装 / 后续开放',purchased:'已购买',exclusive:'互斥锁定',prerequisite:'未满足前置',available:'可购买',unaffordable:'点数不足'};
    let selected=false,upgrades=false,branch='regular',nodeId='B1-1',displayedRun=0;
    const nodeViews=new Map();
    const text=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
    const attribute=(el,name,value)=>{if(el.getAttribute(name)!==value)el.setAttribute(name,value);};
    const repaint=()=>R.call('renderImmediately');
    const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
    function rebirth(respec){const v=I.previewRebirth(s,{respec});if(!v.allowed)return;
      const expectedRebirthCount=displayedRun;
      if(!window.confirm(`${respec?'重置无限强化':'无限转生'}：获得 ${f(v.points)} 无限点数，每种宝物最多保留 ${f(v.cap)}${respec?`，返还 ${f(v.refund)} 已投入点数`:''}。确定开始新周目吗？`))return;
      try{R.call('infinityRebirth',{respec,expectedRebirthCount});repaint();}catch(error){console.error(error);R.call('showNotice',`无限转生未完成：${error.message}`);}
    }
    function renderActions(){const n=I.get(s);$('infinity-tab').hidden=!n.unlocked;if(!n.unlocked)selected=false;
      if(n.unlocked)$('big-number-tabs').hidden=false;
      $('infinity-panel').hidden=!selected;$('infinity-tab').setAttribute('aria-selected',String(selected));
      if(!selected)return false;
      for(const id of ['ordinary-actions-panel','big-number-panel','tree-panel'])$(id).hidden=true;
      for(const id of ['ordinary-actions-tab','big-number-tab','tree-tab'])$(id).setAttribute('aria-selected','false');
      const v=I.previewRebirth(s);displayedRun=n.rebirthCount;
      $('infinity-balance').textContent=`无限点数：${f(n.points)}　累计获得：${f(n.totalPointsEarned)}　无限转生：${n.rebirthCount}次`;
      $('infinity-preview').textContent=`重置行动、强化、体系、挑战，每种宝物最多保留 ${f(v.cap)}；获得 ${f(v.points)} 无限点数`;
      $('infinity-rebirth').disabled=!v.allowed;$('infinity-requirement').textContent=v.allowed?'当前可无限转生':'需要当前 TREE ≥ TREE(3)';return true;
    }
    function renderUpgrades(){const n=I.get(s);$('infinity-upgrade-tabs').hidden=!n.upgradesUnlocked;if(!n.upgradesUnlocked)upgrades=false;
      $('ordinary-upgrades-panel').hidden=upgrades;$('infinity-upgrades-panel').hidden=!upgrades;
      $('ordinary-upgrades-tab').setAttribute('aria-selected',String(!upgrades));$('infinity-upgrades-tab').setAttribute('aria-selected',String(upgrades));
      if(!upgrades)return false;displayedRun=n.rebirthCount;
      $('infinity-points').textContent=`无限点数：${f(n.points)}`;
      for(const el of $('infinity-branches').children)el.setAttribute('aria-selected',String(el.dataset.branch===branch));
      const tree=$('infinity-tree');tree.style.setProperty('--infinity-columns',branch==='tempo'?3:branch==='systems'?1:2);
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
        const hidden=node.branch!==branch;if(view.button.hidden!==hidden)view.button.hidden=hidden;
        text(view.name,node.name);text(view.price,`${node.price} 无限点`);text(view.status,label[status]);
        attribute(view.button,'aria-pressed',String(nodeId===node.id));
      }
      $('infinity-invested').textContent=`已投入无限点数：${f(I.invested(s))}`;renderDetails();return true;
    }
    function renderDetails(){const node=C.nodes[nodeId];$('infinity-node-name').textContent=node.name;
      $('infinity-node-price').textContent=`价格：${node.price} 无限点数`;
      $('infinity-node-prerequisites').textContent=`前置：${node.prerequisites.map(id=>C.nodes[id].name).join(node.prerequisiteMode==='any'?' / ':' + ')||'无'}${node.prerequisiteMode==='any'?'（任意一项）':''}`;
      $('infinity-node-effect').textContent=node.description;$('infinity-buy').disabled=I.status(s,nodeId)!=='available';
      for(const el of $('infinity-tree').children)attribute(el,'aria-pressed',String(el.dataset.node===nodeId));
    }
    function renderChallenges(){for(const [id,def] of Object.entries(C.challenges)){const card=$(`infinity-challenge-${id}`);card.hidden=!WIS.Meta.Challenges.challengeVisible(id);if(card.hidden)continue;
      card.querySelector('.infinity-challenge-status').textContent=`完成：${s.challengeCompletions[id]||0}/${def.maxCompletions}${s.activeChallenge===id?`　当前 ${context.format(s.activeChallengeElapsedSeconds,2)}秒`:''}`;
      const button=card.querySelector('button');button.textContent=s.activeChallenge===id?'退出挑战':s.challengeCompletions[id]?'重复挑战（无额外奖励）':'开启挑战';button.disabled=s.activeChallenge!==id&&!WIS.Meta.Challenges.challengeStartable(id);}}
    function bind(){
      const tab=element('button','','无限');tab.id='infinity-tab';tab.type='button';tab.setAttribute('role','tab');$('big-number-tabs').append(tab);
      tab.addEventListener('click',()=>{selected=true;repaint();});for(const id of ['ordinary-actions-tab','big-number-tab','tree-tab'])$(id).addEventListener('click',()=>{selected=false;repaint();});
      const panel=element('section','infinity-panel');panel.id='infinity-panel';panel.hidden=true;
      panel.innerHTML='<h2>无限转生</h2><p id="infinity-balance"></p><p id="infinity-preview"></p><p id="infinity-requirement"></p><button type="button" class="primary-button" id="infinity-rebirth">无限转生</button>';
      $('actions-page').append(panel);$('infinity-rebirth').addEventListener('click',()=>rebirth(false));
      const page=$('upgrades-page'),ordinary=element('div');ordinary.id='ordinary-upgrades-panel';
      for(const child of [...page.children])if(!child.classList.contains('page-header'))ordinary.append(child);
      const tabs=element('div','big-number-tabs');tabs.id='infinity-upgrade-tabs';tabs.hidden=true;tabs.innerHTML='<button type="button" id="ordinary-upgrades-tab">普通强化</button><button type="button" id="infinity-upgrades-tab">无限强化</button>';
      const up=element('section','infinity-panel');up.id='infinity-upgrades-panel';up.hidden=true;
      up.innerHTML='<h2>无限强化</h2><p id="infinity-points"></p><div class="infinity-branches" id="infinity-branches" role="tablist"></div><div class="infinity-tree" id="infinity-tree"></div><section class="infinity-details"><h3 id="infinity-node-name"></h3><p id="infinity-node-price"></p><p id="infinity-node-prerequisites"></p><p id="infinity-node-effect"></p><button type="button" class="primary-button" id="infinity-buy">购买</button></section><p id="infinity-invested"></p><button type="button" id="infinity-respec">重置无限强化</button>';
      page.append(tabs,ordinary,up);$('ordinary-upgrades-tab').addEventListener('click',()=>{upgrades=false;repaint();});$('infinity-upgrades-tab').addEventListener('click',()=>{upgrades=true;repaint();});
      for(const [key,name] of Object.entries(C.branches)){const button=element('button','',name);button.type='button';button.dataset.branch=key;button.setAttribute('role','tab');button.addEventListener('click',()=>{branch=key;nodeId=Object.values(C.nodes).find(n=>n.branch===key).id;renderUpgrades();});$('infinity-branches').append(button);}
      $('infinity-buy').addEventListener('click',()=>context.performSavedAction(()=>I.purchase(s,nodeId),renderUpgrades));$('infinity-respec').addEventListener('click',()=>rebirth(true));
      const challengePanel=$('challenge-list').querySelector('[data-catalog-system-group="普通"] > .item-list');for(const [id,def] of Object.entries(C.challenges)){const card=element('article','item-row');card.id=`infinity-challenge-${id}`;card.dataset.challengeKey=id;card.dataset.catalogSystem="普通";card.hidden=true;
        const info=element('div','item-content'),button=element('button','primary-button','开启挑战');button.type='button';
        info.append(element('h2','',`挑战·${def.name}`),element('p','',def.description),element('p','',`目标：${def.targetG?`G${def.targetG}`:def.targetTree?`TREE(${def.targetTree})`:'5秒内抵达宇宙结构'}`),element('p','',`奖励：${def.rewardDescription}`),element('small','infinity-challenge-status'));
        button.addEventListener('click',()=>{if(s.activeChallenge===id)WIS.Meta.Challenges.exitChallenge();else WIS.Meta.Challenges.startChallenge(id);});card.append(info,button);challengePanel.append(card);}
    }
    return {bind,renderActions,renderUpgrades,renderChallenges};
  }});
}(window.WIS));
