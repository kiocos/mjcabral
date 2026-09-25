import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareParagraph, composeParagraph } from '../typesetting.js';

const measure = text => Array.from(text).reduce((width, c) => width + (/[ \u00a0]/u.test(c) ? 4 : 9), 0);
const prepare = text => prepareParagraph(text, [{ start: 0, end: text.length, italic: false }], measure);

function checkSource(text, lines) {
  assert.ok(lines?.length);
  assert.equal(lines.map(line => text.slice(line.start, line.next)).join(''), text);
  for (const line of lines) {
    assert.ok(line.spacing >= 3.4 && line.spacing <= 10);
    const visible = text.slice(line.start, line.end);
    const gaps = (visible.match(/ /g) || []).length;
    const width = measure(visible) + gaps * (line.spacing - 4) + (line.hyphen ? 9 : 0);
    assert.ok(width <= line.available + 0.01);
    assert.ok(!text.slice(line.start, line.end).trimEnd().endsWith('—'));
  }
}

test('preserves Portuguese text and protected dialogue across responsive widths', () => {
  const text = '—\u00a0Infelizmente, ele não está mais aqui para ver isso —\u00a0a criatura disse, puxando de longe para a sua mão a esfera vermelha.';
  const paragraph = prepare(text);
  for (const width of [160, 272, 342, 690]) {
    const lines = composeParagraph(paragraph, width, 20, 3);
    checkSource(text, lines);
    assert.equal(lines[0].indent, 20);
    assert.ok(lines.slice(1).every(line => line.indent === 0));
    let hyphens = 0;
    for (const line of lines) { hyphens = line.hyphen ? hyphens + 1 : 0; assert.ok(hyphens <= 3); }
    assert.equal(lines.at(-1).hyphen, false);
  }
});

test('preserves italic fragments when a paragraph is recomposed', () => {
  const text = 'Apenas supondo que a escolha seria correta.';
  const start = text.indexOf('supondo'), end = start + 7;
  const paragraph = prepareParagraph(text, [
    { start: 0, end: start, italic: false },
    { start, end, italic: true },
    { start: end, end: text.length, italic: false },
  ], measure);
  const lines = composeParagraph(paragraph, 180, 12);
  checkSource(text, lines);
  assert.equal(lines.flatMap(line => paragraph.fragments(line.start, line.next)).filter(part => part.italic).map(part => part.text).join(''), 'supondo');
});

test('bounds word spacing in short paragraphs without hyphenating the final word', () => {
  const text = 'José achou aquilo muito estranho.';
  const paragraph = prepare(text);
  const lines = composeParagraph(paragraph, 210, 15);
  checkSource(text, lines);
  assert.ok(lines.every(line => !line.hyphen || line.end < text.indexOf('estranho')));
});

test('defers to native wrapping when an unbreakable token cannot fit', () => {
  assert.equal(composeParagraph(prepare('—\u00a0José'), 20, 0), null);
});
