import test from 'node:test';
import assert from 'node:assert/strict';
import { messages, translate } from '../public/js/i18n.mjs';
import { readFile } from 'node:fs/promises';
test('T03-L10N full locale keys, errors and placeholders agree', () => {
  assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages['zh-Hant']).sort());
  assert.deepEqual(Object.keys(messages.en.errors).sort(),Object.keys(messages['zh-Hant'].errors).sort());
  for(const key of Object.keys(messages.en))if(typeof messages.en[key]==='string')assert.deepEqual(messages.en[key].match(/\{[a-z]+\}/gu)||[],messages['zh-Hant'][key].match(/\{[a-z]+\}/gu)||[]);
  assert.equal(translate('en','missing',{count:4}),'Score every active criterion. 4 cells still need a score.');
});
test('T03-L10N static bilingual pages and matching-language home',async()=>{
  for(const [path,lang,home] of [['index.html','zh-Hant','https://glossquote.com/index.html'],['en/index.html','en','https://glossquote.com/en/index.html']]){
    const html=await readFile(new URL('../public/'+path,import.meta.url),'utf8');assert.ok(html.includes(`<html lang="${lang}">`));assert.ok(html.includes(`href="${home}"`));assert.match(html,/<h1>/u);assert.match(html,/noindex, nofollow/u);
  }
});
