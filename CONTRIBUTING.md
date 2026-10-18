# Contributing

Thanks for helping out! This is a small project, so the process is light.

## Setup

```sh
nvm use            # Node 22 (see .nvmrc); any Node >= 22.13 works
npm install        # also downloads Chromium for Puppeteer
npm test
npm run build:example
```

## Project layout

```
build-pdf.js          CLI (argument parsing and output only)
src/
  config.js           read + parse resume JSON
  validate.js         schema validation and normalization
  render.js           theme / color / page-size resolution, HTML rendering
  pdf.js              Chromium printing
  build.js            pipeline: config -> HTML -> PDF files
  assets.js           fonts and photo loading (path and type checks)
  html.js, color.js, page.js, errors.js
themes/
  index.js            theme registry
  sidebar/index.js    default theme
  minimal/index.js    single-column theme
test/                 node:test suites and fixtures
docs/                 README previews and sample PDF (fictional data only)
```

## Tests

- `npm test` runs everything, including the end-to-end PDF tests.
- `npm run test:unit` skips Chromium.
- Add a test for every bug fix and for new validation rules.
- Never put real personal data in fixtures. Use `example.com` addresses,
  `555` phone numbers and companies marked "(fictional)".

## Adding or changing a theme

A theme is a module in `themes/<name>/index.js` that exports:

```js
module.exports = {
  name: 'mytheme',            // used with --theme
  description: 'One line for --list-themes',
  defaultAccent: '#1a2b4c',   // lowercase #rrggbb
  showsPhoto: false,          // if false, `photo` is always null for this theme
  hasSinglePageVariant: false, // see below
  render({ resume, accent, page, photo, singlePage }) {
    return { css: '...', body: '...' };
  },
};
```

Then add it to `themes/index.js`.

`render()` receives:

- `resume`: validated, normalized data. Optional sections are always arrays;
  optional strings are `undefined` when absent; `linkedin` and `github` are
  `{ url, label }`.
- `accent`: a validated `#rrggbb` color that has at least 4.5:1 contrast
  against white.
- `page`: an entry from `src/page.js` (`width`, `height`, `widthPx`,
  `heightPx`). Use `page.width`/`page.height` in your `@page` rule.
- `photo`: a `data:` URI or `null`.
- `singlePage`: `true` when the build is trying the theme's one-page variant
  (only if `hasSinglePageVariant` is set).

Rules:

1. **Escape every user value** with `escapeHtml` from `src/html.js`, including
   inside attributes. Only `photo` (a generated `data:` URI) and `accent` (a
   validated hex color) may be inserted unescaped.
2. **No scripts and no external resources.** The CSP blocks them anyway.
   Fonts are provided by the shell (`Inter`, `Source Serif 4`).
3. **Define page size and margins in `@page`** using `page.width` and
   `page.height`. If a background has to reach the paper edge, use
   `@page { margin: 0 }` and get spacing from padding with
   `box-decoration-break: clone`, as `sidebar` does; Chromium doesn't paint
   backgrounds into `@page` margins.
4. Add `break-inside: avoid` / `break-after: avoid` to entries and headings so
   they don't split awkwardly.
5. Add the theme to the loops in `test/render.test.js` and `test/pdf.test.js`
   that iterate over all themes, and document it in the README.

Changes to the `sidebar` theme must keep `test/pdf.test.js`'s pixel comparison
with the original design passing, unless the change is an intentional
redesign discussed in an issue first.

## Bug reports

Open an issue with:

- what you ran (`node build-pdf.js ...`) and the full output,
- `node -v` and your OS,
- a minimal resume JSON that reproduces the problem. Please use fictional
  data.

## Pull requests

- Keep changes focused; one topic per PR.
- Run `npm test` before opening the PR. CI runs it on Node 22 and 24.
- Update README.md when you change behavior, options or the schema.
- Avoid adding dependencies unless they clearly pull their weight.
