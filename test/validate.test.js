'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateResume } = require('../src/validate');
const { readExample, minimalResume } = require('./helpers');

const paths = (result) => result.errors.map((e) => e.path);
const messageFor = (result, path) => (result.errors.find((e) => e.path === path) || {}).message;

test('the public example configuration is valid', () => {
  const result = validateResume(readExample());
  assert.deepEqual(result.errors, []);
  assert.equal(result.resume.name, 'Alex Morgan');
  assert.equal(result.resume.experience.length, 3);
  assert.deepEqual(result.theme, { name: 'sidebar', accentColor: '#1A2B4C', pageSize: 'letter' });
});

test('name and title are required', () => {
  const result = validateResume({});
  assert.equal(messageFor(result, 'name'), 'is required');
  assert.equal(messageFor(result, 'title'), 'is required');
});

test('a minimal resume with only name and title is valid; sections default to empty', () => {
  const result = validateResume(minimalResume());
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.resume.skills, []);
  assert.deepEqual(result.resume.experience, []);
  assert.deepEqual(result.resume.education, []);
  assert.equal(result.resume.photo, undefined);
});

test('the root value must be an object', () => {
  for (const value of [null, [], 'text', 42]) {
    assert.match(messageFor(validateResume(value), '(root)'), /must be a JSON object/);
  }
});

test('wrong field types are reported with their path and actual type', () => {
  const result = validateResume(
    minimalResume({
      name: 42,
      skills: { category: 'x' },
      experience: [{ title: 'Engineer', company: 'Example Systems', bullets: ['ok', 7] }, 'not an object'],
      education: [{ degree: ['B.Sc.'], school: 'Example State University' }],
    })
  );
  assert.equal(messageFor(result, 'name'), 'must be a string (got number)');
  assert.equal(messageFor(result, 'skills'), 'must be an array (got object)');
  assert.equal(messageFor(result, 'experience[0].bullets[1]'), 'must be a string (got number)');
  assert.equal(messageFor(result, 'experience[1]'), 'must be an object (got string)');
  assert.equal(messageFor(result, 'education[0].degree'), 'must be a string (got array)');
});

test('missing required fields inside sections are reported', () => {
  const result = validateResume(
    minimalResume({ experience: [{ title: 'Engineer' }], skills: [{ category: 'Languages' }], education: [{ school: 'X' }] })
  );
  assert.deepEqual(paths(result).sort(), ['education[0].degree', 'experience[0].company', 'skills[0].items'].sort());
});

test('unknown fields are rejected, with a suggestion for likely typos', () => {
  const result = validateResume(minimalResume({ sumary: 'x', experience: [{ title: 'a', company: 'b', bullet: [] }] }));
  assert.equal(messageFor(result, 'sumary'), 'unknown field (did you mean "summary"?)');
  assert.equal(messageFor(result, 'experience[0].bullet'), 'unknown field (did you mean "bullets"?)');
});

test('empty strings are rejected instead of silently rendered', () => {
  const result = validateResume(minimalResume({ name: '   ', location: '' }));
  assert.equal(messageFor(result, 'name'), 'must not be empty');
  assert.match(messageFor(result, 'location'), /remove the field or set it to null/);
});

test('optional fields and sections may be null or omitted; empty arrays are allowed', () => {
  const result = validateResume(
    minimalResume({ location: null, photo: null, summary: null, skills: [], experience: [], education: null, linkedin: null })
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.resume.skills, []);
});

test('a skill group needs at least one item', () => {
  const result = validateResume(minimalResume({ skills: [{ category: 'Languages', items: [] }] }));
  assert.match(messageFor(result, 'skills[0].items'), /at least one skill/);
});

test('line breaks are allowed in summary and bullets but not in single-line fields', () => {
  const ok = validateResume(minimalResume({ summary: 'One.\r\n\r\nTwo.', experience: [{ title: 'a', company: 'b', bullets: ['x\ny'] }] }));
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.resume.summary, 'One.\n\nTwo.');
  const bad = validateResume(minimalResume({ title: 'Senior\nEngineer' }));
  assert.match(messageFor(bad, 'title'), /single line/);
});

test('control characters and overly long values are rejected', () => {
  const result = validateResume(minimalResume({ location: 'Example\u0007City', summary: 'x'.repeat(5001) }));
  assert.equal(messageFor(result, 'location'), 'contains control characters');
  assert.match(messageFor(result, 'summary'), /too long \(5001 characters, maximum 5000\)/);
});

