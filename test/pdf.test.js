'use strict';
// End-to-end tests that launch Chromium. Slower than the other suites.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { build } = require('../src/build');
const { countPdfPages, renderPdf } = require('../src/pdf');
const { getPageSize } = require('../src/page');
const { validateResume } = require('../src/validate');
const { resolveRenderOptions, renderHtml } = require('../src/render');
const { UserError } = require('../src/errors');
const { buildResumeHtml: legacyHtml } = require('./fixtures/legacy-template');
const { EXAMPLE, readExample, minimalResume, tmpDir, writeJson, pdfPages, squash, getBrowser, closeBrowser } = require('./helpers');

test.after(closeBrowser);

const LONG = path.join(__dirname, 'fixtures', 'long-resume.json');

async function buildPdf(t, config, options = {}) {
  const outDir = tmpDir(t);
  const result = await build({ config, outDir, browser: await getBrowser(), ...options });
  const pdf = fs.readFileSync(result.pdfPath);
  return { result, pdf, pages: await pdfPages(pdf) };
}

function assertNoBlankPages(pages) {
  pages.forEach((p, i) => assert.ok(p.text.length > 20, `page ${i + 1} is blank or nearly blank`));
}

test('the example builds a one-page US Letter PDF containing all its text', async (t) => {
  const { result, pdf, pages } = await buildPdf(t, EXAMPLE);
  assert.equal(result.pageCount, 1);
  assert.equal(pages.length, 1);
  assert.equal(countPdfPages(pdf), pages.length);
  assert.deepEqual([Math.round(pages[0].width), Math.round(pages[0].height)], [612, 792]);
  assert.deepEqual(result.warnings, []);
  const data = readExample();
  const expected = [data.name, data.title, data.email, data.phone, data.summary, 'linkedin.com/in/alex-morgan-example', 'github.com/alex-morgan-example', 'alex-morgan.example.com'];
  for (const job of data.experience) expected.push(job.title, job.company, job.dates, ...job.bullets);
  for (const group of data.skills) expected.push(group.category, ...group.items);
  for (const ed of data.education) expected.push(ed.degree, ed.school);
  for (const text of expected) assert.ok(pages[0].text.includes(squash(text)), `missing text: ${text}`);
  assert.ok(fs.readFileSync(result.htmlPath, 'utf8').startsWith('<!DOCTYPE html>'));
});

test('long content flows onto multiple pages without losing text or adding blank pages', async (t) => {
  const data = JSON.parse(fs.readFileSync(LONG, 'utf8'));
  for (const theme of ['sidebar', 'minimal']) {
    const { result, pages } = await buildPdf(t, LONG, { theme });
    assert.ok(result.pageCount >= 2, `${theme}: expected several pages, got ${result.pageCount}`);
    assert.equal(pages.length, result.pageCount);
    assertNoBlankPages(pages);
    const all = pages.map((p) => p.text).join('');
    for (const job of data.experience) {
      assert.ok(all.includes(squash(job.title)), `${theme}: missing ${job.title}`);
      for (const b of job.bullets) assert.ok(all.includes(squash(b)), `${theme}: missing bullet "${b.slice(0, 20)}"`);
    }
    for (const group of data.skills) assert.ok(all.includes(squash(group.category)), `${theme}: missing ${group.category}`);
    assert.ok(all.includes(squash(data.education[1].degree)), `${theme}: missing last education entry`);
    // A job heading is never left alone at the bottom of a page.
    pages.slice(0, -1).forEach((p, i) => {
      const lastTitle = data.experience.map((j) => squash(j.title)).filter((title) => p.text.includes(title)).pop();
      if (lastTitle) assert.ok(!p.text.endsWith(lastTitle), `${theme}: page ${i + 1} ends with a lone heading`);
    });
  }
});

test('A4 output uses A4 page dimensions on every page', async (t) => {
  const { pages } = await buildPdf(t, LONG, { pageSize: 'a4' });
  assert.ok(pages.length >= 2);
  for (const p of pages) assert.deepEqual([Math.round(p.width), Math.round(p.height)], [595, 842]);
});

