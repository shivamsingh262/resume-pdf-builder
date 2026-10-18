'use strict';
// Single-column technical resume: compact header with contact line, then
// summary, experience, skills and education in reading order. No photo, no
// sidebar, which suits applicant-tracking systems and plain-text extraction.

const { escapeHtml: esc } = require('../../src/html');
const { retint, mix, ensureContrast } = require('../../src/color');

const DEFAULT_ACCENT = '#1a2b4c';

function palette(accent) {
  return {
    accent,
    secondary: ensureContrast(retint('#5b7bb8', DEFAULT_ACCENT, accent), '#ffffff', 4),
    rule: mix(accent, '#ffffff', 0.78),
  };
}

function css(p, page) {
  return `
@page { size:${page.width} ${page.height}; margin:0.55in 0.65in; }
* { margin:0; padding:0; box-sizing:border-box; }
html { background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font:400 10.6px/1.42 Inter, sans-serif; color:#2a2f3a; overflow-wrap:anywhere; }
.header { padding-bottom:10px; border-bottom:2px solid ${p.accent}; break-inside:avoid; }
.name { font:700 26px/1.15 Inter, sans-serif; letter-spacing:-0.2px; color:${p.accent}; }
.title { font:500 13px Inter, sans-serif; color:#4a5163; margin-top:3px; }
.contact { margin-top:7px; font-size:10.2px; color:#4a5163; }
.contact span { display:inline-block; max-width:100%; }
.contact span + span::before { content:"·"; margin:0 7px; color:#9aa1b0; }
.contact a { color:inherit; text-decoration:none; }
section { margin-top:14px; }
h2 { font:700 11px Inter, sans-serif; letter-spacing:1.2px; text-transform:uppercase; color:${p.accent}; padding-bottom:3px; border-bottom:1px solid ${p.rule}; margin-bottom:7px; break-after:avoid; }
.summary { white-space:pre-line; }
.entries { display:flex; flex-direction:column; gap:9px; }
.job.keep, .edu { break-inside:avoid; }
.row { display:flex; justify-content:space-between; align-items:baseline; gap:12px; break-inside:avoid; break-after:avoid; }
.row > div:first-child { min-width:0; }
.job-title { font-weight:700; font-size:11.4px; color:#1d2230; }
.org { font-weight:600; color:${p.secondary}; }
.dates { font-weight:600; font-size:9.8px; color:#4a5163; white-space:nowrap; }
ul { padding-left:15px; margin-top:3px; }
li { white-space:pre-line; break-inside:avoid; }
li + li { margin-top:1px; }
.skills { display:grid; grid-template-columns:max-content 1fr; column-gap:14px; row-gap:3px; }
.skills dt { font-weight:600; color:#1d2230; break-after:avoid; }
.skills dd { break-inside:avoid; }
`;
}

function contactLine(r) {
  const parts = [];
  if (r.location) parts.push(esc(r.location));
  if (r.email) parts.push(`<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`);
  if (r.phone) parts.push(esc(r.phone));
  if (r.linkedin) parts.push(`<a href="${esc(r.linkedin.url)}">${esc(r.linkedin.label)}</a>`);
  if (r.github) parts.push(`<a href="${esc(r.github.url)}">${esc(r.github.label)}</a>`);
  if (r.website) parts.push(`<a href="${esc(r.website.url)}">${esc(r.website.label)}</a>`);
  return parts.length ? `<div class="contact">${parts.map((x) => `<span>${x}</span>`).join('')}</div>` : '';
}

function render({ resume: r, accent, page }) {
  const p = palette(accent);
  const sections = [];
  if (r.summary) sections.push(`<section><h2>Summary</h2><div class="summary">${esc(r.summary)}</div></section>`);
  if (r.experience.length) {
    const jobs = r.experience.map((job) => {
      const keep = job.bullets.length <= 6 && job.bullets.reduce((n, b) => n + b.length, 0) <= 1200;
      return `
    <div class="job${keep ? ' keep' : ''}">
      <div class="row"><div><span class="job-title">${esc(job.title)}</span> · <span class="org">${esc(job.company)}</span></div>${job.dates ? `<div class="dates">${esc(job.dates)}</div>` : ''}</div>
      ${job.bullets.length ? `<ul>${job.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    </div>`;
    });
    sections.push(`<section><h2>Experience</h2><div class="entries">${jobs.join('')}</div></section>`);
  }
  if (r.skills.length) {
    const rows = r.skills.map((g) => `<dt>${esc(g.category)}</dt><dd>${g.items.map(esc).join(', ')}</dd>`);
    sections.push(`<section><h2>Skills</h2><dl class="skills">${rows.join('')}</dl></section>`);
  }
  if (r.education.length) {
    const eds = r.education.map(
      (ed) => `
    <div class="edu"><div class="row"><div><span class="job-title">${esc(ed.degree)}</span> · <span class="org">${esc(ed.school)}</span></div>${ed.dates ? `<div class="dates">${esc(ed.dates)}</div>` : ''}</div></div>`
    );
    sections.push(`<section><h2>Education</h2><div class="entries">${eds.join('')}</div></section>`);
  }

  const body = `<main>
  <header class="header">
    <div class="name">${esc(r.name)}</div>
    <div class="title">${esc(r.title)}</div>
    ${contactLine(r)}
  </header>
  ${sections.join('\n  ')}
</main>`;
  return { css: css(p, page), body };
}

module.exports = {
  name: 'minimal',
  description: 'Single-column technical resume without photo or sidebar; ATS- and print-friendly.',
  defaultAccent: DEFAULT_ACCENT,
  showsPhoto: false,
  render,
  palette,
};
