import { prepareWithSegments, measureNaturalWidth, clearCache } from '@chenglou/pretext';
import { prepareParagraph, composeParagraph } from './typesetting.js';

async function startReader() {
  const story = document.querySelector('.story');
  if (!story || !Intl.Segmenter || !window.ResizeObserver || !document.createElement('canvas').getContext('2d')) return;
  await document.fonts.ready;
  const paragraphs = Array.from(story.querySelectorAll('p'), element => {
    const runs = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let text = '', node;
    while ((node = walker.nextNode())) {
      runs.push({ start: text.length, end: text.length + node.length, italic: !!node.parentElement.closest('em') });
      text += node.data;
    }
    return { element, text, runs, original: element.innerHTML, prepared: null };
  });
  const widths = new Map();
  const print = matchMedia('print');
  let fontKey = '', layoutKey = '', request = 0;

  function restore() {
    paragraphs.forEach(p => {
      p.element.classList.remove('is-typeset');
      p.element.innerHTML = p.original;
    });
    delete story.dataset.typeset;
    layoutKey = '';
  }

  function selectionPoint(node, offset) {
    const index = paragraphs.findIndex(p => p.element.contains(node));
    if (index < 0) return { node, offset };
    const range = document.createRange();
    range.selectNodeContents(paragraphs[index].element);
    range.setEnd(node, offset);
    return { index, offset: range.toString().length };
  }

  function resolvePoint(point) {
    if (point.node) return [point.node, point.offset];
    const walker = document.createTreeWalker(paragraphs[point.index].element, NodeFilter.SHOW_TEXT);
    let remaining = point.offset, node;
    while ((node = walker.nextNode())) {
      if (remaining <= node.length) return [node, remaining];
      remaining -= node.length;
    }
    return [paragraphs[point.index].element, 0];
  }

  function render(paragraph, lines, space) {
    const result = document.createDocumentFragment();
    for (const line of lines) {
      const row = document.createElement('span');
      row.className = 'typeset-line';
      row.style.marginInlineStart = `${line.indent}px`;
      row.style.wordSpacing = `${line.spacing - space}px`;
      const final = line === lines.at(-1);
      if (!final) {
        const slack = line.available - line.natural - line.gaps * (line.spacing - space);
        row.style.paddingInlineEnd = `${Math.max(0, slack)}px`;
      }
      const lineText = paragraph.text.slice(line.start, line.end);
      for (const match of lineText.matchAll(/ +|[^ ]+/gu)) {
        if (match[0][0] === ' ') { row.append(document.createTextNode(match[0])); continue; }
        const word = document.createElement('span');
        word.className = 'typeset-word';
        const start = line.start + match.index;
        for (const fragment of paragraph.prepared.fragments(start, start + match[0].length)) {
          if (fragment.italic) {
            const emphasis = document.createElement('em');
            emphasis.textContent = fragment.text;
            word.append(emphasis);
          } else word.append(document.createTextNode(fragment.text));
        }
        row.append(word);
      }
      if (line.hyphen) {
        const hyphen = document.createElement('span');
        hyphen.className = 'typeset-hyphen';
        hyphen.setAttribute('aria-hidden', 'true');
        if (line.italic) hyphen.style.fontStyle = 'italic';
        row.append(hyphen);
      }
      result.append(row);
      // Soft wrapping keeps hyphenated words searchable across visual lines.
      // Preserve source spaces outside the row so trailing padding cannot trap them.
      result.append(document.createTextNode(paragraph.text.slice(line.end, line.next)));
      if (!final) result.append(document.createElement('wbr'));
    }
    return result;
  }

  function typeset() {
    request = 0;
    if (print.matches) return;
    const style = getComputedStyle(paragraphs[0].element);
    const width = story.getBoundingClientRect().width;
    const size = parseFloat(style.fontSize);
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const key = `${width}:${font}:${style.lineHeight}`;
    if (key === layoutKey || !width) return;
    // Preserve a selected passage when its lines change after a resize.
    const selection = getSelection();
    const selected = selection?.rangeCount && (story.contains(selection.anchorNode) || story.contains(selection.focusNode))
      ? [selectionPoint(selection.anchorNode, selection.anchorOffset), selectionPoint(selection.focusNode, selection.focusOffset)] : null;
    const indent = Math.min(size * 1.25, width * 0.06);
    const measure = (text, italic) => {
      const resolvedFont = `${italic ? 'italic ' : ''}${font}`;
      const id = `${resolvedFont}\n${text}`;
      if (!widths.has(id)) widths.set(id, measureNaturalWidth(prepareWithSegments(text, resolvedFont)));
      return widths.get(id);
    };
    if (font !== fontKey) {
      paragraphs.forEach(p => { p.prepared = prepareParagraph(p.text, p.runs, measure); });
      fontKey = font;
    }
    // Measure first, then update the DOM together. No per-line layout reads.
    const updates = paragraphs.map(p => {
      const lines = composeParagraph(p.prepared, width, indent, width < 500 ? 3 : 2);
      return lines ? render(p, lines, p.prepared.space) : null;
    });
    updates.forEach((fragment, index) => {
      const p = paragraphs[index];
      if (fragment) {
        p.element.replaceChildren(fragment);
        p.element.classList.add('is-typeset');
      } else {
        p.element.innerHTML = p.original;
        p.element.classList.remove('is-typeset');
      }
    });
    story.dataset.typeset = 'pretext';
    layoutKey = key;
    if (selected) selection.setBaseAndExtent(...resolvePoint(selected[0]), ...resolvePoint(selected[1]));
  }

  function schedule() {
    if (request) cancelAnimationFrame(request);
    request = requestAnimationFrame(() => {
      try { typeset(); }
      catch (error) { restore(); console.warn('Native text layout retained:', error); }
    });
  }

  // Copy the source text, not the visual line breaks or generated hyphens.
  story.addEventListener('copy', event => {
    const selection = getSelection();
    if (!event.clipboardData || !selection?.rangeCount || !story.contains(selection.anchorNode) || !story.contains(selection.focusNode)) return;
    const fragment = selection.getRangeAt(0).cloneContents();
    const plain = node => node.nodeType === Node.TEXT_NODE
      ? (/^[\t \r\n]+$/u.test(node.data) && /[\r\n]/u.test(node.data) ? '' : node.data)
      : Array.from(node.childNodes, plain).join('') + (node.nodeName === 'P' ? '\n\n' : '');
    event.clipboardData.setData('text/plain', plain(fragment).replace(/\n\n$/, '').replaceAll('\u00a0', ' '));
    event.preventDefault();
  });
  new ResizeObserver(schedule).observe(story);
  window.addEventListener('resize', schedule);
  document.addEventListener('selectionchange', () => { if (getSelection()?.isCollapsed) schedule(); });
  document.fonts.addEventListener('loadingdone', () => {
    clearCache(); widths.clear(); fontKey = ''; layoutKey = ''; schedule();
  });
  window.addEventListener('beforeprint', restore);
  window.addEventListener('afterprint', schedule);
  print.addEventListener('change', () => print.matches ? restore() : schedule());
  schedule();
}

startReader().catch(error => console.warn('Native text layout retained:', error));
