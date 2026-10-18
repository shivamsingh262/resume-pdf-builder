'use strict';
// Default theme: navy sidebar with photo, contact details and skills, and a
// main column with summary, experience and education. This is the original
// resume design; the values below are the original measurements and colors.

const { escapeHtml: esc } = require('../../src/html');
const { retint, ensureContrast } = require('../../src/color');

const SIDEBAR_WIDTH = 258;
const PAGE_BOTTOM_SPACE = 28; // px kept free at the bottom of each page in multi-page output

// Colors of the original design. With a different accent, every other color
// is re-tinted to follow it (see palette()).
const BASE_PALETTE = {
  accent: '#1a2b4c', // sidebar background, headings, job titles
  sideDivider: '#33456b',
  sideMuted: '#9fb0d0', // job title under the name, "Skills" heading
  sideText: '#c7d0e4', // contact details
  sideItem: '#dbe1ee', // skill items
  sideStrong: '#e7ebf3', // name, skill categories
  secondary: '#5b7bb8', // company and school names
  pillBg: '#eef1f7', // date badges
  rule: '#d8dce6', // section heading underline
};

function palette(accent) {
  if (accent === BASE_PALETTE.accent) return { ...BASE_PALETTE };
  const p = { accent };
  for (const [key, color] of Object.entries(BASE_PALETTE)) {
    if (key !== 'accent') p[key] = retint(color, BASE_PALETTE.accent, accent);
  }
  // Keep sidebar text readable on the new background, and company names
  // readable on white.
  for (const key of ['sideMuted', 'sideText', 'sideItem', 'sideStrong']) p[key] = ensureContrast(p[key], accent, 4.5);
  p.secondary = ensureContrast(p.secondary, '#ffffff', 4);
  return p;
}

const ICONS = {
  location:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
  phone:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1.5 1.5 0 0 1 1.5-.4c1.3.4 2.7.6 4.1.6a1.5 1.5 0 0 1 1.5 1.5V21a1.5 1.5 0 0 1-1.5 1.5C10.5 22.5 1.5 13.5 1.5 2.5A1.5 1.5 0 0 1 3 1h3.5a1.5 1.5 0 0 1 1.5 1.5c0 1.4.2 2.8.6 4.1a1.5 1.5 0 0 1-.4 1.5z"></path></svg>',
  email:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m2 6 9 6 9-6"></path></svg>',
  linkedin:
    '<svg width="12" height="12" viewBox="10 10 52 52" fill="currentColor" aria-hidden="true"><path d="M62,62 L51.315625,62 L51.315625,43.8021149 C51.315625,38.8127542 49.4197917,36.0245323 45.4707031,36.0245323 C41.1746094,36.0245323 38.9300781,38.9261103 38.9300781,43.8021149 L38.9300781,62 L28.6333333,62 L28.6333333,27.3333333 L38.9300781,27.3333333 L38.9300781,32.0029283 C38.9300781,32.0029283 42.0260417,26.2742151 49.3825521,26.2742151 C56.7356771,26.2742151 62,30.7644705 62,40.051212 L62,62 Z M16.349349,22.7940133 C12.8420573,22.7940133 10,19.9296567 10,16.3970067 C10,12.8643566 12.8420573,10 16.349349,10 C19.8566406,10 22.6970052,12.8643566 22.6970052,16.3970067 C22.6970052,19.9296567 19.8566406,22.7940133 16.349349,22.7940133 Z M11.0325521,62 L21.769401,62 L21.769401,27.3333333 L11.0325521,27.3333333 L11.0325521,62 Z"></path></svg>',
  github:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>',
};

// Jobs up to this size are never split across pages; longer ones may break
// between bullets (never inside a bullet, never right after the job header).
const KEEP_TOGETHER = { bullets: 6, chars: 1200 };

