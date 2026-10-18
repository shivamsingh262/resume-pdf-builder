'use strict';
// Build pipeline: resume.json -> validated data -> HTML -> PDF.

const fs = require('fs');
const path = require('path');
const { UserError } = require('./errors');
const { loadConfig } = require('./config');
const { loadPhoto } = require('./assets');
const { resolveRenderOptions, renderHtml } = require('./render');
const { renderPdf, launchBrowser } = require('./pdf');

const BASENAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

// Writes via a temporary file so a failed build never leaves a truncated file.
function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, file);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw new UserError(`Could not write ${file}: ${err.code || err.message}`);
  }
}

// Options:
//   config     path to the resume JSON file (required)
//   theme, color, pageSize   overrides for the config's "theme" block
//   outDir     output directory (default "output", relative to the cwd)
//   name       output file name without extension (default: config file name)
//   pdf        false to write HTML only
//   browser / launch   passed through to renderPdf()
async function build(options) {
  const { resume, theme: themeConfig, configDir, configName } = loadConfig(options.config);
  const render = resolveRenderOptions(
    { name: options.theme, accentColor: options.color, pageSize: options.pageSize },
    themeConfig
  );
  // Checked for every theme so a broken path is reported even when the
  // chosen theme doesn't display photos.
  const photo = resume.photo ? loadPhoto(resume.photo, configDir) : null;

  const name = options.name || configName.replace(/\.json$/i, '');
  if (!BASENAME_RE.test(name)) {
    throw new UserError(`Invalid output name "${name}"`, {
      hint: 'Use letters, digits, ".", "_" and "-" only (no slashes); it must start with a letter or digit.',
    });
  }

  const renderVariant = (singlePage) => renderHtml(resume, { ...render, photo, singlePage });

  const outDir = path.resolve(options.outDir || 'output');
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    throw new UserError(`Could not create output directory ${outDir}: ${err.code || err.message}`);
  }
  const htmlPath = path.join(outDir, `${name}.html`);
  const result = { htmlPath, theme: render.theme.name, accent: render.accent, pageSize: render.page.name, warnings: [] };

  // The multi-page variant is always safe to print, so it is what --html-only
  // writes and what is written before attempting the PDF.
  let html = renderVariant(false);
  writeAtomic(htmlPath, html);
  if (options.pdf === false) return result;

  const browser = options.browser || (await launchBrowser(options.launch));
  let printed;
  try {
    const pdfOptions = { page: render.page, browser };
    if (render.theme.hasSinglePageVariant) {
      // Try the theme's exact one-page layout first; keep it only if it fits.
      const singleHtml = renderVariant(true);
      const single = await renderPdf(singleHtml, pdfOptions);
      if (single.pageCount === 1) {
        printed = single;
        html = singleHtml;
        writeAtomic(htmlPath, html);
      }
    }
    if (!printed) printed = await renderPdf(html, pdfOptions);
  } finally {
    if (!options.browser) await browser.close().catch(() => {});
  }

  result.pdfPath = path.join(outDir, `${name}.pdf`);
  writeAtomic(result.pdfPath, printed.pdf);
  result.pageCount = printed.pageCount;
  result.warnings = printed.warnings;
  return result;
}

module.exports = { build };
