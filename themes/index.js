'use strict';
// Theme registry. To add a theme, create themes/<name>/index.js exporting
// { name, description, defaultAccent, showsPhoto, render } and list it here.
// See CONTRIBUTING.md for the full contract.

const THEMES = {
  sidebar: require('./sidebar'),
  minimal: require('./minimal'),
};

const DEFAULT_THEME = 'sidebar';
// "default" always means the default theme, so `--theme default` keeps working
// if the default ever changes.
const ALIASES = { default: DEFAULT_THEME };

function getTheme(name) {
  const key = String(name).toLowerCase();
  return THEMES[ALIASES[key] || key] || null;
}

module.exports = { THEMES, DEFAULT_THEME, getTheme };