test('Unicode and HTML special characters are accepted as plain text', () => {
  const result = validateResume(minimalResume({ name: 'Zoë Ångström-Núñez 日本', summary: '<b>"Tom" & \'Jerry\'</b> 🚀' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.resume.name, 'Zoë Ångström-Núñez 日本');
});

test('email and phone formats are checked', () => {
  const bad = validateResume(minimalResume({ email: 'not-an-email', phone: 'call me maybe' }));
  assert.match(messageFor(bad, 'email'), /valid email address/);
  assert.match(messageFor(bad, 'phone'), /may only contain digits/);
  const ok = validateResume(minimalResume({ email: 'alex.morgan@example.com', phone: '+1 (202) 555-0147 ext. 12' }));
  assert.deepEqual(ok.errors, []);
});

test('error messages never echo field values', () => {
  const secret = 'very-private-value';
  const result = validateResume(minimalResume({ email: secret, title: `${secret}\n`, linkedin: `http://${secret}.com` }));
  assert.ok(result.errors.length >= 2);
  for (const e of result.errors) assert.ok(!e.message.includes(secret), e.message);
});

test('linkedin accepts an https URL string and derives a label', () => {
  const result = validateResume(minimalResume({ linkedin: 'https://www.linkedin.com/in/alex-morgan-example/' }));
  assert.deepEqual(result.resume.linkedin, {
    url: 'https://www.linkedin.com/in/alex-morgan-example/',
    label: 'linkedin.com/in/alex-morgan-example',
  });
});

test('linkedin accepts an object with url and custom label', () => {
  const result = validateResume(minimalResume({ linkedin: { url: 'https://linkedin.com/in/alex', label: 'Alex on LinkedIn' } }));
  assert.deepEqual(result.resume.linkedin, { url: 'https://linkedin.com/in/alex', label: 'Alex on LinkedIn' });
});

test('unsafe or invalid linkedin URLs are rejected', () => {
  const cases = {
    'javascript:alert(1)': /https:\/\//,
    'http://www.linkedin.com/in/alex': /must use https:\/\//,
    'data:text/html,<script>alert(1)</script>': /must use https:\/\//,
    'https://evil.example.com/in/alex': /linkedin\.com URL/,
    'https://linkedin.com.evil.example/in/alex': /linkedin\.com URL/,
    'https://user:pass@www.linkedin.com/in/alex': /username or password/,
    'linkedin.com/in/alex': /valid absolute URL/,
  };
  for (const [url, expected] of Object.entries(cases)) {
    assert.match(messageFor(validateResume(minimalResume({ linkedin: url })), 'linkedin'), expected, url);
  }
  const nested = validateResume(minimalResume({ linkedin: { url: 'javascript:alert(1)' } }));
  assert.match(messageFor(nested, 'linkedin.url'), /https:\/\//);
  assert.match(messageFor(validateResume(minimalResume({ linkedin: 5 })), 'linkedin'), /URL string or an object/);
});

test('github accepts an https URL string or an object with a custom label', () => {
  const result = validateResume(minimalResume({ github: 'https://github.com/alex-morgan-example/' }));
  assert.deepEqual(result.resume.github, {
    url: 'https://github.com/alex-morgan-example/',
    label: 'github.com/alex-morgan-example',
  });
  const custom = validateResume(minimalResume({ github: { url: 'https://github.com/alex', label: 'Alex on GitHub' } }));
  assert.deepEqual(custom.resume.github, { url: 'https://github.com/alex', label: 'Alex on GitHub' });
  assert.equal(validateResume(minimalResume({ github: null })).resume.github, undefined);
});

test('unsafe or invalid github URLs are rejected', () => {
  const cases = {
    'javascript:alert(1)': /https:\/\//,
    'http://github.com/alex': /must use https:\/\//,
    'https://evil.example.com/alex': /github\.com URL/,
    'https://github.com.evil.example/alex': /github\.com URL/,
    'https://www.linkedin.com/in/alex': /github\.com URL/,
    'https://user:pass@github.com/alex': /username or password/,
    'github.com/alex': /valid absolute URL/,
  };
  for (const [url, expected] of Object.entries(cases)) {
    assert.match(messageFor(validateResume(minimalResume({ github: url })), 'github'), expected, url);
  }
  const nested = validateResume(minimalResume({ github: { url: 'javascript:alert(1)', extra: 1 } }));
  assert.match(messageFor(nested, 'github.url'), /https:\/\//);
  assert.ok(paths(nested).includes('github.extra'));
  assert.match(messageFor(validateResume(minimalResume({ github: 5 })), 'github'), /URL string or an object/);
});

test('theme block shape is checked', () => {
  const result = validateResume(minimalResume({ theme: { name: 7, colour: '#000' } }));
  assert.equal(messageFor(result, 'theme.name'), 'must be a string (got number)');
  assert.match(messageFor(result, 'theme.colour'), /unknown field/);
  assert.match(messageFor(validateResume(minimalResume({ theme: 'dark' })), 'theme'), /must be an object/);
});
