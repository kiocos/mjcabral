// Paragraph-wide line breaking using widths supplied by Pretext.
// The optimization approach follows its MIT-licensed justification example.
import portuguese from 'hyphen/pt/index.js';

const { hyphenateSync } = portuguese;

const syllables = new Map();
function hyphenationPoints(word) {
  if (!syllables.has(word)) {
    const points = [];
    if (word.length >= 6 && !/(.)\1\1/iu.test(word)) {
      let position = 0;
      for (const part of hyphenateSync(word).split('\u00ad').slice(0, -1)) {
        position += part.length;
        if (position >= 2 && word.length - position >= 2) points.push(position);
      }
    }
    syllables.set(word, points);
  }
  return syllables.get(word);
}

export function prepareParagraph(text, runs, measure) {
  const fragments = (start, end) => runs.flatMap(run => {
    const left = Math.max(start, run.start), right = Math.min(end, run.end);
    return right > left ? [{ text: text.slice(left, right), italic: run.italic }] : [];
  });
  const widthCache = new Map();
  const widthOf = (start, end) => {
    const key = `${start}:${end}`;
    if (!widthCache.has(key)) {
      widthCache.set(key, fragments(start, end).reduce((sum, part) => sum + measure(part.text, part.italic), 0));
    }
    return widthCache.get(key);
  };
  // Ordinary spaces may wrap. Nonbreaking dialogue spaces stay inside a token.
  const words = Array.from(text.matchAll(/[^ ]+/gu), match => ({ start: match.index, end: match.index + match[0].length }));
  const prefix = [0];
  const breaks = [{ word: 0, offset: 0, end: 0, next: 0, kind: 'start' }];
  words.forEach((word, index) => {
    prefix.push(prefix.at(-1) + widthOf(word.start, word.end));
    const value = text.slice(word.start, word.end);
    // Preserve compound spellings and avoid an isolated final syllable.
    if (index < words.length - 1 && !value.includes('-')) {
      for (const match of value.matchAll(/\p{L}{6,}/gu)) {
        for (const point of hyphenationPoints(match[0])) {
          const offset = match.index + point;
          breaks.push({ word: index, offset, end: word.start + offset, next: word.start + offset, kind: 'hyphen' });
        }
      }
    }
    const last = index === words.length - 1;
    breaks.push({ word: index + 1, offset: 0, end: word.end, next: last ? text.length : words[index + 1].start, kind: last ? 'end' : 'space' });
  });

  function stats(from, to) {
    const start = words[from.word].start + from.offset;
    const lastWord = to.kind === 'hyphen' ? to.word : to.word - 1;
    let ink;
    if (from.word === lastWord) ink = widthOf(start, to.end);
    else {
      ink = prefix[lastWord + 1] - prefix[from.word];
      if (from.offset) ink += widthOf(start, words[from.word].end) - widthOf(words[from.word].start, words[from.word].end);
      if (to.kind === 'hyphen') ink += widthOf(words[lastWord].start, to.end) - widthOf(words[lastWord].start, words[lastWord].end);
    }
    const italic = runs.find(run => run.start <= to.end - 1 && run.end >= to.end)?.italic || false;
    if (to.kind === 'hyphen') ink += measure('-', italic);
    return { ink, gaps: lastWord - from.word, italic };
  }
  return { text, fragments, breaks, stats, space: measure('\u00a0', false) };
}

export function composeParagraph(paragraph, width, indent, maxHyphens = 2) {
  const { breaks, space } = paragraph;
  if (breaks.length < 2 || width <= 0 || space <= 0) return null;
  const states = breaks.map(() => Array(maxHyphens + 1).fill(null));
  states[0][0] = { cost: 0 };

  for (let end = 1; end < breaks.length; end++) {
    const to = breaks[end], final = to.kind === 'end';
    for (let start = end - 1; start >= 0; start--) {
      const from = breaks[start];
      const available = width - (start === 0 ? indent : 0);
      const { ink, gaps, italic } = paragraph.stats(from, to);
      if (ink + gaps * space * (final ? 1 : 0.85) > available + 0.01) break;
      const natural = ink + gaps * space;
      const requested = gaps ? (available - ink) / gaps : space;
      // Short/awkward lines may have a modest ragged edge instead of a river.
      const spacing = final ? space : Math.min(space * 2.5, requested);
      if (spacing < space * 0.85) continue;
      const slack = Math.max(0, available - ink - gaps * spacing);
      let cost = 8;
      if (final) {
        if (start && natural < available * 0.22) cost += 240 * (1 - natural / (available * 0.22));
      } else {
        cost += 120 * Math.abs(spacing / space - 1) ** 3;
        if (slack > 0.5) cost += 1800 + 20 * (slack / space) ** 2;
      }
      if (to.kind === 'hyphen') cost += 35;
      for (let run = 0; run <= maxHyphens; run++) {
        const previous = states[start][run];
        if (!previous) continue;
        const nextRun = to.kind === 'hyphen' ? run + 1 : 0;
        if (nextRun > maxHyphens) continue;
        const total = previous.cost + cost + (nextRun > 1 ? 65 : 0);
        if (!states[end][nextRun] || total < states[end][nextRun].cost) {
          states[end][nextRun] = {
            cost: total, previous: start, previousRun: run,
            line: { start: from.next, end: to.end, next: to.next, hyphen: to.kind === 'hyphen', italic,
              indent: start === 0 ? indent : 0, spacing, natural, available, gaps },
          };
        }
      }
    }
  }
  let index = breaks.length - 1, run = 0;
  if (!states[index][run]) return null;
  const lines = [];
  while (index) {
    const state = states[index][run];
    lines.push(state.line);
    index = state.previous;
    run = state.previousRun;
  }
  return lines.reverse();
}
