'use strict';
// HTML helpers shared by all themes. Every piece of resume text must go
// through escapeHtml() before it is placed in markup or an attribute.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

// Content-Security-Policy for the generated document: no scripts, no network,
// only inline styles and data: URIs (fonts and photo are embedded). This is
// defence in depth for anyone opening the HTML file in a normal browser.
const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

function fontFaces(fonts) {
  return [
    `@font-face { font-family:'Inter'; font-style:normal; font-weight:400 700; src:url("${fonts.inter}") format('woff2'); }`,
    `@font-face { font-family:'Source Serif 4'; font-style:normal; font-weight:400 700; src:url("${fonts.serif}") format('woff2'); }`,
  ].join('\n');
}

// Wraps a theme's CSS and body markup in a complete, self-contained document.
function documentShell({ title, fonts, css, body }) {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${escapeHtml(title)}</title>
<style>
${fontFaces(fonts)}
${css}
</style>
</head>
<body>
${body}
</body></html>
`;
}

module.exports = { escapeHtml, documentShell, CSP };
