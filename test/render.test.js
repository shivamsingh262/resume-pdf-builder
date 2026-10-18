'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateResume } = require('../src/validate');
const { resolveRenderOptions, renderHtml } = require('../src/render');
const { escapeHtml, CSP } = require('../src/html');
const { parseHexColor, contrastRatio } = require('../src/color');
const { THEMES, getTheme } = require('../themes');
const sidebar = require('../themes/sidebar');
const { readExample, minimalResume } = require('./helpers');

function render(data, cli = {}) {
  const { resume, errors } = validateResume(data);
  assert.deepEqual(errors, []);
  return renderHtml(resume, resolveRenderOptions(cli, {}));
}

test('escapeHtml escapes all HTML-significant characters', () => {
  assert.equal(escapeHtml(`<a href="x" onclick='y'>&amp;</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;amp;&lt;/a&gt;');
});

test('user text is escaped everywhere it appears, so markup cannot be injected', () => {
  const payload = '<script>alert(1)</script><img src=x onerror="alert(2)">';
  const data = {
    name: `${payload} & "Alex"`,
    title: payload,
    location: payload,
    summary: payload,
    skills: [{ category: payload, items: [payload] }],
    experience: [{ title: payload, company: payload, dates: '2020 – 2021', bullets: [payload] }],
    education: [{ degree: payload, school: payload, dates: payload }],
    linkedin: { url: 'https://www.linkedin.com/in/x?a=1&b="2"', label: payload },
    github: { url: 'https://github.com/x?a=1&b="2"', label: payload },
    website: { url: 'https://example.com/x?a=1&b="2"', label: payload },
  };
  for (const name of Object.keys(THEMES)) {
    const html = render(data, { name });
    assert.ok(!html.includes('<script'), `${name}: raw <script> found`);
    assert.ok(!html.includes('<img src=x'), `${name}: raw <img> found`);
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), name);
    assert.ok(html.includes('&amp; &quot;Alex&quot;'), name);
    // The query string's quote is percent-encoded by URL parsing and the & is escaped.
    assert.ok(html.includes('href="https://www.linkedin.com/in/x?a=1&amp;b=%222%22"'), name);
    assert.ok(html.includes('href="https://github.com/x?a=1&amp;b=%222%22"'), name);
    assert.ok(html.includes('href="https://example.com/x?a=1&amp;b=%222%22"'), name);
  }
});

test('Unicode text is preserved and the document declares UTF-8', () => {
  const html = render(minimalResume({ name: 'Zoë Ångström-Núñez', summary: '日本語 — “quotes” 🚀' }));
  assert.match(html, /<meta charset="utf-8">/);
  assert.ok(html.includes('Zoë Ångström-Núñez'));
  assert.ok(html.includes('日本語 — “quotes” 🚀'));
});

test('the document has a strict Content-Security-Policy and no scripts', () => {
  const html = render(readExample());
  assert.ok(html.includes(`content="${CSP}"`));
  assert.match(CSP, /default-src 'none'/);
  assert.ok(!/<script/i.test(html));
});

test('empty or omitted sections are not rendered', () => {
  for (const name of Object.keys(THEMES)) {
    const html = render(minimalResume({ skills: [], experience: [] }), { name });
    for (const heading of ['Summary', 'Experience', 'Education', 'Skills']) {
      assert.ok(!html.includes(`>${heading}<`), `${name}: unexpected ${heading} heading`);
    }
    assert.ok(!html.includes('mailto:'), name);
  }
});

test('the photo is embedded only when provided and the theme shows photos', () => {
  const { resume } = validateResume(readExample());
  const photo = 'data:image/png;base64,AAAA';
  const withPhoto = renderHtml(resume, { ...resolveRenderOptions({ name: 'sidebar' }), photo });
  assert.ok(withPhoto.includes(`<img class="photo" src="${photo}"`));
  const without = renderHtml(resume, { ...resolveRenderOptions({ name: 'sidebar' }), photo: null });
  assert.ok(!without.includes('<img'));
  const minimal = renderHtml(resume, { ...resolveRenderOptions({ name: 'minimal' }), photo });
  assert.ok(!minimal.includes('<img'));
});

test('theme selection: CLI overrides config, "default" is an alias, unknown names fail', () => {
  assert.equal(resolveRenderOptions({}, {}).theme.name, 'sidebar');
  assert.equal(resolveRenderOptions({ name: 'default' }, {}).theme.name, 'sidebar');
  assert.equal(resolveRenderOptions({}, { name: 'minimal' }).theme.name, 'minimal');
  assert.equal(resolveRenderOptions({ name: 'sidebar' }, { name: 'minimal' }).theme.name, 'sidebar');
  assert.equal(getTheme('MINIMAL').name, 'minimal');
  assert.throws(() => resolveRenderOptions({ name: 'fancy' }), /--theme: unknown theme "fancy"/);
  assert.throws(() => resolveRenderOptions({}, { name: 'fancy' }), /theme\.name: unknown theme/);
});

test('page size: letter by default, a4 supported, unknown sizes fail', () => {
  assert.equal(resolveRenderOptions().page.name, 'letter');
  assert.equal(resolveRenderOptions({ pageSize: 'A4' }).page.name, 'a4');
  assert.throws(() => resolveRenderOptions({ pageSize: 'legal' }), /unknown page size "legal"/);
  assert.match(render(minimalResume(), { pageSize: 'a4' }), /@page \{ size:210mm 297mm;/);
});

test('valid accent colors are normalized; invalid ones never reach the CSS', () => {
  assert.equal(parseHexColor('#1A2B4C'), '#1a2b4c');
  assert.equal(parseHexColor(' #2a6 '), '#22aa66');
  for (const bad of ['red', '1a2b4c', '#12345', '#1a2b4cff', '#ggg', 'url(x)', '#000;}body{display:none', '', null, 42]) {
    assert.equal(parseHexColor(bad), null, String(bad));
  }
  assert.equal(resolveRenderOptions({ accentColor: '#0F5257' }).accent, '#0f5257');
  assert.throws(() => resolveRenderOptions({ accentColor: 'red' }), /--color: "red" is not a hex color/);
  assert.throws(() => resolveRenderOptions({}, { accentColor: 'blue;' }), /theme\.accentColor: "blue;" is not a hex color/);
});

test('accent colors too light to read are rejected', () => {
  assert.throws(() => resolveRenderOptions({ accentColor: '#ffd700' }), /too light .*contrast with white is 1\.4:1/);
  assert.throws(() => resolveRenderOptions({ accentColor: '#fff' }), /too light/);
  assert.doesNotThrow(() => resolveRenderOptions({ accentColor: '#000' }));
});

test('custom accent colors are applied in both themes', () => {
  for (const name of Object.keys(THEMES)) {
    const html = render(readExample(), { name, accentColor: '#0F5257' });
    assert.ok(html.includes('#0f5257'), name);
    assert.ok(!html.includes('#1a2b4c'), `${name} still uses the default accent`);
  }
});

test('derived sidebar colors stay readable for any accepted accent', () => {
  for (const accent of ['#0f5257', '#2e7d32', '#6a1b9a', '#b71c1c', '#767676', '#000000', '#1565c0']) {
    const p = sidebar.palette(accent);
    for (const key of ['sideMuted', 'sideText', 'sideItem', 'sideStrong']) {
      assert.ok(contrastRatio(p[key], accent) >= 4.5, `${accent} ${key} ${p[key]}`);
    }
    assert.ok(contrastRatio(p.secondary, '#ffffff') >= 4, `${accent} secondary`);
  }
});

test('default design is preserved: original palette, dimensions and fonts', () => {
  assert.deepEqual(sidebar.palette('#1a2b4c'), sidebar.BASE_PALETTE);
  const html = render(readExample());
  for (const snippet of [
    '@page { size:8.5in 11in; margin:0; }',
    'linear-gradient(to right, #1a2b4c 258px, #fff 258px)',
    '.sidebar { flex:0 0 258px; color:#e7ebf3; padding:30px 20px',
    ".name { font:700 29px 'Source Serif 4', serif; letter-spacing:0.3px; line-height:1.18; }",
    '.main { flex:1; padding:22px 30px',
    '.job-company { font:600 10.8px Inter, sans-serif; color:#5b7bb8;',
    '.pill { font:600 9.3px Inter, sans-serif; color:#1a2b4c; background:#eef1f7;',
    "@font-face { font-family:'Inter'",
    "@font-face { font-family:'Source Serif 4'",
  ]) {
    assert.ok(html.includes(snippet), `missing: ${snippet}`);
  }
});

test('page-break rules keep headings with content and short jobs together', () => {
  const data = readExample();
  data.experience[0].bullets = Array.from({ length: 10 }, (_, i) => `Bullet ${i}`);
  const html = render(data);
  assert.match(html, /\.section-heading \{[^}]*break-after:avoid/);
  assert.match(html, /\.bullets li \{[^}]*break-inside:avoid/);
  assert.equal((html.match(/class="job keep"/g) || []).length, 2, 'only the two short jobs are kept whole');
  assert.equal((html.match(/class="job"/g) || []).length, 1);
});
