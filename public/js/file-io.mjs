import { MAX_BYTES, parseImportBytes, serializeDocument } from './core/json-import.mjs';
export function supportsFileIO(cap = globalThis) {
  try { return typeof cap.File==='function' && typeof cap.File.prototype.arrayBuffer==='function' && typeof cap.Blob==='function' && typeof cap.TextDecoder==='function' && typeof cap.TextEncoder==='function' && typeof cap.URL?.createObjectURL==='function' && typeof cap.URL?.revokeObjectURL==='function' && 'download' in cap.document.createElement('a'); }
  catch { return false; }
}
export function createImportController({ onState, readFile = file=>file.arrayBuffer() }) {
  let generation=0, pending=null;
  const emit = state => onState(state);
  function cancel() { generation++;pending=null;emit({state:'idle'}); }
  async function start(file) {
    const current=++generation;pending=null;
    if(!file){emit({state:'idle'});return;}
    if(!Number.isInteger(file.size)||file.size<0){emit({state:'error',code:'READ_FAILED'});return;}
    if(file.size>MAX_BYTES){emit({state:'error',code:'FILE_TOO_LARGE'});return;}
    emit({state:'reading'});
    try {
      const buffer=await readFile(file);
      if(current!==generation)return;
      if(!(buffer instanceof ArrayBuffer)){emit({state:'error',code:'READ_FAILED'});return;}
      const result=parseImportBytes(new Uint8Array(buffer));
      if(current!==generation)return;
      if(!result.ok){emit({state:'error',code:result.code});return;}
      pending=result.value;emit({state:'review',value:result.value});
    } catch { if(current===generation)emit({state:'error',code:'READ_FAILED'}); }
  }
  function accept(){const value=pending;generation++;pending=null;emit({state:'idle'});return value;}
  return {start,cancel,accept};
}
export function createDownloader({ URLApi=URL, BlobClass=Blob, setTimer=setTimeout, clearTimer=clearTimeout, trigger }) {
  let liveURL=null,timer=null;
  function clear(){if(timer!==null){clearTimer(timer);timer=null;}if(liveURL!==null){URLApi.revokeObjectURL(liveURL);liveURL=null;}}
  function download(doc){
    const result=serializeDocument(doc);if(!result.ok)return result;
    try{
      clear();const blob=new BlobClass([result.value],{type:'application/json'});liveURL=URLApi.createObjectURL(blob);
      trigger(liveURL,'glossquote-decision-matrix.json');timer=setTimer(clear,60000);
      return {ok:true};
    }catch{clear();return {ok:false,code:'EXPORT_FAILED'};}
  }
  return {download,clear};
}
