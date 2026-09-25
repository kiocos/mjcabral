# O jogo da salvação

A static reading page for the conto by Matheus José Cabral. The published page contains its title, author, and complete text, with fine rules beside the author's name and a small dithered sphere at the end.

The generated page is static. To install the development dependencies and build it:

```sh
npm ci
npm run build
npm start
```

Then open http://localhost:8008. You can also serve the generated files with any static HTTP server, or open `index.html` directly.

## Editing

The text lives in `conto.md`, transcribed from the updated PDF with its 87 paragraphs and italic emphasis preserved. Its first block is the title, its second block is the author, and subsequent blocks are paragraphs. Single-asterisk emphasis (`*supondo*`) is supported. The small Python builder intentionally supports only the Markdown this story needs and writes the complete story into `index.html`.

The builder applies reading rules without changing the Markdown: dialogue dashes stay with the word they introduce, and closing dashes with punctuation stay with the preceding word. Short dialogue openings also have explicit protection for Safari at enlarged text sizes. Paragraph-final words are not automatically hyphenated. The first paragraph has the same indent as subsequent paragraphs. Screen line spacing is 1.55; print spacing is 1.45.

`reader.js` uses [Pretext](https://github.com/chenglou/pretext) to measure Literata after the fonts load. `typesetting.js` evaluates line breaks across each complete paragraph, using Portuguese dictionary patterns from [hyphen](https://github.com/ytiurin/hyphen). It balances word spaces, limits consecutive hyphenated lines, and caps spaces at 2.5 times their natural width. If a short line cannot fill the column within that limit, it keeps a modest ragged edge instead of stretching the words excessively. Final words and compound spellings remain intact. This approach is informed by Pretext's justification demo; its license is included in `assets/licenses/`.

The enhanced paragraphs remain selectable HTML with semantic emphasis. Inline spans and soft wrapping preserve native browser search, including words split across lines. Copying a passage preserves its original words and paragraph breaks without discretionary hyphens. Line layouts are recalculated on resize and font-size changes, reusing cached measurements; text selections are preserved. Printing uses the original HTML and A5 stylesheet. Disabled JavaScript, unavailable measurement APIs, and paragraphs with no feasible layout retain native CSS wrapping.

After editing the text, styles, or reader code, regenerate the browser bundle and HTML:

```sh
npm run build
npm test
python3 build.py --check
```

Typography and colors live in `style.css`. The entire page uses Literata, with a column width tuned for approximately 60 characters per full desktop line. Phone layouts fit the available screen width. The font is fixed and works without JavaScript. Generated asset URLs include content hashes so HTML updates load the matching styles and reader bundle.

`theme.js` provides the small moon/sun button at the top right of the reading column. It switches between warm paper and a dark charcoal theme, adapting the text, rules, selection color, and endpiece line. The sphere keeps its original dark gray on paper. In the dark theme, its upper-left face catches a warm pale light, while its right side falls into a softer charcoal shadow; both are drawn directly with ordered dithering. The choice is saved locally and applied before the page paints; storage restrictions do not prevent toggling. Without JavaScript the button stays hidden. Printing always uses the light layout.

`endpiece.js` draws a single dark gray sphere, echoing the spheres in the story. Ordered Bayer dithering takes visual inspiration from [Cult UI's dithering example](https://www.cult-ui.com/docs/components/hero-dithering). The sphere occupies a 96 × 112 pixel box and is about 59 pixels across, with a horizontal line, 1.5 pixels thick, behind it that softly fades into the paper. The line extends to 384 pixels on desktop and fits within the reading column on phones. The surface stays fixed while the sphere gently floats on an eight-second cycle. There is no ripple or shadow underneath. Motion pauses offscreen and in a hidden tab; reduced-motion preferences keep it still. It uses a small 2D canvas with no graphics libraries or external requests and is decorative and hidden from assistive technology.

`assets/endpiece.svg` and `assets/endpiece-dark.svg` preserve each theme's still frame for unavailable canvas rendering. Printing and disabled JavaScript use the light version. Regenerate these assets from the resting canvas in each theme if the illustration changes.

[Literata](https://github.com/googlefonts/literata) is served locally under the SIL Open Font License. Its license and regular and italic Latin webfont subsets, including the Portuguese characters used in the story, are in `assets/fonts/`. The page makes no external requests.

## Publishing

Run `npm run build` to generate `public/`, containing `index.html`, `style.css`, `theme.js`, `endpiece.js`, and `assets/`. This generated directory is recreated on every build and is ignored by Git. Upload its contents to any static host. The browser bundle includes Pretext and Portuguese hyphenation; the published site needs no Node server, CDN, or `node_modules/`. The PDF, Markdown, build scripts, and tests stay outside the published directory.

For Vercel, import the repository with the project root set to its root directory (`.`). The checked-in [vercel.json](vercel.json) selects the **Other** framework preset, installs with `npm ci`, builds with `npm run build`, and publishes `public/`. These settings override the corresponding dashboard values, as described in the [Vercel configuration reference](https://vercel.com/docs/project-configuration/vercel-json). No environment variables are required. Builds use Node.js and Python 3; Python is only used to generate the static HTML. The pinned esbuild installation script is explicitly allowed in `package.json` for npm versions that require approval.

After committing and pushing these files, deploy the new commit in Vercel. To inspect the same output locally, run `npm run build` followed by `npm run preview`, then open http://localhost:8009. `npm start` continues to serve the working files on port 8008.

The stylesheet also includes an A5 print layout.
