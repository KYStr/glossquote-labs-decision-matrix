import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveObjectURL } from 'node:buffer';
import { parseImportBytes, serializeDocument } from '../public/js/core/json-import.mjs';

// Offline DOM contract harness runs the actual app and event handlers.
// Browser layout, keyboard and file chooser checks are recorded separately.
let moduleNumber=0;
function harness(lang) {
  let doc;
  const downloads=[],windowEvents=new Map();
  class Element {
    constructor(tag) { this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.attributes=new Map();this.dataset={};this.events=new Map();this.className='';this._text='';this.value='';if(tag==='a')this.download=''; }
    get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
    set textContent(text){this.replaceChildren();this._text=String(text);}
    set innerHTML(_){throw new Error('UNSAFE_DOM_WRITE');}
    set outerHTML(_){throw new Error('UNSAFE_DOM_WRITE');}
    append(...children){for(const child of children){child.remove();child.parentElement=this;this.children.push(child);}}
    replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];this._text='';this.append(...children);}
    remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(child=>child!==this);this.parentElement=null;}}
    setAttribute(name,value){this.attributes.set(name,String(value));if(name==='open')this.open=true;}
    removeAttribute(name){this.attributes.delete(name);if(name==='open')this.open=false;}
    getAttribute(name){return this.attributes.get(name)??null;}
    get classList(){return {add:name=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),name])].join(' ');},remove:name=>{this.className=this.className.split(' ').filter(item=>item!==name).join(' ');},toggle:(name,on)=>{if(on)this.classList.add(name);else this.classList.remove(name);}};}
    addEventListener(type,handler){const handlers=this.events.get(type)||[];handlers.push(handler);this.events.set(type,handlers);}
    emit(type){for(const handler of this.events.get(type)||[])handler({target:this,preventDefault(){}});}
    click(){if(this.tagName==='A')downloads.push({url:this.href,filename:this.download});this.emit('click');}
    focus(){doc.activeElement=this;}
    showModal(){this.open=true;}
    close(){this.open=false;}
    matches(selector){if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));if(selector==='details[open]')return this.tagName==='DETAILS'&&this.open;return this.tagName.toLowerCase()===selector;}
    querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
    querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  }
  const body=new Element('body');
  doc={body,documentElement:{lang},activeElement:body,createElement:tag=>new Element(tag),addEventListener(){},querySelector:selector=>body.querySelector(selector),getElementById:id=>{
    function find(element){if(element.id===id)return element;for(const child of element.children){const result=find(child);if(result)return result;}return null;}
    return find(body);
  }};
  const page=new Element('div');page.id='page-content';body.append(page);
  const workspace=new Element('fieldset');workspace.id='workspace';page.append(workspace);
  for(const id of ['comparison-title','comparison-title-error','add-option','add-criterion','download-file','open-file','file-input','cancel-read','clear-all','work-status','io-status','results','criteria','matrix','js-note']){
    const tag=id==='matrix'?'table':id==='comparison-title'||id==='file-input'?'input':/^(?:add-|download-|open-|cancel-|clear-)/u.test(id)?'button':'div';
    const element=new Element(tag);element.id=id;workspace.append(element);
  }
  const dialog=new Element('dialog');dialog.id='confirm-dialog';body.append(dialog);
  for(const id of ['dialog-title','dialog-body','dialog-preview','dialog-cancel','dialog-confirm']){const element=new Element(id==='dialog-cancel'||id==='dialog-confirm'?'button':'div');element.id=id;dialog.append(element);}
  const previousDocument=globalThis.document,previousWindow=globalThis.window;
  globalThis.document=doc;globalThis.window={addEventListener:(type,handler)=>windowEvents.set(type,handler)};
  const get=id=>{const element=doc.getElementById(id);assert.ok(element,'missing DOM id '+id);return element;};
  return {doc,get,downloads,
    start:()=>import('../public/js/app.mjs?comparison-controller='+moduleNumber++),
    set(id,value){const element=get(id);element.value=value;element.emit(element.tagName==='SELECT'?'change':'input');},
    click:id=>get(id).click(),
    async load(value){const bytes=value instanceof Uint8Array?value:serializeDocument(value).value;get('file-input').files=[new File([bytes],'synthetic.json',{type:'application/json'})];get('file-input').emit('change');await new Promise(resolve=>setImmediate(resolve));},
    close(){windowEvents.get('pagehide')?.();globalThis.document=previousDocument;globalThis.window=previousWindow;}
  };
}
function baseline(){return {schemaVersion:1,title:'Synthetic baseline',options:[{id:'o1',label:'A'},{id:'o2',label:'B'}],criteria:[{id:'c1',label:'Benefit',direction:'benefit',weight:2},{id:'c2',label:'Burden',direction:'cost',weight:1}],scores:[{optionId:'o1',values:[5,5]},{optionId:'o2',values:[3,1]}]};}
const comparison=h=>h.doc.getElementById('leading-comparison');
const rows=h=>h.get('leading-comparison-table').querySelector('tbody').children;