// Page spacing comes from column padding rather than @page margins, because
// Chrome does not paint the page background into @page margins and the
// sidebar color must reach the paper edge. With box-decoration-break:clone
// each page fragment of a column repeats its top and bottom padding.
//
// `singlePage` drops the bottom padding, which reproduces the original fixed
// one-page layout exactly. The build uses it whenever the content fits on one
// page and otherwise uses the multi-page variant.
function css(p, page, singlePage) {
  const bottom = singlePage ? '0' : `${PAGE_BOTTOM_SPACE}px`;
  return `
@page { size:${page.width} ${page.height}; margin:0; }
* { margin:0; padding:0; box-sizing:border-box; }
html {
  /* The sidebar color is painted as a page background so it covers the full
     height of every page, including page margins and continuation pages. */
  background:linear-gradient(to right, ${p.accent} ${SIDEBAR_WIDTH}px, #fff ${SIDEBAR_WIDTH}px);
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
body { font-family:Inter, sans-serif; }
.page { width:${page.width}; display:flex; align-items:stretch; font-family:Inter, sans-serif; color:#20242c; overflow-wrap:anywhere; }

.sidebar { flex:0 0 ${SIDEBAR_WIDTH}px; color:${p.sideStrong}; padding:30px 20px ${bottom}; box-decoration-break:clone; -webkit-box-decoration-break:clone; display:flex; flex-direction:column; gap:12px; align-items:center; text-align:center; }
.photo { width:112px; height:112px; border-radius:50%; object-fit:cover; flex-shrink:0; }
.identity { break-inside:avoid; }
.name { font:700 29px 'Source Serif 4', serif; letter-spacing:0.3px; line-height:1.18; }
.title { font:500 14px Inter, sans-serif; color:${p.sideMuted}; margin-top:6px; }
.divider { width:100%; height:1px; background:${p.sideDivider}; flex-shrink:0; }
.contacts { display:flex; flex-direction:column; gap:8px; font:400 11.8px Inter, sans-serif; color:${p.sideText}; line-height:1.55; width:100%; text-align:left; break-inside:avoid; }
.contact { display:flex; align-items:center; gap:8px; }
.contact svg { flex-shrink:0; }
.contact a { color:${p.sideText}; }
.contact a.plain { text-decoration:none; }
.side-section { width:100%; text-align:left; }
.side-heading { font:700 12.5px Inter, sans-serif; letter-spacing:1px; text-transform:uppercase; color:${p.sideMuted}; margin-bottom:12px; break-after:avoid; }
.skill-groups { display:flex; flex-direction:column; gap:13px; }
.skill-group { break-inside:avoid; }
.skill-category { font:600 11.8px Inter, sans-serif; color:${p.sideStrong}; margin-bottom:5px; }
.skill-items { margin:0; padding-left:16px; display:flex; flex-direction:column; gap:4px; font:400 11.2px Inter, sans-serif; line-height:1.45; color:${p.sideItem}; }

.main { flex:1; padding:22px 30px ${bottom}; box-decoration-break:clone; -webkit-box-decoration-break:clone; display:flex; flex-direction:column; gap:12px; min-width:0; }
.section-heading { font:700 12.5px Inter, sans-serif; letter-spacing:1px; text-transform:uppercase; color:${p.accent}; margin-bottom:6px; border-bottom:1px solid ${p.rule}; padding-bottom:4px; break-after:avoid; }
.summary { font:400 11.3px Inter, sans-serif; line-height:1.42; color:#3a4050; white-space:pre-line; }
.entries { display:flex; flex-direction:column; gap:9px; }
.job.keep, .edu { break-inside:avoid; }
.job-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; break-inside:avoid; break-after:avoid; }
.job-head > div:first-child { min-width:0; }
.job-title { font:700 13px Inter, sans-serif; color:${p.accent}; }
.job-company { font:600 10.8px Inter, sans-serif; color:${p.secondary}; margin-top:1px; }
.pill { font:600 9.3px Inter, sans-serif; color:${p.accent}; background:${p.pillBg}; border-radius:3px; padding:2px 8px; white-space:nowrap; margin-top:1px; }
.bullets { margin:3px 0 0; padding-left:14px; font:400 10.8px Inter, sans-serif; line-height:1.36; color:#3a4050; }
.bullets li { white-space:pre-line; break-inside:avoid; }
.edu-degree { font:700 13.5px Inter, sans-serif; color:${p.accent}; }
.edu-row { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-top:2px; }
.edu-school { font:600 11px Inter, sans-serif; color:${p.secondary}; min-width:0; }
.edu-row .pill { font-size:9.5px; padding:3px 9px; margin-top:2px; }
`;
}

