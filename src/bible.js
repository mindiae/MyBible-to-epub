'use strict';
import Database from 'better-sqlite3';
import { sprintf } from 'sprintf-js';
import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { parseText } from './lib/parseText.js';

const databaseName = process.argv[2];

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
  `SELECT DISTINCT chapter FROM verses
  WHERE book_number = ? AND verse = 1`
);

const selectVerses = bibleDb.prepare(
  `SELECT DISTINCT verse, text FROM verses
  WHERE book_number = ? AND chapter = ?`
);

if (!existsSync(`output/${databaseName}`)) {
  mkdirSync(`output/${databaseName}`);
}

selectBooks.all().forEach(({ book_number, short_name, long_name }) => {
  selectChapters.all([book_number]).forEach(({ chapter }) => {
    const fileName = sprintf(
      'output/%s/%03d_%03d.xhtml',
      databaseName,
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
        ? parseText(JSON.parse(text), verse)
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
