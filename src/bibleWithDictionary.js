'use strict';
import Database from 'better-sqlite3';
import { sprintf } from 'sprintf-js';
import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import parseStrong from './lib/parseStrong.js';

const databaseName = process.argv[2];
const dictionaryName = process.argv[3];

let bibleDb;

try {
  bibleDb = new Database(`src/database/${databaseName}.SQLite3`);
} catch (err) {
  console.error(err);
}

const chapterString = bibleDb
  .prepare(
    `SELECT value FROM info
    WHERE name = 'chapter_string'`
  )
  .get().value;

const chapterStringPsalm =
  bibleDb
    .prepare(
      `SELECT value FROM info
      WHERE name = 'chapter_string_ps'`
    )
    .get()?.value ?? '';

const getChapterName = (chapter, chapterString) => {
  return chapterString.includes('%')
    ? sprintf(chapterString, chapter)
    : `${chapterString} ${chapter}`;
};

const getChapterNamePsalm = (psalmNumber, chapterStringPsalm) => {
  return chapterStringPsalm.includes('%')
    ? sprintf(chapterStringPsalm, psalmNumber)
    : `${chapterStringPsalm} ${psalmNumber}`;
};

const selectBooks = bibleDb.prepare('SELECT * FROM books');

const selectChapters = bibleDb.prepare(
  `SELECT DISTINCT
      chapter
  FROM
      verses
  WHERE
      book_number = ? AND verse = 1`
);

const selectVerses = bibleDb.prepare(
  `SELECT DISTINCT
      verse, text
  FROM
      verses
  WHERE
      book_number = ? AND chapter = ?`
);

const outputDir = `output/${databaseName}+`;
if (!existsSync(outputDir)) {
  mkdirSync(outputDir);
}

let dictionaryDb;

try {
  dictionaryDb = new Database(
    `src/database/dictionaries/${dictionaryName}.dictionary.SQLite3`
  );
} catch (err) {
  console.error(err);
}

const strongs = dictionaryDb
  .prepare(
    `SELECT
        *,
        ((ROW_NUMBER() OVER (ORDER BY CAST(topic AS INTEGER)) - 1) / 50) + 1
            AS page_number
    FROM
        dictionary
        `
  )
  .all();

strongs
  .map((S, _, strongs) => {
    const definition = S.definition
      .replace(
        /href='S:([GH][0-9]+)'/g,
        (_, g1) =>
          `class="noteref" epub:type="noteref" role="doc-noteref" href="study${
            strongs.find((value) => value.topic === g1).page_number
          }.xhtml#f${g1}"`
      )
      .replace(
        /href='B:(\d+) (\d+):(\d+)(-\d+)?(-\d+:\d+)?'/g,
        (_, book_number, chapter, verse) =>
          `href="${sprintf('%03d_%03d.xhtml', book_number, chapter)}#v${verse}"`
      );
    return { ...S, definition };
  })
  .forEach((S, index, strongs) => {
    const studyFilePath = `${outputDir}/study${S.page_number}.xhtml`;
    if (S.page_number !== strongs[index - 1]?.page_number) {
      writeFileSync(
        studyFilePath,
        `<?xml version='1.0' encoding='utf-8'?>
          <html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <link rel="stylesheet" href="strongStyle.css" />
          </head>
          <body>
          `
      );
    }

    appendFileSync(
      studyFilePath,
      `<aside class="footnote" epub:type="footnote" id="f${S.topic}">${S.definition}</aside>
      `
    );

    if ((index + 1) % 50 === 0) {
      appendFileSync(
        studyFilePath,
        `</body>
        </html>
        `
      );
    }
  });

const strongStyle = dictionaryDb
  .prepare(
    `SELECT
        value
    FROM
        info
    WHERE
        name = 'html_style' `
  )
  .get()
  .value.replace(/%COLOR_BLUE%/g, '#0080FF')
  .replace(/%COLOR_GREEN%/g, '#75F3A5')
  .replace(/%COLOR_PURPLE%/g, '#800080');

writeFileSync(`${outputDir}/strongStyle.css`, strongStyle);

const cognateStrongNumbers = dictionaryDb
  .prepare(
    `SELECT
      *
  FROM
      cognate_strong_numbers`
  )
  .all();

selectBooks.all().forEach(({ book_number, short_name, long_name }) => {
  selectChapters.all([book_number]).forEach(({ chapter }) => {
    const fileName = sprintf(
      '%s/%03d_%03d.xhtml',
      outputDir,
      book_number,
      chapter
    );

    writeFileSync(
      fileName,
      `<?xml version='1.0' encoding='utf-8'?>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <link rel="stylesheet" href="style.css">
        </head>
        <body>
        `
    );

    if (chapter === 1) {
      appendFileSync(
        fileName,
        `<h1>${long_name}</h1>
        `
      );
    }

    const header2Name = `${short_name} ${
      book_number === '230'
        ? getChapterNamePsalm(chapter, chapterStringPsalm)
        : getChapterName(chapter, chapterString)
    }`;

    appendFileSync(
      fileName,
      `<h2>${header2Name}</h2>
      <section>
      `
    );

    selectVerses.all([book_number, chapter]).forEach(({ verse, text }) => {
      const verseString = databaseName.includes('json')
        ? parseStrong(JSON.parse(text), verse, cognateStrongNumbers, strongs)
        : `<span><sup>${verse}</sup>${text}</span>
        `;

      appendFileSync(fileName, verseString);
    });

    appendFileSync(
      fileName,
      `</section>
      </body>
      </html>
      `
    );
  });
});
