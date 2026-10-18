'use strict';
// Turns a validated resume plus render options into a self-contained HTML string.

const { UserError } = require('./errors');
const { documentShell } = require('./html');
const { parseHexColor, contrastRatio } = require('./color');
const { getPageSize, PAGE_SIZES, DEFAULT_PAGE_SIZE } = require('./page');
const { THEMES, DEFAULT_THEME, getTheme } = require('../themes');
const { loadFonts } = require('./assets');

// Accent colors are used for headings on white and as the background behind
// light text, so they must be dark enough to read against white.
const MIN_ACCENT_CONTRAST = 4.5;

// Combines CLI flags (which win) with the optional "theme" block of the config.
// `cli` and `config` both look like { name, accentColor, pageSize }.
function resolveRenderOptions(cli = {}, config = {}) {
  const pick = (key, flag) =>
    cli[key] !== undefined ? { value: cli[key], source: flag } : config[key] !== undefined ? { value: config[key], source: `theme.${key}` } : null;

  const themeOpt = pick('name', '--theme');
  const theme = getTheme(themeOpt ? themeOpt.value : DEFAULT_THEME);
  if (!theme) {
    throw new UserError(`${themeOpt.source}: unknown theme "${themeOpt.value}"`, {
      hint: `Available themes: ${Object.keys(THEMES).join(', ')}`,
    });
  }

  const colorOpt = pick('accentColor', '--color');
  let accent = theme.defaultAccent;
  if (colorOpt) {
    accent = parseHexColor(colorOpt.value);
    if (!accent) {
      throw new UserError(`${colorOpt.source}: "${colorOpt.value}" is not a hex color`, {
        hint: 'Use a 3- or 6-digit hex color such as "#1A2B4C" or "#2a6".',
      });
    }
    const ratio = contrastRatio(accent, '#ffffff');
    if (ratio < MIN_ACCENT_CONTRAST) {
      throw new UserError(`${colorOpt.source}: ${accent} is too light to use as an accent color (contrast with white is ${ratio.toFixed(1)}:1, minimum ${MIN_ACCENT_CONTRAST}:1)`, {
        hint: 'Choose a darker color; text in the accent color and text on top of it must stay readable.',
      });
    }
  }

  const sizeOpt = pick('pageSize', '--page-size');
  const page = getPageSize(sizeOpt ? sizeOpt.value : DEFAULT_PAGE_SIZE);
  if (!page) {
    throw new UserError(`${sizeOpt.source}: unknown page size "${sizeOpt.value}"`, {
      hint: `Available page sizes: ${Object.keys(PAGE_SIZES).join(', ')}`,
    });
  }

  return { theme, accent, page };
}

// `photo` is a data: URI (or null); see assets.loadPhoto(). `singlePage`
// requests the theme's one-page variant, if it has one.
function renderHtml(resume, { theme, accent, page, photo = null, singlePage = false }) {
  const { css, body } = theme.render({ resume, accent, page, singlePage, photo: theme.showsPhoto ? photo : null });
  return documentShell({ title: `${resume.name} — Resume`, fonts: loadFonts(), css, body });
}

module.exports = { resolveRenderOptions, renderHtml, MIN_ACCENT_CONTRAST };
