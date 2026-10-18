'use strict';
// Regenerates the README preview images and sample PDF in docs/ from the
// fictional resume.example.json. Run with: npm run previews

const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer');
const { build } = require('../src/build');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const EXAMPLE = path.join(ROOT, 'resume.example.json');

async function main() {
  fs.mkdirSync(DOCS, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-previews-'));
  const browser = await puppeteer.launch();
  try {
    for (const theme of ['sidebar', 'minimal']) {
      const result = await build({ config: EXAMPLE, theme, outDir: tmp, name: theme, browser });
      if (theme === 'sidebar') fs.copyFileSync(result.pdfPath, path.join(DOCS, 'example-resume.pdf'));

      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
      await page.emulateMediaType('print');
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
      await page.setContent(fs.readFileSync(result.htmlPath, 'utf8'));
      await page.evaluate(() => document.fonts.ready);
      // The minimal theme's page margins come from @page, which screenshots
      // ignore, so add the equivalent padding for the preview image.
      if (theme === 'minimal') await page.addStyleTag({ content: 'body { padding: 0.55in 0.65in; }' });
      await page.screenshot({ path: path.join(DOCS, `preview-${theme}.png`), clip: { x: 0, y: 0, width: 816, height: 1056 } });
      await page.close();
      console.log(`docs/preview-${theme}.png (${result.pageCount} page PDF)`);
    }
    console.log('docs/example-resume.pdf');
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
