(function defineNativePlatform(global) {
  'use strict';
  const isNative = () => global.Capacitor?.isNativePlatform?.() === true;
  function plugins() {
    if (!isNative()) throw Error('当前不是原生 App');
    return global.Capacitor.Plugins;
  }
  let saving = false;
  function canSaveText() { return isNative() && typeof global.Capacitor?.Plugins?.WisSaveExport?.saveText === 'function'; }
  async function saveText(text, filename, generic = false, kind = 'save') {
    if (!['save', 'raw'].includes(kind)) throw Error('不支持的存档导出类型');
    if (!canSaveText()) throw Error('文件保存组件不可用，请升级 APK，或使用分享/存档文本');
    if (saving) throw Error('文件保存正在进行，请完成或取消当前选择');
    saving = true;
    try {
      const result = await plugins().WisSaveExport.saveText({text, filename, generic, kind});
      if (result?.status === 'cancelled') return result;
      if (result?.status !== 'saved' || !Number.isSafeInteger(result.bytes) || result.bytes < 0 || typeof result.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(result.sha256)) throw Error('未确认文件已完整保存，请保留存档文本并重试');
      return result;
    } catch (error) {
      if (error?.code === 'UNIMPLEMENTED' || /not implemented/i.test(error?.message || '')) throw Error('文件保存组件不可用，请升级 APK，或使用分享/存档文本');
      throw error;
    } finally { saving = false; }
  }
  async function exportText(text, filename) {
    const p = plugins();
    if (!p?.Filesystem?.writeFile || !p?.Share?.share) throw Error('存档分享组件不可用');
    // UTF-8 encoding passes the exact web envelope text; never parse or reserialize it.
    const file = await p.Filesystem.writeFile({path: filename, data: text, directory: 'CACHE', encoding: 'utf8'});
    if (!file?.uri) throw Error('存档文件写入后没有可分享的地址');
    await p.Share.share({title: 'WIS 存档备份', files: [file.uri], dialogTitle: '保存或分享存档'});
  }
  // Device backup settings are separate from the game Save contract.
  function createBackupController({bridge, capture, ready, active, now = () => Date.now(), onChange = () => {}}) {
    let settings = {enabled:false, hours:6, directory:'', directoryName:'', lastSuccess:0};
    let busy = false, error = '', message = '', retryAt = 0;
    const status = () => ({...settings, busy, error, message});
    const emit = () => onChange(status());
    async function refresh() {
      if (busy) return status();
      settings = await bridge.getSettings(); emit(); return status();
    }
    async function mutate(method, value) {
      if (busy) throw Error('备份操作正在进行，请稍后重试');
      if (method === 'configure' && value.hours !== undefined && ![6,12,24].includes(value.hours)) throw Error('备份间隔只能为6、12或24小时');
      busy = true; emit();
      try { settings = await bridge[method](value); error = ''; message = ''; retryAt = 0; }
      finally { busy = false; emit(); }
      return status();
    }
    async function check(manual = false) {
      if (busy) return false;
      busy = true;
      try {
        settings = await bridge.getSettings();
        const at = now();
        if (!active() || !settings.directory || (!manual && !settings.enabled)) return false;
        if (!manual && retryAt && at < retryAt && retryAt - at <= 300000) return false;
        const last = Number(settings.lastSuccess) || 0;
        if (!manual && last && at >= last && at - last < settings.hours * 3600000) return false;
        if (!ready()) { message = '等待读档、导入或离线恢复完成后备份'; return false; }
        message = '正在保存本地备份…'; error = ''; emit();
        const text = await capture();
        settings = await bridge.writeBackup({text});
        retryAt = 0; error = ''; message = '备份成功';
        return true;
      } catch (e) {
        error = '本地备份失败：' + (e?.message || String(e));
        message = ''; retryAt = now() + 300000;
        return false;
      } finally { busy = false; emit(); }
    }
    return Object.freeze({status, refresh, check,
      configure: value => mutate('configure', value),
      choose: () => mutate('chooseDirectory')});
  }

  async function install({closeSurface, saveBeforeLeaving, onAppState, notice}) {
    if (!isNative()) return;
    const app = plugins()?.App;
    if (!app?.addListener || !app?.exitApp) throw Error('App 生命周期组件不可用');
    let lastBack = null, exiting = false;
    await app.addListener('backButton', async () => {
      if (exiting) return;
      if (closeSurface()) { lastBack = null; return; }
      const now = Date.now();
      if (lastBack === null || now - lastBack > 2000) {
        lastBack = now; notice('再按一次退出'); return;
      }
      lastBack = null; exiting = true;
      try {
        if (!await saveBeforeLeaving()) { notice('存档尚未保存，已取消退出。请先导出备份。'); return; }
        await app.exitApp();
      } catch (error) { notice('退出失败：' + error.message); }
      finally { exiting = false; }
    });
    await app.addListener('appStateChange', ({isActive}) => { lastBack = null; onAppState(isActive === true); });
    if (app.getState) { const state = await app.getState(); onAppState(state.isActive === true); }
    const key = 'wis-native-backup-notice-v1';
    let seen = false;
    try { seen = global.localStorage.getItem(key) === '1'; } catch (_) {}
    if (!seen) {
      global.alert('App 与网页版存档不互通，可用导出/导入迁移；卸载 App 会删除存档，请定期导出备份。');
      try { global.localStorage.setItem(key, '1'); } catch (_) {}
    }
  }
  global.WIS.UI.NativePlatform = Object.freeze({isNative, canSaveText, saveText, exportText, install, createBackupController});
}(window));
