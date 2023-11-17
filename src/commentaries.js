"use strict";
import Database from "better-sqlite3";
import { mkdirSync, readdirSync, writeFileSync, existsSync } from "node:fs";

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

bibleVerses.forEach(({verse, text}) => {
  console.log(verse, text);
  commentsSelectVerse.forEach((commentSelectVerse) => {
    console.log(commentSelectVerse.get([bookNumber, chapterNumber, verse])?.text)
  });
});