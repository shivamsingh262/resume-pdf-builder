'use strict';
// Loads the bundled fonts and the optional profile photo as data: URIs so the
// generated HTML is fully self-contained and works offline.

const fs = require('fs');
const path = require('path');
const { UserError } = require('./errors');

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_FILES = { inter: 'inter-latin.woff2', serif: 'source-serif-latin.woff2' };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Each allowed photo type is checked against its file signature, so a file
// renamed to ".png" cannot smuggle in some other content.
const PHOTO_TYPES = {
  '.png': { mime: 'image/png', matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  '.jpg': { mime: 'image/jpeg', matches: isJpeg },
  '.jpeg': { mime: 'image/jpeg', matches: isJpeg },
  '.webp': { mime: 'image/webp', matches: (b) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' },
  // SVG is only ever used inside <img>, where browsers never run its scripts
  // or fetch external resources.
  '.svg': { mime: 'image/svg+xml', matches: (b) => /<svg[\s>]/i.test(b.toString('utf8', 0, 4096)) },
};

function isJpeg(b) {
  return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

let fontCache;
function loadFonts() {
  if (!fontCache) {
    fontCache = {};
    for (const [key, file] of Object.entries(FONT_FILES)) {
      const fontPath = path.join(FONT_DIR, file);
      let buf;
      try {
        buf = fs.readFileSync(fontPath);
      } catch {
        throw new UserError(`Bundled font is missing: assets/fonts/${file}`, {
          hint: 'Restore the assets/fonts directory from the repository (e.g. "git checkout -- assets/fonts").',
        });
      }
      fontCache[key] = `data:font/woff2;base64,${buf.toString('base64')}`;
    }
  }
  return fontCache;
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// Resolves `photo` relative to the directory containing the config file and
// returns it as a data: URI. Only image files inside that directory (after
// resolving symlinks) are accepted, so a config cannot be used to read
// arbitrary files from the machine into the generated document.
function loadPhoto(photo, configDir) {
  const fail = (message, hint) => new UserError(`photo: ${message}`, { hint });

  if (path.isAbsolute(photo) || /^[a-z][a-z0-9+.-]*:/i.test(photo)) {
    throw fail('must be a path relative to the config file, not an absolute path or URL');
  }
  const ext = path.extname(photo).toLowerCase();
  const type = PHOTO_TYPES[ext];
  if (!type) {
    throw fail(`unsupported file type "${ext || '(none)'}"; use ${Object.keys(PHOTO_TYPES).join(', ')}`);
  }

  const baseDir = fs.realpathSync(configDir);
  const resolved = path.resolve(baseDir, photo);
  if (!isInside(baseDir, resolved)) {
    throw fail('must be inside the directory that contains the config file');
  }
  let real;
  try {
    real = fs.realpathSync(resolved);
  } catch {
    throw fail(`file not found: "${photo}" (resolved relative to the config file)`, 'Fix the path, or set "photo" to null to build without a photo.');
  }
  if (!isInside(baseDir, real)) {
    throw fail('resolves (via a symlink) to a file outside the config directory');
  }
  const stat = fs.statSync(real);
  if (!stat.isFile()) throw fail(`"${photo}" is not a regular file`);
  if (stat.size > MAX_PHOTO_BYTES) {
    throw fail(`file is too large (${(stat.size / 1024 / 1024).toFixed(1)} MB, maximum 5 MB)`);
  }
  const buf = fs.readFileSync(real);
  if (!type.matches(buf)) {
    throw fail(`file content does not look like a ${ext.slice(1).toUpperCase()} image`);
  }
  return `data:${type.mime};base64,${buf.toString('base64')}`;
}

module.exports = { loadFonts, loadPhoto, PHOTO_TYPES };
