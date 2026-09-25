#!/usr/bin/env python3
"""Build the static reading page from conto.md using only the standard library."""

import argparse
import html
from hashlib import sha256
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent


def inline(text):
    """Render emphasis and keep dialogue punctuation with the words it introduces."""
    # Keep opening/narration dashes with the following word. A closing dash
    # followed by punctuation belongs to the preceding word instead.
    text = re.sub(r"— +", "—\u00a0", text)
    text = re.sub(r"(?<=—\u00a0)… +", "…\u00a0", text)
    text = re.sub(r" +(?=—[,.;:!?])", "\u00a0", text)
    rendered = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", html.escape(text))
    # Do not leave the last syllable of a paragraph alone on a new line.
    # The optional closing tag also preserves emphasis on a final word.
    rendered = re.sub(
        r"([^\s<>]+)(?=(?:</em>)?$)",
        r'<span class="end-word">\1</span>',
        rendered,
    )
    # Safari can disregard a no-break space after a dash at very large text
    # sizes. An inline group protects short opening words without preventing
    # legitimate hyphenation of longer ones.
    rendered = re.sub(
        r"—\u00a0[^\W\d_]{1,3}(?=[^\w]|$)",
        lambda match: f'<span class="dialogue-lead">{match[0]}</span>',
        rendered,
    )
    return rendered.replace("\u00a0", "&nbsp;")


def render():
    blocks = re.split(r"\n\s*\n", (ROOT / "conto.md").read_text(encoding="utf-8").strip())
    if len(blocks) < 3 or not blocks[0].startswith("# "):
        raise ValueError("conto.md must begin with a title, author, and story paragraphs.")

    title = html.escape(blocks[0][2:].strip())
    author = html.escape(blocks[1].strip())
    stylesheet_version = sha256((ROOT / "style.css").read_bytes()).hexdigest()[:12]
    reader_version = sha256((ROOT / "assets/reader.js").read_bytes()).hexdigest()[:12]
    theme_version = sha256((ROOT / "theme.js").read_bytes()).hexdigest()[:12]
    endpiece_version = sha256((ROOT / "endpiece.js").read_bytes()).hexdigest()[:12]
    paragraphs = "\n".join(
        f"        <p>{inline(' '.join(block.splitlines()))}</p>" for block in blocks[2:]
    )

    return f'''<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="author" content="{author}">
  <meta name="theme-color" content="#f5eedf">
  <meta name="color-scheme" content="light">
  <title>{title}</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <script src="theme.js?v={theme_version}"></script>
  <link rel="preload" href="assets/fonts/literata-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/fonts/reading-fonts.css">
  <link rel="stylesheet" href="style.css?v={stylesheet_version}">
  <script src="endpiece.js?v={endpiece_version}" defer></script>
  <script src="assets/reader.js?v={reader_version}" defer></script>
</head>
<body>
  <main>
    <article class="book" aria-labelledby="title">
      <button class="theme-toggle" type="button" aria-label="Ativar tema escuro" title="Ativar tema escuro" hidden>
        <span aria-hidden="true">☾</span>
      </button>
      <header class="title-page">
        <h1 id="title">{title}</h1>
        <p class="author">{author}</p>
      </header>
      <div class="story">
{paragraphs}
      </div>
      <div class="endpiece" id="endpiece" aria-hidden="true">
        <img class="endpiece-light" src="assets/endpiece.svg" alt="" width="96" height="112" loading="lazy">
        <img class="endpiece-dark" src="assets/endpiece-dark.svg" alt="" width="96" height="112" loading="lazy">
        <canvas width="72" height="84"></canvas>
      </div>
    </article>
  </main>
</body>
</html>
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check that index.html matches conto.md.")
    args = parser.parse_args()
    output = ROOT / "index.html"
    page = render()

    if args.check:
        if not output.exists() or output.read_text(encoding="utf-8") != page:
            parser.exit(1, "index.html is out of date. Run python3 build.py.\n")
        print("index.html matches its sources.")
    else:
        output.write_text(page, encoding="utf-8")
        print("Built index.html from conto.md.")


if __name__ == "__main__":
    main()
