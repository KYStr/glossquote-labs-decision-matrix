import test from 'node:test';
import assert from 'node:assert/strict';
import { compareLeadingPair } from '../public/js/core/comparison.mjs';
import { scoreDocument } from '../public/js/core/scoring.mjs';
import { parseImportBytes, serializeDocument } from '../public/js/core/json-import.mjs';
import { formatSignedPoints } from '../public/js/i18n.mjs';

function documentFor(values, criteria = [{direction:'benefit',weight:2},{direction:'cost',weight:1}]) {
  return {schemaVersion:1,title:'Synthetic comparison',
    options:values.map((_,i)=>({id:'o'+(i+1),label:'Option '+(i+1)})),
    criteria:criteria.map((c,i)=>({id:'c'+(i+1),label:'Criterion '+(i+1),...c})),
    scores:values.map((row,i)=>({optionId:'o'+(i+1),values:[...row]}))};
}
const baseline = () => documentFor([[5,5],[3,1]]);
const near = (actual,expected) => assert.ok(Math.abs(actual-expected)<=1e-12,actual+' != '+expected);
function frozen(value) { for(const child of Object.values(value))if(child&&typeof child==='object')frozen(child);return Object.freeze(value); }

test('U08-01 tied baseline exposes opposite exact contributions without a winner',()=>{
  const value=compareLeadingPair(baseline()).value;
  assert.equal(value.totalWeight,3);
  assert.deepEqual([value.firstOptionId,value.secondOptionId,value.firstRank,value.secondRank,value.tied],['o1','o2',1,1,true]);
  assert.deepEqual(value.ranked.map(row=>[row.numerator,row.score.toFixed(2)]),[[8,'66.67'],[8,'66.67']]);
  assert.deepEqual(value.criteria.map(row=>[row.firstNumerator,row.secondNumerator,row.deltaNumerator]),[[8,4,4],[0,4,-4]]);
  near(value.criteria[0].firstContribution,200/3);near(value.criteria[0].secondContribution,100/3);
  near(value.criteria[0].deltaContribution,100/3);near(value.criteria[1].deltaContribution,-100/3);
  assert.deepEqual(value.criteria.map(row=>formatSignedPoints(row.deltaContribution)),['+33.33','−33.33']);
  assert.equal(value.totalDeltaNumerator,0);assert.equal(value.totalDeltaScore,0);
  assert.equal(formatSignedPoints(value.totalDeltaScore),'0.00');assert.equal(formatSignedPoints(-0),'0.00');
});
test('U08-02 total gap uses original numerators, not displayed scores or contributions',()=>{
  const value=compareLeadingPair(documentFor([[5,1],[3,1]])).value;
  assert.deepEqual(value.ranked.map(row=>[row.numerator,row.score.toFixed(2)]),[[12,'100.00'],[8,'66.67']]);
  assert.equal(value.totalDeltaNumerator,4);near(value.totalDeltaScore,100/3);
  assert.equal(value.totalDeltaScore.toFixed(2),'33.33');
  assert.deepEqual(value.criteria.map(row=>[row.firstRawScore,row.secondRawScore,row.deltaNumerator]),[[5,3,4],[1,1,0]]);
});
test('U08-03 sorted cost scores resolve by option id; direction changes keep raw inputs',()=>{
  const doc=documentFor([[5],[1]],[{direction:'cost',weight:1}]);
  const cost=compareLeadingPair(doc).value;
  assert.deepEqual([cost.firstOptionId,cost.secondOptionId,cost.totalDeltaScore],['o2','o1',100]);
  assert.deepEqual(cost.criteria.map(row=>[row.firstRawScore,row.secondRawScore,row.firstNumerator,row.secondNumerator]),[[1,5,4,0]]);
  doc.criteria[0].direction='benefit';
  const benefit=compareLeadingPair(doc).value;
  assert.deepEqual([benefit.firstOptionId,benefit.secondOptionId,benefit.criteria[0].firstRawScore,benefit.criteria[0].secondRawScore],['o1','o2',5,1]);
  assert.deepEqual(doc.scores.map(row=>row.values),[[5],[1]]);
});
test('U08-04/05 complete rank groups and stable pair after synchronized option reordering',()=>{
  const doc=documentFor([[5],[5],[5],[1]],[{direction:'benefit',weight:1}]);
  let value=compareLeadingPair(doc).value;
  assert.deepEqual(value.ranked.map(row=>row.rank),[1,1,1,4]);
  assert.deepEqual(value.firstRankOptionIds,['o1','o2','o3']);assert.deepEqual(value.secondRankOptionIds,['o1','o2','o3']);
  assert.equal(value.totalDeltaScore,0);
  doc.scores[1].values[0]=4;doc.scores[2].values[0]=4;
  value=compareLeadingPair(doc).value;
  assert.deepEqual(value.ranked.map(row=>row.rank),[1,2,2,4]);assert.deepEqual(value.secondRankOptionIds,['o2','o3']);
  assert.equal(value.totalDeltaNumerator,1);assert.equal(value.totalDeltaScore,25);
  [doc.options[1],doc.options[2]]=[doc.options[2],doc.options[1]];
  [doc.scores[1],doc.scores[2]]=[doc.scores[2],doc.scores[1]];
  value=compareLeadingPair(doc).value;
  assert.equal(value.secondOptionId,'o3');assert.deepEqual(value.secondRankOptionIds,['o3','o2']);
});
test('U08-06/07 nulls in inactive rows survive and all failures return no partial comparison',()=>{
  const doc=documentFor([[5,null],[3,null]],[{direction:'benefit',weight:1},{direction:'cost',weight:0}]);
  const value=compareLeadingPair(doc).value;
  assert.equal(value.totalWeight,1);assert.equal(value.totalDeltaScore,50);
  assert.deepEqual(value.criteria[1],{criterionId:'c2',weight:0,direction:'cost',firstRawScore:null,secondRawScore:null,firstNumerator:0,secondNumerator:0,deltaNumerator:0,firstContribution:0,secondContribution:0,deltaContribution:0,active:false});
  doc.criteria[0].weight=0;assert.deepEqual(compareLeadingPair(doc),{ok:false,code:'ZERO_WEIGHT'});
  doc.criteria[0].weight=1;doc.scores[0].values[0]=null;
  assert.deepEqual(compareLeadingPair(doc),{ok:false,code:'MISSING_SCORES',missingCount:1});
  doc.title='';assert.deepEqual(compareLeadingPair(doc),{ok:false,code:'INVALID_LABEL'});
  doc.title='Synthetic';doc.criteria[0].weight=101;assert.deepEqual(compareLeadingPair(doc),{ok:false,code:'INVALID_WEIGHT'});
});
test('U08-08 eight rounded rows total 25.04 while the exact total difference remains 25.00',()=>{
  const doc=documentFor([Array(8).fill(2),Array(8).fill(1)],Array.from({length:8},()=>({direction:'benefit',weight:1})));
  const value=compareLeadingPair(doc).value;
  assert.equal(value.totalWeight,8);assert.equal(value.totalDeltaNumerator,8);
  assert.equal(value.totalDeltaScore.toFixed(2),'25.00');
  assert.deepEqual(value.criteria.map(row=>row.deltaContribution),Array(8).fill(3.125));
  assert.deepEqual(value.criteria.map(row=>formatSignedPoints(row.deltaContribution)),Array(8).fill('+3.13'));
  near(value.criteria.reduce((sum,row)=>sum+Number(row.deltaContribution.toFixed(2)),0),25.04);
});
test('U08-10 comparison cannot change schemaVersion 1 or normalized UTF-8 serialization bytes',()=>{
  const doc=baseline();doc.options[0].label='<img src=x onerror=alert(1)>';
  const before=serializeDocument(doc).value;
  const comparison=compareLeadingPair(doc);assert.equal(comparison.ok,true);
  const after=serializeDocument(doc).value;assert.deepEqual(after,before);
  const parsed=parseImportBytes(after);assert.equal(parsed.ok,true);assert.deepEqual(parsed.value,doc);
  assert.deepEqual(Object.keys(parsed.value),['schemaVersion','title','options','criteria','scores']);
  assert.equal(after.byteLength,new TextEncoder().encode(JSON.stringify(doc,null,2)+'\n').byteLength);
});
test('U08-11 bounded independent oracle: weights 0/1/100, both directions, every score 1..5',()=>{
  let cases=0;
  for(const w1 of [0,1,100])for(const w2 of [0,1,100])
  for(const d1 of ['benefit','cost'])for(const d2 of ['benefit','cost'])
  for(let a=1;a<=5;a++)for(let b=1;b<=5;b++){
    const doc=frozen(documentFor([[w1?a:null,w2?b:null],[w1?6-a:null,w2?6-b:null]],[{direction:d1,weight:w1},{direction:d2,weight:w2}]));
    const original=JSON.stringify(doc),result=compareLeadingPair(doc),W=w1+w2;
    assert.equal(JSON.stringify(doc),original);cases++;
    if(W===0){assert.deepEqual(result,{ok:false,code:'ZERO_WEIGHT'});continue;}
    const rawParts=doc.scores.map(row=>row.values.map((score,j)=>doc.criteria[j].weight===0?0:doc.criteria[j].weight*(doc.criteria[j].direction==='cost'?5-score:score-1)));
    const totals=rawParts.map(row=>row.reduce((sum,n)=>sum+n,0));
    const first=totals[1]>totals[0]?1:0,second=1-first,value=result.value;
    assert.equal(value.firstOptionId,doc.options[first].id);assert.equal(value.secondOptionId,doc.options[second].id);
    assert.equal(value.totalDeltaNumerator,totals[first]-totals[second]);
    assert.equal(value.criteria.reduce((sum,row)=>sum+row.deltaNumerator,0),value.totalDeltaNumerator);
    near(value.totalDeltaScore,25*(totals[first]-totals[second])/W);
    near(value.criteria.reduce((sum,row)=>sum+row.deltaContribution,0),value.totalDeltaScore);
    assert.deepEqual(value.ranked,scoreDocument(doc).value.ranked);
    value.criteria.forEach((row,j)=>{
      assert.equal(row.firstRawScore,doc.scores[first].values[j]);assert.equal(row.secondRawScore,doc.scores[second].values[j]);
      assert.equal(row.deltaNumerator,rawParts[first][j]-rawParts[second][j]);
      for(const number of [row.firstNumerator,row.secondNumerator,row.deltaNumerator])assert.equal(Number.isSafeInteger(number),true);
      for(const number of [row.firstContribution,row.secondContribution,row.deltaContribution,value.totalDeltaScore])assert.equal(Number.isFinite(number),true);
    });
  }
  assert.equal(cases,900);
});
