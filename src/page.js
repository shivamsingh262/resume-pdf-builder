'use strict';
// Supported paper sizes. The same values feed the CSS @page rule and the
// Puppeteer PDF options so the browser layout and the PDF always agree.

const PAGE_SIZES = {
  letter: { name: 'letter', width: '8.5in', height: '11in', widthPx: 816, heightPx: 1056 },
  a4: { name: 'a4', width: '210mm', height: '297mm', widthPx: 793.7, heightPx: 1122.5 },
};

const DEFAULT_PAGE_SIZE = 'letter';

function getPageSize(name) {
  return PAGE_SIZES[String(name).toLowerCase()] || null;
}

module.exports = { PAGE_SIZES, DEFAULT_PAGE_SIZE, getPageSize };
