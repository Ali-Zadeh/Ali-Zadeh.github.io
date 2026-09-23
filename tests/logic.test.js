const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAmount } = require('../logic.js');

test('parseAmount treats typed digits as cents', () => {
    assert.equal(parseAmount('123'), 1.23);
});

test('parseAmount treats a longer digit run as rand and cents', () => {
    assert.equal(parseAmount('5000'), 50);
});

test('parseAmount pads a single digit to cents', () => {
    assert.equal(parseAmount('7'), 0.07);
});

test('parseAmount strips non-digit characters before reading cents', () => {
    assert.equal(parseAmount('12.3456'), 123456 / 100);
});

test('parseAmount rejects an empty string', () => {
    assert.equal(parseAmount(''), null);
});

test('parseAmount rejects zero', () => {
    assert.equal(parseAmount('0'), null);
});

test('parseAmount rejects an all-zero digit run', () => {
    assert.equal(parseAmount('00'), null);
});

test('parseAmount rejects input with no digits at all', () => {
    assert.equal(parseAmount('abc'), null);
});