for(const lang of ['zh-Hant','en']) {
  test('U08-09/10 actual '+lang+' refresh removes stale pair on invalid/missing/zero weight and follows ids',async()=>{
    const h=harness(lang);
    try{
      await h.start();assert.equal(comparison(h),null);
      await h.load(baseline());assert.equal(comparison(h),null);h.click('dialog-confirm');
      assert.match(h.get('leading-comparison-summary').textContent,/0\.00/u);
      assert.match(rows(h)[0].children[4].textContent,/\+33\.33/u);assert.match(rows(h)[1].children[4].textContent,/−33\.33/u);
      h.set('score-o1-c1','');assert.equal(comparison(h),null);assert.equal(h.get('results').querySelector('ol'),null);
      h.set('score-o1-c1','5');assert.match(h.get('leading-comparison-summary').textContent,/0\.00/u);
      for(const [id,bad,good] of [['comparison-title','','Synthetic baseline'],['weight-c1','101','2'],['option-o1','B','A']]){
        h.set(id,bad);assert.equal(comparison(h),null);h.set(id,good);assert.ok(comparison(h));
      }
      h.set('weight-c1','0');h.set('weight-c2','0');assert.equal(comparison(h),null);
      h.set('weight-c1','2');h.set('weight-c2','1');assert.ok(comparison(h));
      h.set('direction-c1','cost');assert.match(h.get('leading-comparison-table').querySelector('caption').textContent,/B − A/u);
      assert.match(rows(h)[0].children[2].textContent,/: 3/u);assert.match(rows(h)[0].children[3].textContent,/: 5/u);
      h.set('direction-c1','benefit');h.set('weight-c2','0');h.set('score-o1-c2','');h.set('score-o2-c2','');
      assert.match(rows(h)[1].textContent,lang==='en'?/Not included.*Unscored.*Unscored/u:/未計入.*未評分.*未評分/u);
      assert.match(rows(h)[1].children[4].textContent,/0\.00/u);
      const unsafe='<img src=x onerror=alert(1)>';h.set('option-o1',unsafe);
      assert.ok(h.get('leading-comparison-table').querySelector('caption').textContent.includes(unsafe));
      assert.equal(h.doc.body.querySelectorAll('img').length,0);
      h.click('add-criterion');assert.equal(comparison(h),null);h.set('weight-c3','0');assert.equal(rows(h).length,3);h.click('remove-c3');assert.equal(rows(h).length,2);
      h.click('add-option');assert.equal(comparison(h),null);h.set('score-o3-c1','1');assert.ok(comparison(h));
      h.click('remove-o1');h.doc.querySelector('.confirm-inline').children.at(-1).click();
      assert.ok(comparison(h));assert.equal(h.get('leading-comparison-table').querySelector('caption').textContent.includes(unsafe),false);
    }finally{h.close();}
  });
  test('U08-12 actual '+lang+' import and clear preserve until confirmation; download remains exact UTF-8 schema',async()=>{
    const h=harness(lang);
    try{
      await h.start();const doc=baseline();doc.criteria[1].weight=0;doc.scores.forEach(row=>{row.values[1]=null;});
      await h.load(doc);h.click('dialog-confirm');const original=comparison(h).textContent;
      h.click('download-file');const download=h.downloads.at(-1);assert.equal(download.filename,'glossquote-decision-matrix.json');
      const bytes=new Uint8Array(await resolveObjectURL(download.url).arrayBuffer());
      assert.deepEqual(bytes,serializeDocument(doc).value);assert.deepEqual(parseImportBytes(bytes).value,doc);
      assert.deepEqual(Object.keys(JSON.parse(new TextDecoder().decode(bytes))),['schemaVersion','title','options','criteria','scores']);
      await h.load(new TextEncoder().encode('{'));assert.equal(comparison(h).textContent,original);
      const replacement=baseline();replacement.title='Replacement';replacement.options[0].label='New A';replacement.scores[0].values=[5,1];
      await h.load(replacement);assert.equal(comparison(h).textContent,original);assert.equal(h.get('confirm-dialog').open,true);
      h.click('dialog-cancel');assert.equal(comparison(h).textContent,original);
      await h.load(replacement);h.click('dialog-confirm');assert.match(h.get('leading-comparison-summary').textContent,/New A.*33\.33/u);
      const replaced=comparison(h).textContent;h.click('clear-all');h.click('dialog-cancel');assert.equal(comparison(h).textContent,replaced);
      h.click('clear-all');h.click('dialog-confirm');assert.equal(comparison(h),null);assert.equal(h.get('results').querySelector('table'),null);
    }finally{h.close();}
  });
}
