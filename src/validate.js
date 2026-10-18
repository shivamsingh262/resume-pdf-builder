'use strict';
// Validates a parsed resume.json object and returns a normalized copy.
//
// Error messages name the offending field (e.g. "experience[1].bullets[0]")
// and describe the problem by type only; they never echo field values, so
// personal data does not end up in terminal logs or CI output.

const SHORT = 200; // single-line fields: name, title, dates, ...
const LONG = 5000; // free text: summary, bullets

const TOP_LEVEL_KEYS = [
  'name', 'title', 'location', 'email', 'phone', 'linkedin', 'github', 'website', 'photo',
  'summary', 'skills', 'experience', 'education', 'theme',
];

const EMAIL_RE = /^[^\s@<>()"',;:\\]+@[^\s@<>()"',;:\\]+\.[^\s@<>()"',;:\\]+$/;
// Control characters other than tab and newline are never legitimate in resume text.
const CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f]/;

function typeName(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function isPlainObject(value) {
  return typeName(value) === 'object';
}

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

class Checker {
  constructor() {
    this.errors = [];
  }

  error(path, message) {
    this.errors.push({ path: path || '(root)', message });
  }

  rejectUnknownKeys(obj, allowed, path) {
    for (const key of Object.keys(obj)) {
      if (allowed.includes(key)) continue;
      const guess = allowed.find((k) => editDistance(k.toLowerCase(), key.toLowerCase()) <= 2);
      this.error(join(path, key), `unknown field${guess ? ` (did you mean "${guess}"?)` : ''}`);
    }
  }

  // Returns the trimmed string, `undefined` when an optional field is absent
  // or null, and records an error (returning undefined) otherwise.
  string(obj, key, path, options) {
    return this.text(obj[key], join(path, key), options);
  }

  text(value, p, { required = false, max = SHORT, multiline = false } = {}) {
    if (value === undefined || value === null) {
      if (required) this.error(p, 'is required');
      return undefined;
    }
    if (typeof value !== 'string') {
      this.error(p, `must be a string (got ${typeName(value)})`);
      return undefined;
    }
    const trimmed = value.trim().replace(/\r\n?/g, '\n');
    if (trimmed === '') {
      this.error(p, required ? 'must not be empty' : 'must not be empty (remove the field or set it to null to omit it)');
      return undefined;
    }
    if (trimmed.length > max) {
      this.error(p, `is too long (${trimmed.length} characters, maximum ${max})`);
      return undefined;
    }
    if (CONTROL_RE.test(trimmed)) {
      this.error(p, 'contains control characters');
      return undefined;
    }
    if (!multiline && trimmed.includes('\n')) {
      this.error(p, 'must be a single line (line breaks are only allowed in summary and bullets)');
      return undefined;
    }
    return trimmed;
  }

  // Validates an optional array of items; returns [] when absent or null.
  array(obj, key, path, eachItem) {
    const p = join(path, key);
    const value = obj[key];
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      this.error(p, `must be an array (got ${typeName(value)})`);
      return [];
    }
    return value.map((item, i) => eachItem(item, `${p}[${i}]`)).filter((v) => v !== undefined);
  }

  object(value, path, allowed) {
    if (!isPlainObject(value)) {
      this.error(path, `must be an object (got ${typeName(value)})`);
      return false;
    }
    this.rejectUnknownKeys(value, allowed, path);
    return true;
  }
}

function join(path, key) {
  return path ? `${path}.${key}` : key;
}

// Accepts "https://..." or { "url": "https://...", "label": "..." } for a
// link that must point at `domain` or one of its subdomains. Without a
// `domain`, any https:// host is allowed.
function checkProfileLink(c, obj, key, domain) {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  let url;
  let label;
  if (typeof value === 'string') {
    url = c.string(obj, key, '', { required: true });
  } else if (isPlainObject(value)) {
    c.rejectUnknownKeys(value, ['url', 'label'], key);
    url = c.string(value, 'url', key, { required: true });
    label = c.string(value, 'label', key);
  } else {
    c.error(key, `must be a URL string or an object with "url" and optional "label" (got ${typeName(value)})`);
    return undefined;
  }
  if (url === undefined) return undefined;
  const p = typeof value === 'string' ? key : `${key}.url`;
  const parsed = parseHttpsUrl(url);
  if (parsed.error) {
    c.error(p, parsed.error);
    return undefined;
  }
  const host = parsed.url.hostname;
  if (domain && host !== domain && !host.endsWith(`.${domain}`)) {
    c.error(p, `must be a ${domain} URL`);
    return undefined;
  }
  const href = parsed.url.href;
  return { url: href, label: label || defaultLinkLabel(parsed.url) };
}

function parseHttpsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return { error: 'must be a valid absolute URL starting with https://' };
  }
  if (url.protocol !== 'https:') return { error: `must use https:// (got "${url.protocol}" URL)` };
  if (url.username || url.password) return { error: 'must not contain a username or password' };
  return { url };
}

// "https://www.linkedin.com/in/someone/" -> "linkedin.com/in/someone"
function defaultLinkLabel(url) {
  return `${url.hostname.replace(/^www\./, '')}${url.pathname}`.replace(/\/+$/, '');
}

function checkSkills(c, obj) {
  return c.array(obj, 'skills', '', (group, p) => {
    if (!c.object(group, p, ['category', 'items'])) return undefined;
    const category = c.string(group, 'category', p, { required: true });
    let items = [];
    if (group.items === undefined || group.items === null) {
      c.error(`${p}.items`, 'is required');
    } else if (!Array.isArray(group.items)) {
      c.error(`${p}.items`, `must be an array of strings (got ${typeName(group.items)})`);
    } else if (group.items.length === 0) {
      c.error(`${p}.items`, 'must contain at least one skill (remove the group to omit it)');
    } else {
      items = group.items.map((item, i) => c.text(item, `${p}.items[${i}]`, { required: true, max: SHORT * 2 }));
    }
    return { category, items };
  });
}

function checkExperience(c, obj) {
  return c.array(obj, 'experience', '', (job, p) => {
    if (!c.object(job, p, ['title', 'company', 'dates', 'bullets'])) return undefined;
    const title = c.string(job, 'title', p, { required: true });
    const company = c.string(job, 'company', p, { required: true });
    const dates = c.string(job, 'dates', p, { max: 60 });
    const bullets = c.array(job, 'bullets', p, (b, bp) => c.text(b, bp, { required: true, max: LONG, multiline: true }));
    return { title, company, dates, bullets };
  });
}

function checkEducation(c, obj) {
  return c.array(obj, 'education', '', (ed, p) => {
    if (!c.object(ed, p, ['degree', 'school', 'dates'])) return undefined;
    return {
      degree: c.string(ed, 'degree', p, { required: true }),
      school: c.string(ed, 'school', p, { required: true }),
      dates: c.string(ed, 'dates', p, { max: 60 }),
    };
  });
}

// Only checks shape here; theme names, colors and page sizes are checked by
// resolveRenderOptions() so CLI flags and config values share one code path.
function checkTheme(c, obj) {
  const value = obj.theme;
  if (value === undefined || value === null) return {};
  if (!c.object(value, 'theme', ['name', 'accentColor', 'pageSize'])) return {};
  return {
    name: c.string(value, 'name', 'theme'),
    accentColor: c.string(value, 'accentColor', 'theme'),
    pageSize: c.string(value, 'pageSize', 'theme'),
  };
}

function validateResume(input) {
  const c = new Checker();
  if (!isPlainObject(input)) {
    c.error('', `must be a JSON object (got ${typeName(input)})`);
    return { errors: c.errors };
  }
  c.rejectUnknownKeys(input, TOP_LEVEL_KEYS, '');

  const resume = {
    name: c.string(input, 'name', '', { required: true }),
    title: c.string(input, 'title', '', { required: true }),
    location: c.string(input, 'location', ''),
    email: c.string(input, 'email', ''),
    phone: c.string(input, 'phone', '', { max: 40 }),
    linkedin: checkProfileLink(c, input, 'linkedin', 'linkedin.com'),
    github: checkProfileLink(c, input, 'github', 'github.com'),
    website: checkProfileLink(c, input, 'website'),
    photo: c.string(input, 'photo', '', { max: 500 }),
    summary: c.string(input, 'summary', '', { max: LONG, multiline: true }),
    skills: checkSkills(c, input),
    experience: checkExperience(c, input),
    education: checkEducation(c, input),
  };
  const theme = checkTheme(c, input);

  if (resume.email !== undefined && !EMAIL_RE.test(resume.email)) {
    c.error('email', 'must be a valid email address like name@example.com');
  }
  if (resume.phone !== undefined && !/^[0-9+()./\-\s]+(\s*(ext\.?|x)\s*[0-9]+)?$/i.test(resume.phone)) {
    c.error('phone', 'may only contain digits, spaces and + - ( ) . / characters');
  }

  return c.errors.length ? { errors: c.errors } : { errors: [], resume, theme };
}

module.exports = { validateResume, parseHttpsUrl, TOP_LEVEL_KEYS };
