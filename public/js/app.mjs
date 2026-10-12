import { validateDocument, normalizeLabel, parseUIWeight } from './core/schema.mjs';
import { compareLeadingPair } from './core/comparison.mjs';
import { createDefaultDocument, addOption, addCriterion, removeOption, removeCriterion } from './core/matrix.mjs';
import { messages, translate, formatSignedPoints } from './i18n.mjs';
import { supportsFileIO, createImportController, createDownloader } from './file-io.mjs';

const locale = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const copy = messages[locale];
const t = (key, values) => translate(locale, key, values);
const $ = id => document.getElementById(id);
const format = n => n.toFixed(2);
function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
function button(text, action, className = '') { const b = node('button', text, className); b.type = 'button'; b.addEventListener('click', action); return b; }
function initial() {
  const doc = createDefaultDocument();
  doc.title = copy.defaultTitle; doc.options.forEach((o,i) => {o.label = copy.defaultOptions[i];}); doc.criteria.forEach((c,i) => {c.label = `${copy.criterionPrefix} ${i+1}`;});
  return toDraft(doc);
}
function toDraft(doc) { return { ...doc, options: doc.options.map(o=>({...o})), criteria: doc.criteria.map(c=>({...c,weight:String(c.weight)})), scores: doc.scores.map(r=>({...r,values:[...r.values]})) }; }
let draft = initial();
let dialogAction = null, dialogFocus = null, pendingRemoval = null;
const ioSupported = supportsFileIO();
let importer=null,downloader=null;
function candidate() {
  const criteria = [];
  for(const c of draft.criteria) { const parsed=parseUIWeight(c.weight); if(!parsed.ok)return parsed; criteria.push({...c,weight:parsed.value}); }
  return validateDocument({...draft,criteria});
}
function field(id, label, value, onInput, maxLength = 80) {
  const wrap=node('div',undefined,'field');const labelElement=node('label',label);labelElement.htmlFor=id;
  const input=node('input');input.id=id;input.value=value;input.maxLength=maxLength;input.addEventListener('input',()=>{onInput(input.value);refresh();});
  const error=node('p',undefined,'field-error');error.id=id+'-error';input.setAttribute('aria-describedby',error.id);
  wrap.append(labelElement,input,error);return wrap;
}
function mark(id,code) { const input=$(id),error=$(id+'-error');if(!input||!error)return;input.setAttribute('aria-invalid',String(Boolean(code)));error.textContent=code?copy.errors[code]:''; }
function labelErrors(items, prefix) {
  const seen=new Map();
  items.forEach(item=>{const label=normalizeLabel(item.label);mark(`${prefix}-${item.id}`,label.ok?null:label.code);if(label.ok){if(seen.has(label.value)){mark(`${prefix}-${item.id}`,'DUPLICATE_LABEL');mark(`${prefix}-${seen.get(label.value)}`,'DUPLICATE_LABEL');}else seen.set(label.value,item.id);}});
}
function refresh() {
  const title=normalizeLabel(draft.title,true);mark('comparison-title',title.ok?null:title.code);
  labelErrors(draft.options,'option');labelErrors(draft.criteria,'criterion');
  for(const c of draft.criteria){const w=parseUIWeight(c.weight);mark(`weight-${c.id}`,w.ok?null:w.code);}
  const checked=candidate();
  $('add-option').disabled=!checked.ok||draft.options.length>=8;
  $('add-criterion').disabled=!checked.ok||draft.criteria.length>=8;
  $('download-file').disabled=!ioSupported||!checked.ok;
  const weight=checked.ok?checked.value.criteria.reduce((sum,c)=>sum+c.weight,0):0;
  draft.criteria.forEach((c,j)=>{
    $(`remove-${c.id}`).setAttribute('aria-label',`${copy.remove} ${c.label}`);
    $(`share-${c.id}`).textContent=checked.ok&&weight>0?`${format(checked.value.criteria[j].weight*100/weight)}%`:'—';
    $(`header-${c.id}`).replaceChildren(node('span',c.label),node('small',copy[c.direction]));
  });
  draft.options.forEach(o=>{$(`remove-${o.id}`).setAttribute('aria-label',`${copy.remove} ${o.label}`);$(`option-display-${o.id}`).textContent=o.label;draft.criteria.forEach(c=>{$(`score-${o.id}-${c.id}`).setAttribute('aria-label',`${o.label} / ${c.label} / ${copy[c.direction]} / ${copy.score}`);});});
  const scored=checked.ok?compareLeadingPair(checked.value):checked;
  const status=!checked.ok?t('invalid'):scored.ok?t('ready'):scored.code==='MISSING_SCORES'?t('missing',{count:scored.missingCount}):copy.errors[scored.code];
  if($('work-status').textContent!==status)$('work-status').textContent=status;
  $('work-status').classList.toggle('ready',scored.ok);
  renderResults(scored,checked.ok?checked.value:null);
}
function renderResults(scored,doc) {
  const area=$('results');
  // Preserve disclosure state without allowing an old ranking to remain after invalid input.
  const expanded=new Set([...area.querySelectorAll('details[open]')].map(el=>el.dataset.option));
  area.replaceChildren();
  if(!scored.ok){area.append(node('p',t('noRanking'),'empty-result'));return;}
  const list=node('ol',undefined,'ranking');
  for(const result of scored.value.ranked){
    const option=doc.options.find(o=>o.id===result.optionId);
    const row=node('li');const line=node('div',undefined,'rank-line');
    const rank=node('span',t(result.tied?'tiedRank':'rank',{rank:result.rank}),'rank');
    line.append(rank,node('strong',option.label,'rank-name'),node('span',t('points',{score:format(result.score)}),'score-value'));
    const details=node('details');details.dataset.option=option.id;details.open=expanded.has(option.id);details.append(node('summary',t('details')));
    details.append(node('p',`25 × ${result.numerator} ÷ ${scored.value.totalWeight} = ${format(result.score)}`,'formula'));
    const contributions=node('ul',undefined,'contributions');
    result.contributions.forEach((part,j)=>{const c=doc.criteria[j];const li=node('li');li.append(node('span',`${c.label} (${copy[c.direction]})`),node('span',`${c.weight} × ${part.utility} × 25 ÷ ${scored.value.totalWeight} = ${format(part.contribution)}`,'formula'));contributions.append(li);});
    details.append(contributions);row.append(line,details);list.append(row);
  }
  area.append(list,renderLeadingComparison(scored.value,doc),node('p',t('rounding'),'hint'));
}
function renderLeadingComparison(value,doc) {
  const names=new Map(doc.options.map(option=>[option.id,option.label]));
  const first=names.get(value.firstOptionId),second=names.get(value.secondOptionId);
  const comparison=node('section',undefined,'leading-comparison');comparison.id='leading-comparison';
  const heading=node('h3',t('comparisonTitle'));heading.id='leading-comparison-heading';
  comparison.setAttribute('aria-labelledby',heading.id);comparison.append(heading);
  const summary=node('p',t(value.tied?'comparisonTie':'comparisonDifference',{first,second,delta:format(value.totalDeltaScore)}),'comparison-summary');summary.id='leading-comparison-summary';comparison.append(summary);
  if(value.firstRankOptionIds.length>1)comparison.append(node('p',t('comparisonFirstGroup',{names:value.firstRankOptionIds.map(id=>names.get(id)).join(copy.comparisonNameSeparator),rank:value.firstRank,first,second}),'comparison-group'));
  if(value.secondRank!==value.firstRank&&value.secondRankOptionIds.length>1)comparison.append(node('p',t('comparisonSecondGroup',{names:value.secondRankOptionIds.map(id=>names.get(id)).join(copy.comparisonNameSeparator),rank:value.secondRank,first,second}),'comparison-group'));
  const scroll=node('div',undefined,'matrix-scroll');scroll.id='leading-comparison-region';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',t('comparisonRegion'));
  const table=node('table',undefined,'comparison-table');table.id='leading-comparison-table';table.append(node('caption',t('comparisonCaption',{first,second})));
  const head=node('thead'),headers=node('tr');
  for(const label of [copy.comparisonCriterion,copy.weight+' / '+copy.share,first,second,t('comparisonDelta',{first,second})]){const cell=node('th',label);cell.scope='col';headers.append(cell);}
  head.append(headers);table.append(head);
  const body=node('tbody');
  value.criteria.forEach(part=>{
    const criterion=doc.criteria.find(item=>item.id===part.criterionId),row=node('tr');
    const label=node('th',criterion.label);label.scope='row';label.append(node('small',copy[part.direction]));if(!part.active)label.append(node('small',t('comparisonInactive')));row.append(label);
    const weight=node('td');weight.append(node('span',String(part.weight),'data-value'),node('small',format(part.weight*100/value.totalWeight)+'%'));row.append(weight);
    for(const [raw,contribution] of [[part.firstRawScore,part.firstContribution],[part.secondRawScore,part.secondContribution]]){
      const cell=node('td');cell.append(node('span',copy.score+': '+(raw===null?copy.unscored:String(raw))),node('span',copy.contribution+': '+t('points',{score:format(contribution)}),'data-value'));row.append(cell);
    }
    const delta=node('td');delta.append(node('span',t('points',{score:formatSignedPoints(part.deltaContribution)}),'data-value'),node('span',part.deltaNumerator===0?t('comparisonSame'):t('comparisonFavours',{name:part.deltaNumerator>0?first:second})));row.append(delta);body.append(row);
  });
  table.append(body);scroll.append(table);comparison.append(scroll);
  comparison.append(node('p',t('comparisonFormula')+': 25 × ('+value.ranked[0].numerator+' − '+value.ranked[1].numerator+') ÷ '+value.totalWeight+' = '+format(value.totalDeltaScore),'formula'));
  return comparison;
}
function renderEditor(focusId) {
  pendingRemoval=null;
  $('comparison-title').value=draft.title;
  const criteria=$('criteria');criteria.replaceChildren();
  draft.criteria.forEach(c=>{
    const row=node('div',undefined,'criterion-row');row.id=`criterion-row-${c.id}`;
    row.append(field(`criterion-${c.id}`,copy.criterion,c.label,v=>{c.label=v;}));
    const direction=node('div',undefined,'field');const label=node('label',copy.direction);label.htmlFor=`direction-${c.id}`;
    const select=node('select');select.id=label.htmlFor;for(const value of ['benefit','cost']){const option=node('option',copy[value]);option.value=value;select.append(option);}select.value=c.direction;select.addEventListener('change',()=>{c.direction=select.value;refresh();});direction.append(label,select);row.append(direction);
    const weight=field(`weight-${c.id}`,copy.weight,c.weight,v=>{c.weight=v;},8);weight.querySelector('input').inputMode='numeric';row.append(weight);
    const share=node('div',undefined,'weight-share');share.append(node('span',copy.share));const value=node('output','—');value.id=`share-${c.id}`;share.append(value);row.append(share);
    const remove=button(copy.remove,()=>requestRemove('criterion',c.id), 'quiet');remove.id=`remove-${c.id}`;remove.disabled=draft.criteria.length<=1;remove.setAttribute('aria-label',`${copy.remove} ${c.label}`);row.append(remove);criteria.append(row);
  });
  const table=$('matrix');table.replaceChildren(node('caption',t('matrixCaption')));
  const thead=node('thead'),tr=node('tr');const first=node('th',copy.option);first.scope='col';tr.append(first);
  for(const c of draft.criteria){const th=node('th');th.scope='col';th.id=`header-${c.id}`;tr.append(th);}
  const last=node('th',copy.operations);last.scope='col';tr.append(last);thead.append(tr);table.append(thead);
  const tbody=node('tbody');
  draft.options.forEach((o,i)=>{
    const row=node('tr');row.id=`option-row-${o.id}`;const th=node('th');th.scope='row';
    th.append(field(`option-${o.id}`,copy.optionName,o.label,v=>{o.label=v;}));const display=node('span',o.label,'option-display');display.id=`option-display-${o.id}`;display.setAttribute('aria-hidden','true');th.append(display);row.append(th);
    draft.criteria.forEach((c,j)=>{const td=node('td'),select=node('select');select.id=`score-${o.id}-${c.id}`;
      for(const value of ['',1,2,3,4,5]){const item=node('option',value===''?copy.unscored:String(value));item.value=String(value);select.append(item);}select.value=draft.scores[i].values[j]===null?'':String(draft.scores[i].values[j]);select.addEventListener('change',()=>{draft.scores[i].values[j]=select.value===''?null:Number(select.value);refresh();});td.append(select);row.append(td);
    });
    const action=node('td');const remove=button(copy.remove,()=>requestRemove('option',o.id),'quiet');remove.id=`remove-${o.id}`;remove.disabled=draft.options.length<=2;remove.setAttribute('aria-label',`${copy.remove} ${o.label}`);action.append(remove);row.append(action);tbody.append(row);
  });table.append(tbody);refresh();if(focusId)$(focusId)?.focus();
}
function requestRemove(kind,id) {
  const items=kind==='option'?draft.options:draft.criteria;const index=items.findIndex(item=>item.id===id);
  const filled=kind==='option'?draft.scores[index].values.some(v=>v!==null):draft.scores.some(row=>row.values[index]!==null);
  if(!filled){removeItem(kind,id);return;}
  document.querySelector('.confirm-inline')?.remove();
  const holder=kind==='option'?$(`remove-${id}`).parentElement:$(`criterion-row-${id}`);
  const notice=node('div',undefined,'confirm-inline');notice.setAttribute('role','group');notice.setAttribute('aria-label',t('deleteQuestion'));
  const keep=button(copy.keep,()=>{notice.remove();$(`remove-${id}`)?.focus();pendingRemoval=null;});notice.append(node('p',t('deleteQuestion')),keep,button(copy.remove,()=>removeItem(kind,id)));holder.append(notice);pendingRemoval={kind,id};keep.focus();
}
function removeItem(kind,id) {
  const checked=candidate();if(!checked.ok){$('work-status').textContent=copy.errors[checked.code];return;}
  const items=kind==='option'?draft.options:draft.criteria;const index=items.findIndex(item=>item.id===id);
  const result=(kind==='option'?removeOption:removeCriterion)(checked.value,id);
  if(!result.ok){$('work-status').textContent=copy.errors[result.code];return;}
  draft=toDraft(result.value);const next=kind==='option'?draft.options:draft.criteria;
  renderEditor(`${kind}-${next[Math.min(index,next.length-1)].id}`);
}
function addItem(kind) {
  const checked=candidate();if(!checked.ok)return;
  const result=(kind==='option'?addOption:addCriterion)(checked.value,kind==='option'?copy.optionPrefix:copy.criterionPrefix);
  if(!result.ok){$('work-status').textContent=copy.errors[result.code];return;}
  draft=toDraft(result.value);const added=(kind==='option'?draft.options:draft.criteria).at(-1);renderEditor(`${kind}-${added.id}`);
}
function closeDialog(confirmed=false) {
  const action=dialogAction;dialogAction=null;
  const dialog=$('confirm-dialog');if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
  dialog.classList.remove('fallback');$('page-content').inert=false;$('workspace').disabled=false;
  dialogFocus?.focus();dialogFocus=null;action?.(confirmed);
}
function openDialog({title,body,cancel,confirm,preview=[],action}) {
  dialogFocus=document.activeElement;dialogAction=action;
  $('dialog-title').textContent=title;$('dialog-body').textContent=body;$('dialog-cancel').textContent=cancel;$('dialog-confirm').textContent=confirm;$('dialog-preview').replaceChildren(...preview);
  const dialog=$('confirm-dialog');
  if(typeof dialog.showModal==='function')dialog.showModal();else{dialog.setAttribute('open','');dialog.classList.add('fallback');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');$('page-content').inert=true;$('workspace').disabled=true;}
  $('dialog-cancel').focus();
}
$('dialog-cancel').addEventListener('click',()=>closeDialog());$('dialog-confirm').addEventListener('click',()=>closeDialog(true));
$('confirm-dialog').addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
$('confirm-dialog').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeDialog();}if(event.key==='Tab'){const first=$('dialog-cancel'),last=$('dialog-confirm');if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&pendingRemoval){const {id}=pendingRemoval;document.querySelector('.confirm-inline')?.remove();pendingRemoval=null;$(`remove-${id}`)?.focus();}});
$('comparison-title').addEventListener('input',event=>{draft.title=event.target.value;refresh();});
$('add-option').addEventListener('click',()=>addItem('option'));$('add-criterion').addEventListener('click',()=>addItem('criterion'));
$('clear-all').addEventListener('click',()=>{
  importer?.cancel();
  openDialog({title:t('clearTitle'),body:t('clearBody'),cancel:t('clearKeep'),confirm:t('clearConfirm'),action:confirmed=>{if(confirmed){downloader?.clear();draft=initial();renderEditor('comparison-title');$('io-status').textContent=t('resetDone');}}});
});
if(ioSupported){
  importer=createImportController({onState:state=>{
    $('cancel-read').hidden=state.state!=='reading';
    $('open-file').setAttribute('aria-busy',String(state.state==='reading'));
    if(state.state==='reading')$('io-status').textContent=t('reading');
    else if(state.state==='error'){$('io-status').textContent=copy.errors[state.code]+' '+t('fileUnchanged');$('open-file').focus();}
    else if(state.state==='review'){
      $('io-status').textContent='';
      openDialog({title:t('importTitle'),body:t('importBody'),cancel:t('cancel'),confirm:t('replace'),preview:[node('strong',state.value.title),node('p',t('importSummary',{options:state.value.options.length,criteria:state.value.criteria.length}))],action:confirmed=>{
        if(confirmed){const doc=importer.accept();if(doc){downloader.clear();draft=toDraft(doc);renderEditor();$('io-status').textContent=t('imported');}}
        else{importer.cancel();$('io-status').textContent=t('cancelled');}
      }});
    }
  }});
  downloader=createDownloader({trigger:(url,filename)=>{const a=node('a');a.href=url;a.download=filename;document.body.append(a);try{a.click();}finally{a.remove();}}});
  $('open-file').disabled=false;
  $('open-file').addEventListener('click',()=>{importer.cancel();$('file-input').value='';$('file-input').click();});
  $('file-input').addEventListener('change',()=>{const file=$('file-input').files?.[0];$('file-input').value='';if(file)void importer.start(file);});
  $('file-input').addEventListener('cancel',()=>{importer.cancel();$('io-status').textContent=t('cancelled');});
  $('cancel-read').addEventListener('click',()=>{importer.cancel();$('io-status').textContent=t('cancelled');$('open-file').focus();});
  $('download-file').addEventListener('click',()=>{const checked=candidate();if(!checked.ok)return;const result=downloader.download(checked.value);$('io-status').textContent=result.ok?t('exportDone'):copy.errors[result.code];});
}else $('io-status').textContent=t('unsupported');
window.addEventListener('pagehide',()=>{importer?.cancel();downloader?.clear();});
$('workspace').hidden=false;$('js-note').hidden=true;renderEditor();