test('special characters and Unicode survive into the PDF as selectable text', async (t) => {
  const dir = tmpDir(t);
  const config = writeJson(dir, 'resume.json', {
    ...minimalResume({ name: 'Zoë Ångström-Núñez' }),
    summary: 'Uses <script>alert("x")</script> & "quotes" — café, naïve, façade.',
    experience: [{ title: 'R&D Engineer', company: 'Example Systems <Labs>', bullets: ["Line one\nLine two with 'apostrophes'"] }],
  });
  const { pages } = await buildPdf(t, config);
  const text = pages[0].text;
  for (const s of ['Zoë', 'Ångström-Núñez', '<script>alert("x")</script>', '&"quotes"', 'café,naïve,façade', 'R&DEngineer', 'ExampleSystems<Labs>', "'apostrophes'"]) {
    assert.ok(text.includes(squash(s)), `missing: ${s}`);
  }
});

test('a resume with no optional sections still builds a single non-blank page', async (t) => {
  const config = writeJson(tmpDir(t), 'resume.json', minimalResume({ photo: null, skills: [] }));
  for (const theme of ['sidebar', 'minimal']) {
    const { result, pages } = await buildPdf(t, config, { theme });
    assert.equal(result.pageCount, 1, theme);
    assert.ok(pages[0].text.includes('AlexMorgan'), theme);
  }
});

test('a custom accent color is used in the rendered PDF', async (t) => {
  const browser = await getBrowser();
  const { result } = await buildPdf(t, EXAMPLE, { color: '#0F5257' });
  assert.equal(result.accent, '#0f5257');
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.setViewport({ width: 816, height: 1056 });
  await page.setContent(fs.readFileSync(result.htmlPath, 'utf8'));
  const shot = await page.screenshot({ clip: { x: 5, y: 1000, width: 1, height: 1 }, encoding: 'base64' });
  const rgb = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = `data:image/png;base64,${src}`;
    await img.decode();
    const c = Object.assign(document.createElement('canvas'), { width: 1, height: 1 });
    c.getContext('2d').drawImage(img, 0, 0);
    return [...c.getContext('2d').getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, shot);
  assert.deepEqual(rgb, [0x0f, 0x52, 0x57]);
});

// Renders both documents at Letter size and compares them pixel by pixel in
// the browser. The fixture is the template as it was before this project was
// reworked, so this guards the default theme against visual drift.
test('the default theme matches the original design pixel for pixel', async (t) => {
  const browser = await getBrowser();
  const data = { ...readExample(), photo: null };
  delete data.theme;
  // The original design predates the GitHub and website links.
  delete data.github;
  delete data.website;
  const { resume } = validateResume(data);
  const current = renderHtml(resume, { ...resolveRenderOptions(), singlePage: true });
  const original = legacyHtml({ ...data, linkedin: resume.linkedin });

  const shoot = async (html) => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 816, height: 1056 });
      await page.emulateMediaType('print');
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
      await page.setContent(html);
      await page.evaluate(() => document.fonts.ready);
      return await page.screenshot({ clip: { x: 0, y: 0, width: 816, height: 1056 }, encoding: 'base64' });
    } finally {
      await page.close();
    }
  };
  const [a, b] = [await shoot(original), await shoot(current)];

  const page = await browser.newPage();
  t.after(() => page.close());
  const diff = await page.evaluate(
    async (srcA, srcB) => {
      const load = async (src) => {
        const img = new Image();
        img.src = `data:image/png;base64,${src}`;
        await img.decode();
        const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
        c.getContext('2d').drawImage(img, 0, 0);
        return c.getContext('2d').getImageData(0, 0, img.width, img.height).data;
      };
      const [pa, pb] = [await load(srcA), await load(srcB)];
      let differing = 0;
      for (let i = 0; i < pa.length; i += 4) {
        if (Math.abs(pa[i] - pb[i]) > 2 || Math.abs(pa[i + 1] - pb[i + 1]) > 2 || Math.abs(pa[i + 2] - pb[i + 2]) > 2) differing++;
      }
      return { differing, total: pa.length / 4 };
    },
    a,
    b
  );
  t.diagnostic(`${diff.differing} differing pixels`);
  assert.ok(diff.differing / diff.total < 0.0005, `${diff.differing} of ${diff.total} pixels differ from the original design`);
});

