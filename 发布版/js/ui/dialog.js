(function defineDialog(WIS) {
  "use strict";
  const entries=new WeakMap();
  function close(dialog) {
    if(!dialog)return;
    const entry=entries.get(dialog);
    if(typeof dialog.close==="function" && dialog.open)dialog.close();
    else dialog.removeAttribute("open");
    if(entry){entry.overlay.remove();entries.delete(dialog);dialog.classList.remove("wis-dialog-fallback");entry.focus?.focus?.();}
  }
  function open(dialog) {
    if(!dialog)throw new Error("窗口不存在");
    if(dialog.open)return;
    if(typeof dialog.showModal==="function"){dialog.showModal();return;}
    if(typeof dialog.open!=="boolean")Object.defineProperty(dialog,"open",{configurable:true,get(){return this.hasAttribute("open");}});
    const overlay=document.createElement("div"),focus=document.activeElement;
    overlay.className="wis-dialog-overlay";overlay.addEventListener("click",()=>close(dialog));
    document.body.append(overlay);entries.set(dialog,{overlay,focus});
    dialog.classList.add("wis-dialog-fallback");dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("open","");
    if(!dialog.hasAttribute("tabindex"))dialog.tabIndex=-1;
    (dialog.querySelector("button, input, select, textarea, [tabindex]")||dialog).focus();
  }
  document.addEventListener("keydown",event=>{
    const dialogs=Array.from(document.querySelectorAll("dialog.wis-dialog-fallback[open]")),dialog=dialogs[dialogs.length-1];
    if(!dialog)return;
    if(event.key==="Escape"){
      event.preventDefault();const cancel=new Event("cancel",{cancelable:true});
      if(dialog.dispatchEvent(cancel))close(dialog);
    } else if(event.key==="Tab"){
      const items=Array.from(dialog.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex='0']")).filter(item=>!item.hidden&&item.getClientRects().length);
      if(!items.length){event.preventDefault();dialog.focus();return;}
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  WIS.UI.Dialog=Object.freeze({open,close});
}(window.WIS));
