(function defineAppDistribution(global) {
  'use strict';
  const DAY = 86400000, DISMISS_KEY = 'wis-app-update-dismiss-v1';
  function httpsURL(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch (_) { return null; }
  }
  function validate(value) {
    if (!value || value.schema !== 1 || !/^\d+\.\d+\.\d+\.\d+$/.test(value.version) || typeof value.version !== 'string' || value.version.length > 40 ||
        !Number.isSafeInteger(value.versionCode) || value.versionCode < 1 || typeof value.minAndroid !== 'string' || !/^\d+(?:\.\d+){0,2}$/.test(value.minAndroid) ||
        typeof value.notes !== 'string' || value.notes.length > 8000 || typeof value.publishedAt !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value.publishedAt) || !Number.isFinite(Date.parse(value.publishedAt))) return null;
    const a = value.apk, primary = httpsURL(a?.primary), mirror = a?.mirror == null ? null : httpsURL(a.mirror);
    if (!primary || a.mirror != null && !mirror || !/^[a-f\d]{64}$/i.test(a.sha256) || !Number.isSafeInteger(a.sizeBytes) || a.sizeBytes <= 0) return null;
    return Object.freeze({schema:1, version:value.version, versionCode:value.versionCode, minAndroid:value.minAndroid, notes:value.notes, publishedAt:value.publishedAt,
      apk:Object.freeze({primary, mirror, sha256:a.sha256.toLowerCase(), sizeBytes:a.sizeBytes})});
  }
  function environment({native=false, protocol='', ua='', maxTouchPoints=0}={}) {
    if (native || !['http:','https:'].includes(protocol)) return 'hidden';
    if (/iPhone|iPad|iPod/i.test(ua) || /Macintosh/i.test(ua) && maxTouchPoints > 1) return 'ios';
    // QQBrowser alone is a normal browser; QQ/ and WebView tokens are embedded hosts.
    if (/MicroMessenger|\bQQ\/|Weibo|AlipayClient|DingTalk|BytedanceWebview|aweme|Toutiao|baiduboxapp|Kwai|\bwv\b/i.test(ua)) return 'embedded';
    return /Android/i.test(ua) ? 'android' : 'desktop';
  }
  async function readManifest(url, fetcher=global.fetch?.bind(global)) {
    if (!fetcher) return null;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetcher(url, {cache:'no-store', credentials:'omit', signal:controller.signal});
      if (!r.ok) return null;
      const text = await r.text(); if (text.length > 65536) return null;
      return validate(JSON.parse(text));
    } catch (_) { return null; } finally { clearTimeout(timer); }
  }
  function createUpdateChecker({url, fetchManifest=readManifest, getVersionCode, storage, now=()=>Date.now(), schedule=fn=>setTimeout(fn,0), onUpdate}) {
    let scheduled = false;
    const store = () => storage || global.localStorage;
    function dismiss(versionCode) { try { store().setItem(DISMISS_KEY, JSON.stringify({versionCode, at:now()})); } catch (_) {} }
    async function check() {
      try {
        const code = Number(await getVersionCode()); if (!Number.isSafeInteger(code) || code < 1) return;
        const latest = validate(await fetchManifest(url)); if (!latest || latest.versionCode <= code) return;
        let saved = null; try { saved = JSON.parse(store().getItem(DISMISS_KEY)); } catch (_) {}
        if (saved?.versionCode === latest.versionCode && Number.isFinite(saved.at) && Math.abs(now()-saved.at) < DAY) return;
        onUpdate(latest);
      } catch (_) {} // Updating must never disturb gameplay or saving.
    }
    return Object.freeze({dismiss, afterOnlineSettlement() { if (scheduled || !httpsURL(url)) return; scheduled = true; schedule(check); }});
  }
  function mount({exportSave, updateURL=global.WIS.Core.Build.appUpdateManifestUrl}) {
    const doc = global.document, W = global.WIS, native = global.Capacitor?.isNativePlatform?.() === true;
    const kind = environment({native, protocol:global.location.protocol, ua:global.navigator.userAgent, maxTouchPoints:global.navigator.maxTouchPoints});
    const entry = doc.getElementById('android-app-open');
    let dialog = null, current = null, checker = null, update = false;
    const node = id => doc.getElementById(id);
    function close() { if (update && current) checker.dismiss(current.versionCode); W.UI.Dialog.close(dialog); }
    function makeDialog() {
      if (dialog) return;
      dialog = doc.createElement('dialog'); dialog.id = 'app-download-dialog'; dialog.className = 'settings-dialog app-download-dialog'; dialog.setAttribute('aria-labelledby','app-download-title');
      // Static markup only. Remote metadata is inserted with textContent below.
      dialog.innerHTML = '<div class="settings-header"><div><p class="section-label">WIS</p><h2 id="app-download-title">下载安卓 App</h2></div><button id="app-download-close" class="icon-button" type="button" aria-label="关闭">×</button></div>' +
        '<div class="settings-body app-download-body"><div class="app-download-actions"><a id="app-download-primary" class="primary-button" target="_blank" rel="noopener noreferrer">下载安卓 APK</a><a id="app-download-mirror" class="secondary-button" target="_blank" rel="noopener noreferrer" hidden>镜像下载</a><button id="app-update-later" class="secondary-button" type="button" hidden>稍后</button></div>' +
        '<p id="app-download-environment" role="status"></p><p id="app-download-backup" class="app-download-important"></p><button id="app-download-export" type="button" class="secondary-button">导出存档</button>' +
        '<p id="app-download-version" hidden></p><p id="app-download-notes" hidden></p>' +
        '<div id="app-download-qr" hidden></div><details><summary>SHA256 校验</summary><code id="app-download-sha"></code></details><p id="app-download-status" role="status"></p></div>';
      doc.body.append(dialog);
      node('app-download-close').addEventListener('click',close);
      node('app-update-later').addEventListener('click',close);
      dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
      dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
      node('app-download-export').addEventListener('click',()=>{try{exportSave();}catch(_){node('app-download-status').textContent='存档导出失败，请保留页面并重试。';}});
      for (const id of ['app-download-primary','app-download-mirror']) node(id).addEventListener('click',e=>{
        if (kind === 'embedded' || kind === 'ios') { e.preventDefault(); return; }
        if (native) {
          e.preventDefault();
          const url = node(id).href;
          if (new URL(url).origin === global.location.origin) { node('app-download-status').textContent='下载地址不可用，请稍后重试。'; return; }
          // Capacitor Bridge intercepts external HTTPS navigation with ACTION_VIEW;
          // it opens the system browser without replacing https://localhost.
          global.location.assign(url); close();
        }
      });
    }
    function show(latest, isUpdate=false) {
      makeDialog(); current = latest; update = isUpdate;
      node('app-download-title').textContent = isUpdate ? '发现新版本 '+latest.version : '下载安卓 App';
      node('app-download-version').hidden = !isUpdate; node('app-download-notes').hidden = !isUpdate;
      node('app-download-version').textContent = '版本 '+latest.version+' · '+(latest.apk.sizeBytes/1048576).toFixed(2)+' MB · Android '+latest.minAndroid+' 及以上';
      node('app-download-notes').textContent = latest.notes;
      node('app-download-sha').textContent = latest.apk.sha256;
      node('app-download-status').textContent = '';
      node('app-download-environment').textContent = kind==='embedded'?'请点右上角，选择在浏览器中打开后下载':kind==='ios'?'暂不支持 iOS，可继续使用网页版':'';
      node('app-download-backup').textContent = isUpdate ? '下载前请先导出存档备份。同签名覆盖安装会保留存档，但仍建议备份。' : 'App 与网页版存档不互通：请先在本页点击【导出存档】，安装后在 App 内导入。';
      const canDownload = native || kind==='android' || kind==='desktop';
      for (const [id,url] of [['app-download-primary',latest.apk.primary],['app-download-mirror',latest.apk.mirror]]) {
        const a=node(id); a.hidden=!canDownload||!url;if(!a.hidden)a.href=url;else a.removeAttribute('href');
      }
      node('app-download-primary').textContent=isUpdate?'去下载':'下载安卓 APK';
      node('app-update-later').hidden=!isUpdate;
      const qr=node('app-download-qr'); qr.replaceChildren();qr.hidden=kind!=='desktop';
      if(!qr.hidden)try{const code=global.qrcode(0,'M');code.addData(latest.apk.primary);code.make();qr.innerHTML=code.createSvgTag({cellSize:4,margin:16,scalable:true});qr.querySelector('svg').setAttribute('aria-label','安卓 App 下载二维码');qr.querySelector('svg').setAttribute('role','img');const caption=doc.createElement('p');caption.textContent='用手机浏览器扫描下载';qr.append(caption);}catch(_){qr.hidden=true;}
      W.UI.Dialog.open(dialog);
    }
    if(native) {
      const present=latest=>{if(doc.hidden||doc.querySelector('dialog[open]')){global.setTimeout(()=>present(latest),1000);return;}show(latest,true);};
      checker=createUpdateChecker({url:updateURL,getVersionCode:async()=>Number((await global.Capacitor.Plugins.App.getInfo()).build),onUpdate:present});
    } else if(kind!=='hidden'&&entry) {
      void readManifest(new URL('./latest.json',global.location.href).href).then(latest=>{
        if(!latest)return;
        entry.title=kind==='embedded'?'请点右上角，选择在浏览器中打开后下载':kind==='ios'?'暂不支持 iOS，可继续使用网页版':kind==='desktop'?'查看下载链接和手机扫码二维码。':'下载 Android 版本，在本机游玩。';
        entry.addEventListener('click',()=>show(latest));entry.hidden=false;
      });
    }
    return Object.freeze({afterOnlineSettlement:()=>checker?.afterOnlineSettlement()});
  }
  global.WIS.UI.AppDistribution = Object.freeze({validate,environment,readManifest,createUpdateChecker,mount});
}(window));
