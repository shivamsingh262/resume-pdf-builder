'use strict';
// Reads and validates a resume.json file.

const fs = require('fs');
const path = require('path');
const { UserError } = require('./errors');
const { validateResume } = require('./validate');

// Converts V8's "... at position N" into a line/column and drops any quoted
// excerpt of the file, which could contain personal data.
function describeJsonError(err, text) {
  let message = err.message.replace(/,? ".*" is not valid JSON$/s, '').replace(/ in JSON at position \d+.*$/s, '');
  const match = /position (\d+)/.exec(err.message);
  if (match) {
    const before = text.slice(0, Number(match[1]));
    const line = before.split('\n').length;
    const column = before.length - before.lastIndexOf('\n');
    message += ` (line ${line}, column ${column})`;
  }
  return message;
}

function parseResumeJson(text, label = 'config') {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  try {
    return JSON.parse(source);
  } catch (err) {
    throw new UserError(`${label} is not valid JSON: ${describeJsonError(err, source)}`, {
      hint: 'Check for trailing commas, missing quotes around keys, or comments; JSON allows none of these.',
    });
  }
}

function loadConfig(configPath) {
  const absPath = path.resolve(configPath);
  const label = path.basename(absPath);
  let text;
  try {
    text = fs.readFileSync(absPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new UserError(`Config file not found: ${configPath}`, {
        hint: 'Create one from the example with "cp resume.example.json resume.json", or pass --config <file>.',
      });
    }
    if (err.code === 'EISDIR') throw new UserError(`Config path is a directory, not a file: ${configPath}`);
    throw new UserError(`Could not read config file ${configPath}: ${err.code || err.message}`);
  }

  const data = parseResumeJson(text, label);
  const { errors, resume, theme } = validateResume(data);
  if (errors.length) {
    throw new UserError(`${label} has ${errors.length} problem${errors.length === 1 ? '' : 's'}:`, {
      details: errors.map((e) => `${e.path}: ${e.message}`),
      hint: 'See "Configuration" in README.md for the expected fields.',
    });
  }
  return { resume, theme, configDir: path.dirname(absPath), configName: label };
}

module.exports = { loadConfig, parseResumeJson };
