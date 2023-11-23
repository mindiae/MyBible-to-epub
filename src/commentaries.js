"use strict";
import Database from "better-sqlite3";
import { sprintf } from "sprintf-js";
import { readdirSync, appendFileSync, writeFileSync } from "node:fs";

const databaseName = process.argv[2];
const bookNumber = process.argv[3];
const chapterNumber = process.argv[4];

let bibleDb;

try {
  bibleDb = new Database(`src/database/${databaseName}.SQLite3`);
} catch (err) {
  console.error(err);
}

let commentDbs;
let commentDbNames;
let commentsSelectVerse;

try {
  commentDbNames = readdirSync('src/database/commentaries/');
  commentDbs = commentDbNames.map((dbName) => new Database(`src/database/commentaries/${dbName}`));
  commentsSelectVerse = commentDbs.map((commentDb) => commentDb.prepare(`
    SELECT text FROM commentaries WHERE book_number = ? AND chapter_number_from = ? AND verse_number_from = ?
  `))
} catch (err) {
  console.error(err);
}

const selectBibleChapter = bibleDb.prepare(`
  SELECT verse, text FROM verses WHERE book_number = ? AND chapter = ?`
);

const bibleVerses = selectBibleChapter.all([bookNumber, chapterNumber]);

const fileName = sprintf('output/commentaries/%s_%03d_%03d.xhtml', databaseName, bookNumber, chapterNumber);
writeFileSync(fileName, '');

bibleVerses.forEach(({ verse, text }) => {
  appendFileSync(fileName,
    `<div><sup>${verse}</sup><span>${text}</span></div>`);
  commentsSelectVerse.forEach((commentSelectVerse) => {
    appendFileSync(fileName, commentSelectVerse.get([bookNumber, chapterNumber, verse])?.text
      ?.replace(
        /<center id="nav_bottom">/g,
        '<div class="text-center">'
      )
      .replace(/<\/center>/g, '</div>')
      .replace(/<p class="br"\/>/g, '<br />')
      .replace(
        /verse__?preacher/g,
        'block text-xl text-semibold my-2'
      )
      .replace(
        / class="(verse__preaching|verse-link link_text|verse-tooltip)"/g,
        ''
      )
      .replace(
        /interpretation-root/g,
        'text-sky-700'
      )
      .replace(
        /interpretation-root-title/g,
        'text-lg'
      )
      .replace(/verse-number/g, 'align-super') ?? "")
  });
});