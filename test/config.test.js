'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../src/config');
const { loadPhoto } = require('../src/assets');
const { UserError } = require('../src/errors');
const { EXAMPLE, ROOT, minimalResume, tmpDir, writeJson } = require('./helpers');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

test('loads and validates the example config', () => {
  const { resume, configDir } = loadConfig(EXAMPLE);
  assert.equal(resume.name, 'Alex Morgan');
  assert.equal(configDir, ROOT);
});

test('a missing config file explains how to create one', () => {
  assert.throws(() => loadConfig('/nonexistent/resume.json'), (err) => {
    assert.ok(err instanceof UserError);
    assert.match(err.message, /Config file not found/);
    assert.match(err.hint, /cp resume\.example\.json resume\.json/);
    return true;
  });
});

test('malformed JSON reports line and column without echoing file content', (t) => {
  const dir = tmpDir(t);
  const file = writeJson(dir, 'resume.json', '{\n  "name": "Private Person",\n  "title": "Engineer",\n}\n');
  assert.throws(() => loadConfig(file), (err) => {
    assert.ok(err instanceof UserError);
    assert.match(err.message, /^resume\.json is not valid JSON: .*\(line 4, column 1\)$/);
    assert.ok(!err.message.includes('Private Person'));
    assert.match(err.hint, /trailing commas/);
    return true;
  });
});

test('JavaScript-style configs (module.exports, comments) are rejected as invalid JSON', (t) => {
  const dir = tmpDir(t);
  const file = writeJson(dir, 'resume.json', "// comment\nmodule.exports = { name: 'x' };");
  assert.throws(() => loadConfig(file), /is not valid JSON/);
});

test('an empty file is invalid JSON', (t) => {
  const file = writeJson(tmpDir(t), 'resume.json', '');
  assert.throws(() => loadConfig(file), /is not valid JSON: Unexpected end of JSON input/);
});

test('a UTF-8 byte order mark is tolerated', (t) => {
  const file = writeJson(tmpDir(t), 'resume.json', `﻿${JSON.stringify(minimalResume())}`);
  assert.equal(loadConfig(file).resume.name, 'Alex Morgan');
});

test('validation failures list every problem', (t) => {
  const file = writeJson(tmpDir(t), 'resume.json', { title: 3, experience: [{}] });
  assert.throws(() => loadConfig(file), (err) => {
    assert.equal(err.message, 'resume.json has 4 problems:');
    assert.deepEqual(err.details, [
      'name: is required',
      'title: must be a string (got number)',
      'experience[0].title: is required',
      'experience[0].company: is required',
    ]);
    return true;
  });
});

test('photo: loads a valid image relative to the config directory', (t) => {
  const dir = tmpDir(t);
  fs.mkdirSync(path.join(dir, 'img'));
  fs.writeFileSync(path.join(dir, 'img', 'me.png'), PNG);
  assert.match(loadPhoto('img/me.png', dir), /^data:image\/png;base64,/);
  assert.match(loadPhoto('./img/me.png', dir), /^data:image\/png;base64,/);
});

test('photo: the bundled placeholder SVG loads', () => {
  assert.match(loadPhoto('assets/placeholder-avatar.svg', ROOT), /^data:image\/svg\+xml;base64,/);
});

test('photo: a missing file gives an actionable error', (t) => {
  assert.throws(() => loadPhoto('missing.png', tmpDir(t)), (err) => {
    assert.match(err.message, /photo: file not found: "missing\.png"/);
    assert.match(err.hint, /set "photo" to null/);
    return true;
  });
});

test('photo: absolute paths, URLs and paths outside the config directory are rejected', (t) => {
  const dir = tmpDir(t);
  assert.throws(() => loadPhoto('/etc/passwd.png', dir), /relative to the config file/);
  assert.throws(() => loadPhoto('https://example.com/me.png', dir), /relative to the config file/);
  assert.throws(() => loadPhoto('file:///etc/me.png', dir), /relative to the config file/);
  assert.throws(() => loadPhoto('../outside.png', dir), /inside the directory/);
  assert.throws(() => loadPhoto('a/../../outside.png', dir), /inside the directory/);
});

test('photo: symlinks pointing outside the config directory are rejected', (t) => {
  const dir = tmpDir(t);
  const outside = tmpDir(t);
  fs.writeFileSync(path.join(outside, 'secret.png'), PNG);
  fs.symlinkSync(path.join(outside, 'secret.png'), path.join(dir, 'link.png'));
  assert.throws(() => loadPhoto('link.png', dir), /via a symlink/);
});

test('photo: unsupported types and mismatched content are rejected', (t) => {
  const dir = tmpDir(t);
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'hello');
  fs.writeFileSync(path.join(dir, 'fake.png'), 'not really a png');
  fs.mkdirSync(path.join(dir, 'folder.png'));
  assert.throws(() => loadPhoto('notes.txt', dir), /unsupported file type "\.txt"/);
  assert.throws(() => loadPhoto('fake.png', dir), /does not look like a PNG image/);
  assert.throws(() => loadPhoto('folder.png', dir), /not a regular file/);
});
