# Bundled fonts

These fonts are embedded into every generated HTML and PDF file, so output looks
the same on any machine and works offline.

| File | Font | Version | License |
| --- | --- | --- | --- |
| `inter-latin.woff2` | Inter, variable weight 400–700, Latin subset | 4.001 | SIL Open Font License 1.1, see [`LICENSE-Inter.txt`](LICENSE-Inter.txt) |
| `source-serif-latin.woff2` | Source Serif 4, variable weight 400–700, Latin subset | 4.004 | SIL Open Font License 1.1, see [`LICENSE-SourceSerif4.md`](LICENSE-SourceSerif4.md) |

- Inter: Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)
- Source Serif 4: © 2014–2021 Adobe (http://www.adobe.com/), with Reserved Font
  Name "Source". Source is a trademark of Adobe in the United States and/or
  other countries.

The files are the Latin-only web subsets, as distributed for web use (for
example by Google Fonts). The OFL allows the fonts to be bundled with software
and embedded in documents such as the generated PDFs, but not sold on their own.

Only Latin characters are covered. Other scripts (Cyrillic, Greek, CJK, emoji,
...) fall back to whatever fonts Chromium finds on the system.
