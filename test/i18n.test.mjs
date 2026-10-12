import test from 'node:test';
import assert from 'node:assert/strict';
import { messages, translate, formatSignedPoints } from '../public/js/i18n.mjs';
import { readFile } from 'node:fs/promises';
test('T03-L10N full locale keys, errors and placeholders agree', () => {
  assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages['zh-Hant']).sort());
  assert.deepEqual(Object.keys(messages.en.errors).sort(),Object.keys(messages['zh-Hant'].errors).sort());
  for(const key of Object.keys(messages.en))if(typeof messages.en[key]==='string')assert.deepEqual(messages.en[key].match(/\{[a-z]+\}/gu)||[],messages['zh-Hant'][key].match(/\{[a-z]+\}/gu)||[]);
  assert.equal(translate('en','missing',{count:4}),'Score every active criterion. 4 cells still need a score.');
});
test('U08 bilingual tie, full groups, sign and rounding copy describe the same comparison',()=>{
  const pair={first:'A',second:'B',delta:'0.00'};
  assert.equal(translate('zh-Hant','comparisonTie',pair),'A 與 B 並列，總分差 0.00 分。');
  assert.equal(translate('en','comparisonTie',pair),'A and B are tied; their total difference is 0.00 points.');
  for(const locale of ['zh-Hant','en']){
    const group=translate(locale,'comparisonFirstGroup',{names:['A','B','C'].join(messages[locale].comparisonNameSeparator),rank:1,first:'A',second:'B'});
    assert.ok(group.includes('C'));assert.ok(group.includes('1'));assert.ok(!messages[locale].rounding.includes('0.01'));
  }
  assert.deepEqual([formatSignedPoints(100/3),formatSignedPoints(-100/3),formatSignedPoints(0),formatSignedPoints(-0)],['+33.33','−33.33','0.00','0.00']);
});
test('T03-L10N static bilingual pages and matching-language home',async()=>{
  for(const [path,lang,home] of [['index.html','zh-Hant','https://glossquote.com/index.html'],['en/index.html','en','https://glossquote.com/en/index.html']]){
    const html=await readFile(new URL('../public/'+path,import.meta.url),'utf8');assert.ok(html.includes(`<html lang="${lang}">`));assert.ok(html.includes(`href="${home}"`));assert.match(html,/<h1>/u);assert.match(html,/noindex, nofollow/u);
  }
});
