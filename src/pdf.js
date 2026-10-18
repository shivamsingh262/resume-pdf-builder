'use strict';
// Prints generated HTML to PDF with Puppeteer's bundled Chromium.

const { UserError } = require('./errors');

async function launchBrowser(launch) {
  try {
    if (launch) return await launch();
    const puppeteer = require('puppeteer');
    return await puppeteer.launch();
  } catch (err) {
    throw new UserError(`Could not start Chromium: ${firstLine(err.message)}`, {
      cause: err,
      hint: 'Run "npx puppeteer browsers install chrome" to (re)install the browser. On Linux, see "Troubleshooting" in README.md for sandbox and system-library issues.',
    });
  }
}

function firstLine(text) {
  return String(text).split('\n')[0];
}

// Counts pages in a Chromium-generated PDF by its page objects.
function countPdfPages(buffer) {
  return (buffer.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
}

// Renders `html` and returns { pdf: Buffer, pageCount, warnings }.
// Pass `browser` to reuse an already-running browser (used by the tests), or
// `launch` to customise how one is started.
async function renderPdf(html, { page: pageSize, browser, launch } = {}) {
  const ownBrowser = !browser;
  const b = browser || (await launchBrowser(launch));
  let tab;
  try {
    tab = await b.newPage();
    // The document is fully self-contained: block every network request and
    // disable scripts so resume content can never fetch or execute anything.
    await tab.setJavaScriptEnabled(false);
    await tab.setRequestInterception(true);
    tab.on('request', (req) => (req.url().startsWith('data:') ? req.continue() : req.abort()));

    await tab.setViewport({ width: Math.ceil(pageSize.widthPx), height: Math.ceil(pageSize.heightPx) });
    await tab.setContent(html, { waitUntil: 'load' });
    await tab.emulateMediaType('print');
    await tab.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await tab.evaluate(() => document.fonts.ready);

    const warnings = [];
    const overflow = await tab.evaluate((maxWidth) => {
      const wide = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > maxWidth + 1);
      return wide.length;
    }, pageSize.widthPx);
    if (overflow) warnings.push('Some content is wider than the page and may be cut off at the right edge.');

    const pdf = Buffer.from(
      await tab.pdf({
        width: pageSize.width,
        height: pageSize.height,
        preferCSSPageSize: true,
        printBackground: true,
      })
    );
    return { pdf, pageCount: countPdfPages(pdf), warnings };
  } catch (err) {
    if (err instanceof UserError) throw err;
    throw new UserError(`PDF generation failed: ${firstLine(err.message)}`, {
      cause: err,
      hint: 'The HTML file was still written; open it in a browser to check the layout. Re-run with DEBUG=1 for the full error.',
    });
  } finally {
    if (tab) await tab.close().catch(() => {});
    if (ownBrowser) await b.close().catch(() => {});
  }
}

module.exports = { renderPdf, launchBrowser, countPdfPages };
