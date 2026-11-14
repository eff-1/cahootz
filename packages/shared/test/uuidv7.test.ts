import test from 'node:test';
import assert from 'node:assert';
import { uuidv7, uuidv7Timestamp, isUuid } from '../src/ids/uuidv7.ts';

test('uuidv7 has correct version and variant bits', () => {
  for (let i = 0; i < 200; i++) {
    const id = uuidv7();
    assert.ok(isUuid(id), `not a uuid: ${id}`);
    assert.strictEqual(id[14], '7', 'version nibble must be 7');
    assert.ok(['8', '9', 'a', 'b'].includes(id[19]!), 'variant must be 10xx');
  }
});

test('uuidv7 embeds the millisecond timestamp', () => {
  const t = Date.UTC(2026, 10, 14, 21, 0, 0, 123);
  assert.strictEqual(uuidv7Timestamp(uuidv7(t)), t);
});

test('uuidv7 ids sort by creation time across milliseconds', () => {
  const ids = [uuidv7(1000), uuidv7(2000), uuidv7(3000)];
  assert.deepStrictEqual([...ids].sort(), ids);
});

test('uuidv7 is unique across many generations', () => {
  const set = new Set<string>();
  for (let i = 0; i < 10000; i++) set.add(uuidv7());
  assert.strictEqual(set.size, 10000);
});

