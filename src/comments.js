'use strict';
import Database from 'better-sqlite3';
import { sprintf } from 'sprintf-js';
import {
  readdirSync,
  appendFileSync,
  writeFileSync,
  existsSync,
  mkdirSync
} from 'node:fs';

const databaseName = process.argv[2];
const bookNumber = process.argv[3];

let bibleDb;

try {
  bibleDb = new Database(`src/database/${databaseName}.SQLite3`);
} catch (err) {
  console.error(err);
}

let comments;

try {
  comments = readdirSync('src/database/commentaries/').map((dbFileName) => {
    const dbName = dbFileName.replace('.commentaries.SQLite3', '');
    const db = new Database(`src/database/commentaries/${dbFileName}`);
    const selectVerse = db.prepare(`
      SELECT text FROM commentaries
      WHERE book_number = ?
        AND chapter_number_from = ?
        AND verse_number_from = ?`);
    const css =
      db
        .prepare(
          `SELECT value FROM info
        WHERE name = 'html_style'`
        )
        .get()
        ?.value.replace(/^#/gm, '.') ?? '';
    const description = db
      .prepare(
        `SELECT value FROM info
        WHERE name = 'description'`
      )
      .get().value;

    return {
      description,
      css,
      dbName,
      db,
      selectVerse
    };
  });
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
    ?.get().value ?? '';

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

const chaptersAmount = bibleDb
  .prepare(
    `SELECT max(chapter) AS max_chapter FROM verses
    WHERE book_number = ? AND verse = '1'`
  )
  .get([bookNumber]).max_chapter;

const selectBibleChapter = bibleDb.prepare(`
  SELECT verse, text FROM verses
  WHERE book_number = ? AND chapter = ?`);

if (!existsSync(`output/commentaries/${databaseName}`)) {
  mkdirSync(`output/commentaries/${databaseName}`);
}

Array.from({ length: chaptersAmount }, (_, index) => index + 1).forEach(
  (chapter) => {
    const bibleVerses = selectBibleChapter.all([bookNumber, chapter]);

    bibleVerses.forEach(({ verse, text }) => {
      const fileName = sprintf(
        'output/commentaries/%s/%03d_%03d_%03d.xhtml',
        databaseName,
        bookNumber,
        chapter,
        verse
      );

      writeFileSync(
        fileName,
        `<?xml version='1.0' encoding='utf-8'?>
          <html xmlns="http://www.w3.org/1999/xhtml">
          <head>`
      );

      comments.forEach(({ dbName }) => {
        appendFileSync(
          fileName,
          `<link rel="stylesheet" href="${dbName}.css">`
        );
      });

      appendFileSync(fileName, '</head><body>');

      if (verse === 1) {
        const headerName =
          bookNumber === '230'
            ? getChapterNamePsalm(chapter, chapterStringPsalm)
            : getChapterName(chapter, chapterString);

        appendFileSync(fileName, `<h1>${headerName}</h1>`);
      }

      appendFileSync(fileName, `<h2><sup>${verse}</sup>${text}</h2>`);

      comments.forEach(({ selectVerse, description }) => {
        const verseComment =
          selectVerse
            .get([bookNumber, chapter, verse])
            ?.text?.replace(/id=/g, 'class=')
            .replace(/<\/center>/g, '</div>')
            .replace(/<center/g, '<div align="center"')
            .replace(/<p class="br"\/>/g, '<br />') ?? '';

        appendFileSync(
          fileName,
          verseComment
            ? `<h3>${description}</h3>
              ${verseComment}`
            : ''
        );
      });

      appendFileSync(fileName, '</body></html>');
    });
  }
);

comments.forEach(({ dbName, css }) => {
  writeFileSync(`output/commentaries/${databaseName}/${dbName}.css`, css);
});
