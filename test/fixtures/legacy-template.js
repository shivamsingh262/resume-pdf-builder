// Renders the resume config into a single self-contained HTML string
// (fonts + photo inlined as data URIs) matching the original design.
const fs = require('fs');
const path = require('path');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fontDataUri(relPath) {
  const buf = fs.readFileSync(path.resolve(__dirname, relPath));
  return `data:font/woff2;base64,${buf.toString('base64')}`;
}

function photoDataUri(relPath) {
  const buf = fs.readFileSync(path.resolve(__dirname, relPath));
  const ext = path.extname(relPath).slice(1);
  const mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const ICONS = {
  location:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
  phone:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1.5 1.5 0 0 1 1.5-.4c1.3.4 2.7.6 4.1.6a1.5 1.5 0 0 1 1.5 1.5V21a1.5 1.5 0 0 1-1.5 1.5C10.5 22.5 1.5 13.5 1.5 2.5A1.5 1.5 0 0 1 3 1h3.5a1.5 1.5 0 0 1 1.5 1.5c0 1.4.2 2.8.6 4.1a1.5 1.5 0 0 1-.4 1.5z"></path></svg>',
  email:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m2 6 9 6 9-6"></path></svg>',
  linkedin:
    '<svg width="12" height="12" viewBox="10 10 52 52" fill="currentColor" style="flex-shrink:0;"><path d="M62,62 L51.315625,62 L51.315625,43.8021149 C51.315625,38.8127542 49.4197917,36.0245323 45.4707031,36.0245323 C41.1746094,36.0245323 38.9300781,38.9261103 38.9300781,43.8021149 L38.9300781,62 L28.6333333,62 L28.6333333,27.3333333 L38.9300781,27.3333333 L38.9300781,32.0029283 C38.9300781,32.0029283 42.0260417,26.2742151 49.3825521,26.2742151 C56.7356771,26.2742151 62,30.7644705 62,40.051212 L62,62 Z M16.349349,22.7940133 C12.8420573,22.7940133 10,19.9296567 10,16.3970067 C10,12.8643566 12.8420573,10 16.349349,10 C19.8566406,10 22.6970052,12.8643566 22.6970052,16.3970067 C22.6970052,19.9296567 19.8566406,22.7940133 16.349349,22.7940133 Z M11.0325521,62 L21.769401,62 L21.769401,27.3333333 L11.0325521,27.3333333 L11.0325521,62 Z"></path></svg>',
};

function renderSkills(skills) {
  return skills
    .map(
      (group) => `
              <div>
                <div style="font:600 11.8px Inter, sans-serif; color:#e7ebf3; margin-bottom:5px;">${esc(group.category)}</div>
                <ul style="margin:0; padding-left:16px; display:flex; flex-direction:column; gap:4px; font:400 11.2px Inter, sans-serif; line-height:1.45; color:#dbe1ee;">
                  ${group.items.map((item) => `<li>${esc(item)}</li>`).join('\n                  ')}
                </ul>
              </div>`
    )
    .join('\n');
}

function renderExperience(experience) {
  return experience
    .map(
      (job) => `
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                  <div>
                    <div style="font:700 13px Inter, sans-serif; color:#1a2b4c;">${esc(job.title)}</div>
                    <div style="font:600 10.8px Inter, sans-serif; color:#5b7bb8; margin-top:1px;">${esc(job.company)}</div>
                  </div>
                  <div style="font:600 9.3px Inter, sans-serif; color:#1a2b4c; background:#eef1f7; border-radius:3px; padding:2px 8px; white-space:nowrap; margin-top:1px;">${esc(job.dates)}</div>
                </div>
                <ul style="margin:3px 0 0; padding-left:14px; font:400 10.8px Inter, sans-serif; line-height:1.36; color:#3a4050;">
                  ${job.bullets.map((b) => `<li>${esc(b)}</li>`).join('\n                  ')}
                </ul>
              </div>`
    )
    .join('\n');
}

function renderEducation(education) {
  return education
    .map(
      (ed) => `
              <div>
                <div style="font:700 13.5px Inter, sans-serif; color:#1a2b4c;">${esc(ed.degree)}</div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-top:2px;">
                  <div style="font:600 11px Inter, sans-serif; color:#5b7bb8;">${esc(ed.school)}</div>
                  <div style="font:600 9.5px Inter, sans-serif; color:#1a2b4c; background:#eef1f7; border-radius:3px; padding:3px 9px; white-space:nowrap; margin-top:2px;">${esc(ed.dates)}</div>
                </div>
              </div>`
    )
    .join('\n');
}

function buildResumeHtml(config) {
  const interFont = fontDataUri('../../assets/fonts/inter-latin.woff2');
  const serifFont = fontDataUri('../../assets/fonts/source-serif-latin.woff2');
  const photoBlock = config.photo
    ? `<img src="${photoDataUri(config.photo)}" style="width:112px; height:112px; border-radius:50%; object-fit:cover;">`
    : '';

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${esc(config.name)} — Resume</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
@font-face { font-family:'Inter'; font-style:normal; font-weight:400 700; src:url("${interFont}") format('woff2'); }
@font-face { font-family:'Source Serif 4'; font-style:normal; font-weight:400 700; src:url("${serifFont}") format('woff2'); }
@page { size:letter; margin:0; }
body { font-family:Inter, sans-serif; }
</style>
</head>
<body>
<section class="page" style="width:816px; height:1056px; display:flex; font-family:Inter, sans-serif; color:#20242c; overflow:hidden;">
  <div style="width:258px; background:#1a2b4c; color:#e7ebf3; padding:30px 20px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; align-items:center; text-align:center;">
    ${photoBlock}
    <div>
      <div style="font:700 29px 'Source Serif 4', serif; letter-spacing:0.3px; line-height:1.18;">${esc(config.name)}</div>
      <div style="font:500 14px Inter, sans-serif; color:#9fb0d0; margin-top:6px;">${esc(config.title)}</div>
    </div>
    <div style="width:100%; height:1px; background:#33456b;"></div>
    <div style="display:flex; flex-direction:column; gap:8px; font:400 11.8px Inter, sans-serif; color:#c7d0e4; line-height:1.55; width:100%; text-align:left;">
      <div style="display:flex; align-items:center; gap:8px;">${ICONS.location}<span>${esc(config.location)}</span></div>
      <div style="display:flex; align-items:center; gap:8px;">${ICONS.phone}<span>${esc(config.phone)}</span></div>
      <div style="display:flex; align-items:center; gap:8px;">${ICONS.email}<span>${esc(config.email)}</span></div>
      <div style="display:flex; align-items:center; gap:8px;">${ICONS.linkedin}<a href="${esc(config.linkedin.url)}" style="color:#c7d0e4;">${esc(config.linkedin.label)}</a></div>
    </div>
    <div style="width:100%; height:1px; background:#33456b;"></div>
    <div style="width:100%; text-align:left;">
      <div style="font:700 12.5px Inter, sans-serif; letter-spacing:1px; text-transform:uppercase; color:#9fb0d0; margin-bottom:12px;">Skills</div>
      <div style="display:flex; flex-direction:column; gap:13px;">
        ${renderSkills(config.skills)}
      </div>
    </div>
  </div>

  <div style="flex:1; padding:22px 30px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; min-width:0;">
    <div>
      <div style="font:700 12.5px Inter, sans-serif; letter-spacing:1px; text-transform:uppercase; color:#1a2b4c; margin-bottom:6px; border-bottom:1px solid #d8dce6; padding-bottom:4px;">Summary</div>
      <div style="font:400 11.3px Inter, sans-serif; line-height:1.42; color:#3a4050;">${esc(config.summary)}</div>
    </div>

    <div>
      <div style="font:700 12.5px Inter, sans-serif; letter-spacing:1px; text-transform:uppercase; color:#1a2b4c; margin-bottom:6px; border-bottom:1px solid #d8dce6; padding-bottom:4px;">Experience</div>
      <div style="display:flex; flex-direction:column; gap:9px;">
        ${renderExperience(config.experience)}
      </div>
    </div>

    <div>
      <div style="font:700 12.5px Inter, sans-serif; letter-spacing:1px; text-transform:uppercase; color:#1a2b4c; margin-bottom:6px; border-bottom:1px solid #d8dce6; padding-bottom:4px;">Education</div>
      <div style="display:flex; flex-direction:column; gap:9px;">
        ${renderEducation(config.education)}
      </div>
    </div>
  </div>
</section>
</body></html>`;
}

module.exports = { buildResumeHtml };
