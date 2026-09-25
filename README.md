# O jogo da salvação

A static reading page for the conto by Matheus José Cabral. The published page contains its title, author, and complete text, with fine rules beside the author's name and a small dithered sphere at the end.

Open `index.html` directly in a browser, or preview over HTTP:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Editing

The text lives in `conto.md`, transcribed from the original PDF with its 87 paragraphs and italic emphasis preserved. Its first block is the title, its second block is the author, and subsequent blocks are paragraphs. Single-asterisk emphasis (`*supondo*`) is supported. The small, dependency-free builder intentionally supports only the Markdown this story needs.

The builder applies reading rules to the HTML without changing the Markdown: opening dialogue dashes stay with the following word, closing dashes with punctuation stay with the preceding word, and short final words stay with their neighbors. Short dialogue openings also have explicit protection for Safari at enlarged text sizes. Paragraph-final words are not automatically hyphenated, avoiding isolated last syllables. Portuguese hyphenation is a little more permissive on phones to help justified spacing, and paragraph indents become shallower in narrow columns. Screen line spacing is 1.55; print spacing is 1.45. Line breaks remain responsive rather than fixed for one screen size.

After editing, regenerate the HTML:

```sh
python3 build.py
python3 build.py --check
```

Typography and colors live in `style.css`. The entire page uses Literata, with a column width tuned for approximately 60 characters per full desktop line. Phone layouts fit the available screen width. The font is fixed and works without JavaScript.

`endpiece.js` draws a single dark gray sphere, echoing the spheres in the story. Ordered Bayer dithering takes visual inspiration from [Cult UI's dithering example](https://www.cult-ui.com/docs/components/hero-dithering). The sphere occupies a 96 × 112 pixel box and is about 59 pixels across, with a horizontal line, 1.5 pixels thick, behind it that softly fades into the paper. The line extends to 384 pixels on desktop and fits within the reading column on phones. The surface stays fixed while the sphere gently floats on an eight-second cycle. There is no ripple or shadow underneath. Motion pauses offscreen and in a hidden tab; reduced-motion preferences keep it still. It uses a small 2D canvas with no graphics libraries or external requests and is decorative and hidden from assistive technology.

`assets/endpiece.svg` preserves the still frame for printing, disabled JavaScript, and unavailable canvas rendering. Regenerate that asset from the resting canvas if the illustration changes.

[Literata](https://github.com/googlefonts/literata) is served locally under the SIL Open Font License. Its license and regular and italic Latin webfont subsets, including the Portuguese characters used in the story, are in `assets/fonts/`. The page makes no external requests.

## Publishing

Upload `index.html`, `style.css`, `endpiece.js`, and `assets/` to any static host. No build service is needed. The PDF, Markdown, and build script are source files and do not need to be published.

The stylesheet also includes an A5 print layout.