test('content wider than the page produces a warning', async () => {
  const html = '<!DOCTYPE html><html><body><div style="width:2000px">wide</div></body></html>';
  const { warnings, pageCount } = await renderPdf(html, { page: getPageSize('letter'), browser: await getBrowser() });
  assert.equal(pageCount, 1);
  assert.deepEqual(warnings, ['Some content is wider than the page and may be cut off at the right edge.']);
});

test('a broken photo path fails even with a theme that hides photos', async (t) => {
  const dir = tmpDir(t);
  const config = writeJson(dir, 'resume.json', minimalResume({ photo: 'me.png' }));
  await assert.rejects(build({ config, outDir: dir, theme: 'minimal', pdf: false }), /photo: file not found/);
});

test('invalid config fails before any output is written', async (t) => {
  const dir = tmpDir(t);
  const outDir = path.join(dir, 'out');
  const config = writeJson(dir, 'resume.json', { name: 'Alex Morgan' });
  await assert.rejects(build({ config, outDir }), (err) => err instanceof UserError && /title: is required/.test(err.details.join()));
  assert.equal(fs.existsSync(outDir), false);
});

test('a missing photo fails before any output is written', async (t) => {
  const dir = tmpDir(t);
  const outDir = path.join(dir, 'out');
  const config = writeJson(dir, 'resume.json', minimalResume({ photo: 'me.png' }));
  await assert.rejects(build({ config, outDir }), /photo: file not found/);
  assert.equal(fs.existsSync(outDir), false);
});

test('an unwritable output directory gives a clear error', async (t) => {
  const dir = tmpDir(t);
  const blocker = path.join(dir, 'not-a-dir');
  fs.writeFileSync(blocker, '');
  await assert.rejects(build({ config: EXAMPLE, outDir: blocker, pdf: false }), /Could not (create output directory|write)/);
});

test('invalid output names are rejected', async (t) => {
  for (const name of ['../escape', 'a/b', '.hidden', '']) {
    await assert.rejects(build({ config: EXAMPLE, outDir: tmpDir(t), name: name || ' ', pdf: false }), /Invalid output name/);
  }
});

test('--html-only writes HTML without launching a browser', async (t) => {
  const result = await build({
    config: EXAMPLE,
    outDir: tmpDir(t),
    pdf: false,
    launch: () => {
      throw new Error('must not launch');
    },
  });
  assert.ok(fs.existsSync(result.htmlPath));
  assert.equal(result.pdfPath, undefined);
});

test('a browser that fails to start gives an install hint and leaves no PDF', async (t) => {
  const outDir = tmpDir(t);
  await assert.rejects(
    build({ config: EXAMPLE, outDir, launch: () => Promise.reject(new Error('Failed to launch the browser process!\nmore detail')) }),
    (err) => {
      assert.ok(err instanceof UserError);
      assert.equal(err.message, 'Could not start Chromium: Failed to launch the browser process!');
      assert.match(err.hint, /npx puppeteer browsers install chrome/);
      assert.ok(err.cause);
      return true;
    }
  );
  assert.deepEqual(fs.readdirSync(outDir), ['resume.example.html']);
});

test('a failure while printing is reported and leaves no partial PDF', async (t) => {
  const outDir = tmpDir(t);
  const brokenBrowser = { newPage: () => Promise.reject(new Error('Target closed')), close: async () => {} };
  await assert.rejects(build({ config: EXAMPLE, outDir, browser: brokenBrowser }), /PDF generation failed: Target closed/);
  assert.deepEqual(fs.readdirSync(outDir), ['resume.example.html']);
});
