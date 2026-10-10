import { validateDocument, fail } from './schema.mjs';
export const MAX_BYTES = 65536;

// Called only after JSON grammar validation. Iterative: arbitrary nesting never recurses.
export function scanJSONStructure(source) {
  const frames = [];
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      const start = i++;
      for (; i < source.length; i++) { if (source[i] === '\\') i++; else if (source[i] === '"') break; }
      const frame = frames.at(-1);
      if (frame?.type === 'object' && frame.expectKey) {
        const key = JSON.parse(source.slice(start, i + 1));
        if (frame.keys.has(key)) return fail('DUPLICATE_KEY');
        frame.keys.add(key);
      }
    } else if (char === '{' || char === '[') {
      frames.push(char === '{' ? { type: 'object', keys: new Set(), expectKey: true } : { type: 'array' });
      if (frames.length > 8) return fail('TOO_DEEP');
    } else if (char === '}' || char === ']') frames.pop();
    else if (char === ':' && frames.at(-1)?.type === 'object') frames.at(-1).expectKey = false;
    else if (char === ',' && frames.at(-1)?.type === 'object') frames.at(-1).expectKey = true;
  }
  return { ok: true };
}
export function parseImportBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) return fail('INVALID_SCHEMA');
  if (bytes.byteLength > MAX_BYTES) return fail('FILE_TOO_LARGE');
  let source, parsed;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return fail('INVALID_UTF8'); }
  try { parsed = JSON.parse(source); } catch { return fail('INVALID_JSON'); }
  const scanned = scanJSONStructure(source);
  return scanned.ok ? validateDocument(parsed) : scanned;
}
// Separate encoder injection used only by offline fault tests; import/schema never coerce.
export function serializeWithEncoder(doc, encoder) {
  const validated = validateDocument(doc);
  if (!validated.ok) return validated;
  try {
    const bytes = encoder.encode(JSON.stringify(validated.value, null, 2) + '\n');
    if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_BYTES) return fail('EXPORT_FAILED');
    return { ok: true, value: bytes };
  } catch { return fail('EXPORT_FAILED'); }
}
export function serializeDocument(doc) {
  try { return serializeWithEncoder(doc, new TextEncoder()); } catch { return fail('EXPORT_FAILED'); }
}
