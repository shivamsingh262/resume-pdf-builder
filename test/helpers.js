'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXAMPLE = path.join(ROOT, 'resume.example.json');

function readExample() {
  return JSON.parse(fs.readFileSync(EXAMPLE, 'utf8'));
}

// A minimal valid resume, for tests that only care about one field.
function minimalResume(overrides = {}) {
  return { name: 'Alex Morgan', title: 'Senior Software Engineer', ...overrides };
}

function tmpDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function writeJson(dir, name, data) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  return file;
}

// Extracts text per page with pdf.js. Whitespace is removed so assertions do
// not depend on how the PDF splits text into runs.
async function pdfPages(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), verbosity: 0, disableFontFace: true });
  const doc = await task.promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const [, , width, height] = page.view;
    const content = await page.getTextContent();
    pages.push({ width, height, text: content.items.map((it) => it.str).join('').replace(/\s+/g, '') });
  }
  await task.destroy();
  return pages;
}

const squash = (s) => s.replace(/\s+/g, '');

let browserPromise;
// One Chromium instance shared by the tests in a file; register
// `after(closeBrowser)` at the top level of any file that uses it.
function getBrowser() {
  if (!browserPromise) browserPromise = require('puppeteer').launch();
  return browserPromise;
}

async function closeBrowser() {
  if (browserPromise) await (await browserPromise).close();
  browserPromise = undefined;
}

module.exports = { ROOT, EXAMPLE, readExample, minimalResume, tmpDir, writeJson, pdfPages, squash, getBrowser, closeBrowser };
