'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, EXAMPLE, tmpDir, writeJson, minimalResume } = require('./helpers');

function cli(args, cwd = ROOT) {
  const res = spawnSync(process.execPath, [path.join(ROOT, 'build-pdf.js'), ...args], { cwd, encoding: 'utf8' });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

test('--help prints usage', () => {
  const { code, stdout } = cli(['--help']);
  assert.equal(code, 0);
  assert.match(stdout, /Usage: node build-pdf\.js/);
  assert.match(stdout, /--color <hex>/);
});

test('--list-themes lists every theme and marks the default', () => {
  const { code, stdout } = cli(['--list-themes']);
  assert.equal(code, 0);
  assert.match(stdout, /^sidebar .*\[default\]$/m);
  assert.match(stdout, /^minimal /m);
});

test('unknown flags fail with usage', () => {
  const { code, stderr } = cli(['--colour', '#000']);
  assert.equal(code, 1);
  assert.match(stderr, /Unknown option '--colour'/);
  assert.match(stderr, /Usage:/);
});

test('a missing default resume.json explains how to get started', (t) => {
  const { code, stderr } = cli([], tmpDir(t));
  assert.equal(code, 1);
  assert.match(stderr, /Error: Config file not found: resume\.json/);
  assert.match(stderr, /cp resume\.example\.json resume\.json/);
  assert.ok(!stderr.includes('    at '), 'no stack trace for user errors');
});

test('validation errors are listed one per line', (t) => {
  const dir = tmpDir(t);
  const config = writeJson(dir, 'resume.json', { name: 1, linkedin: 'javascript:alert(1)' });
  const { code, stderr } = cli(['-c', config, '-o', dir]);
  assert.equal(code, 1);
  assert.match(stderr, /resume\.json has 3 problems:/);
  assert.match(stderr, /^ {2}- name: must be a string \(got number\)$/m);
  assert.match(stderr, /^ {2}- title: is required$/m);
  assert.match(stderr, /^ {2}- linkedin: must use https:\/\//m);
});

test('invalid --theme and --color values are rejected', () => {
  let r = cli(['-c', EXAMPLE, '--theme', 'fancy', '--html-only']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /--theme: unknown theme "fancy"/);
  r = cli(['-c', EXAMPLE, '--color', 'red', '--html-only']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /--color: "red" is not a hex color/);
});

test('--html-only builds HTML with the chosen theme, color and output name', (t) => {
  const dir = tmpDir(t);
  const config = writeJson(dir, 'cv.json', minimalResume());
  const { code, stdout } = cli(['-c', config, '-o', dir, '--html-only', '-t', 'minimal', '--color', '#2E7D32', '--name', 'out']);
  assert.equal(code, 0);
  assert.match(stdout, /Theme: minimal, accent #2e7d32, letter/);
  const html = fs.readFileSync(path.join(dir, 'out.html'), 'utf8');
  assert.ok(html.includes('#2e7d32'));
});

test('builds a PDF from the example and reports the page count', (t) => {
  const dir = tmpDir(t);
  const { code, stdout } = cli(['-c', EXAMPLE, '-o', dir, '--color', '#1A2B4C']);
  assert.equal(code, 0, stdout);
  assert.match(stdout, /Wrote .*resume\.example\.pdf \(1 page\)/);
  assert.ok(fs.statSync(path.join(dir, 'resume.example.pdf')).size > 10000);
});