function renderContacts(r) {
  const rows = [];
  if (r.location) rows.push(`${ICONS.location}<span>${esc(r.location)}</span>`);
  if (r.phone) rows.push(`${ICONS.phone}<span>${esc(r.phone)}</span>`);
  if (r.email) rows.push(`${ICONS.email}<a class="plain" href="mailto:${esc(r.email)}">${esc(r.email)}</a>`);
  if (r.linkedin) rows.push(`${ICONS.linkedin}<a href="${esc(r.linkedin.url)}">${esc(r.linkedin.label)}</a>`);
  if (r.github) rows.push(`${ICONS.github}<a href="${esc(r.github.url)}">${esc(r.github.label)}</a>`);
  if (!rows.length) return '';
  return `
    <div class="divider"></div>
    <div class="contacts">
      ${rows.map((row) => `<div class="contact">${row}</div>`).join('\n      ')}
    </div>`;
}

function renderSkills(skills) {
  if (!skills.length) return '';
  const groups = skills.map(
    (group) => `
        <div class="skill-group">
          <div class="skill-category">${esc(group.category)}</div>
          <ul class="skill-items">
            ${group.items.map((item) => `<li>${esc(item)}</li>`).join('\n            ')}
          </ul>
        </div>`
  );
  return `
    <div class="divider"></div>
    <div class="side-section">
      <div class="side-heading">Skills</div>
      <div class="skill-groups">${groups.join('')}
      </div>
    </div>`;
}

function section(heading, inner) {
  return `
    <div>
      <div class="section-heading">${heading}</div>
      ${inner}
    </div>`;
}

function renderExperience(experience) {
  if (!experience.length) return '';
  const jobs = experience.map((job) => {
    const chars = job.bullets.reduce((n, b) => n + b.length, 0);
    const keep = job.bullets.length <= KEEP_TOGETHER.bullets && chars <= KEEP_TOGETHER.chars;
    const bullets = job.bullets.length
      ? `
          <ul class="bullets">
            ${job.bullets.map((b) => `<li>${esc(b)}</li>`).join('\n            ')}
          </ul>`
      : '';
    return `
        <div class="job${keep ? ' keep' : ''}">
          <div class="job-head">
            <div>
              <div class="job-title">${esc(job.title)}</div>
              <div class="job-company">${esc(job.company)}</div>
            </div>
            ${job.dates ? `<div class="pill">${esc(job.dates)}</div>` : ''}
          </div>${bullets}
        </div>`;
  });
  return section('Experience', `<div class="entries">${jobs.join('')}\n      </div>`);
}

function renderEducation(education) {
  if (!education.length) return '';
  const entries = education.map(
    (ed) => `
        <div class="edu">
          <div class="edu-degree">${esc(ed.degree)}</div>
          <div class="edu-row">
            <div class="edu-school">${esc(ed.school)}</div>
            ${ed.dates ? `<div class="pill">${esc(ed.dates)}</div>` : ''}
          </div>
        </div>`
  );
  return section('Education', `<div class="entries">${entries.join('')}\n      </div>`);
}

function render({ resume: r, accent, page, photo, singlePage = false }) {
  const p = palette(accent);
  const body = `<main class="page">
  <aside class="sidebar">
    ${photo ? `<img class="photo" src="${photo}" alt="">` : ''}
    <div class="identity">
      <div class="name">${esc(r.name)}</div>
      <div class="title">${esc(r.title)}</div>
    </div>${renderContacts(r)}${renderSkills(r.skills)}
  </aside>

  <div class="main">${r.summary ? section('Summary', `<div class="summary">${esc(r.summary)}</div>`) : ''}${renderExperience(r.experience)}${renderEducation(r.education)}
  </div>
</main>`;
  return { css: css(p, page, singlePage), body };
}

module.exports = {
  name: 'sidebar',
  description: 'Two-column layout with a colored sidebar (photo, contact details, skills). The default.',
  defaultAccent: BASE_PALETTE.accent,
  showsPhoto: true,
  hasSinglePageVariant: true,
  render,
  palette,
  BASE_PALETTE,
};
