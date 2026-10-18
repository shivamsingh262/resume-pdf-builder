#!/usr/bin/env node
'use strict';
// Command-line entry point: builds HTML and PDF from a resume JSON file.
// Run "node build-pdf.js --help" for usage.

const path = require('path');
const { parseArgs } = require('util');
const { build } = require('./src/build');
const { UserError } = require('./src/errors');
const { THEMES, DEFAULT_THEME } = require('./themes');
const { PAGE_SIZES, DEFAULT_PAGE_SIZE } = require('./src/page');

const USAGE = `Usage: node build-pdf.js [options]

Options:
  -c, --config <file>     Resume JSON file (default: resume.json)
  -t, --theme <name>      Theme: ${Object.keys(THEMES).join(', ')} (default: ${DEFAULT_THEME})
      --color <hex>       Accent color, e.g. "#1A2B4C"
      --page-size <size>  Page size: ${Object.keys(PAGE_SIZES).join(', ')} (default: ${DEFAULT_PAGE_SIZE})
  -o, --out-dir <dir>     Output directory (default: output)
      --name <name>       Output file name without extension (default: config file name)
      --html-only         Write the HTML file only, skip the PDF
      --list-themes       List available themes and exit
  -h, --help              Show this help

--theme, --color and --page-size override the "theme" block in the config file.`;

function parseCli(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      config: { type: 'string', short: 'c', default: 'resume.json' },
      theme: { type: 'string', short: 't' },
      color: { type: 'string' },
      'page-size': { type: 'string' },
      'out-dir': { type: 'string', short: 'o', default: 'output' },
      name: { type: 'string' },
      'html-only': { type: 'boolean', default: false },
      'list-themes': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  return values;
}

function printError(err) {
  if (err instanceof UserError) {
    console.error(`Error: ${err.message}`);
    for (const line of err.details) console.error(`  - ${line}`);
    if (err.hint) console.error(`\n${err.hint}`);
    if (process.env.DEBUG && err.cause) console.error('\n', err.cause);
  } else if (err && err.code && String(err.code).startsWith('ERR_PARSE_ARGS')) {
    console.error(`Error: ${err.message}\n\n${USAGE}`);
  } else {
    console.error(err);
  }
}

async function main(argv) {
  const args = parseCli(argv);
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (args['list-themes']) {
    for (const t of Object.values(THEMES)) {
      console.log(`${t.name.padEnd(10)} ${t.description}${t.name === DEFAULT_THEME ? ' [default]' : ''}`);
    }
    return;
  }

  const result = await build({
    config: args.config,
    theme: args.theme,
    color: args.color,
    pageSize: args['page-size'],
    outDir: args['out-dir'],
    name: args.name,
    pdf: !args['html-only'],
  });

  const rel = (p) => {
    const r = path.relative(process.cwd(), p);
    return r && !r.startsWith('..') ? r : p;
  };
  console.log(`Theme: ${result.theme}, accent ${result.accent}, ${result.pageSize}`);
  console.log(`Wrote ${rel(result.htmlPath)}`);
  if (result.pdfPath) {
    console.log(`Wrote ${rel(result.pdfPath)} (${result.pageCount} page${result.pageCount === 1 ? '' : 's'})`);
  }
  for (const w of result.warnings) console.warn(`Warning: ${w}`);
}

main(process.argv.slice(2)).catch((err) => {
  printError(err);
  process.exitCode = 1;
});
