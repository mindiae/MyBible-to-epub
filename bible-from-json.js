"use strict";
import sqlite3 from "sqlite3";
import { sprintf } from "sprintf-js";
import { mkdirSync, writeFileSync, existsSync } from "fs";


const databaseName = process.argv[2];
const databasePath = `./database/${databaseName}.SQLite3`;

const db = new sqlite3.Database(databasePath);

function getRecords(sql, variables = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, variables, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }

    });
  });
}

function parseText(text, verse) {
  const startsWithWord
    = ['word', 'dash', 'longdash'].includes(text[0].name)
      ? true
      : false;
  let parsedText
    = startsWithWord
      ? `<sup>${verse}</sup>`
      : "";
  text.forEach((element, index) => {
    if (element.name == "pb") {
      parsedText += "<br />\n";
    } else if (element.name == "J") {
      if (element.position == "start") {
        parsedText += '<div class="j">';
      } else {
        parsedText += "</div>\n";
      }
    } else if (element.name == "t") {
      if (element.position == "start") {
        parsedText += '<span class="t">';
      } else {
        parsedText += "</span>\n";
      }
    } else if (element.name == "e") {
      if (element.position == "start") {
        parsedText += '<strong class="e">';
      } else {
        parsedText += "</strong>\n";
      }
    } else if (element.name == "word") {
      parsedText += " " + element.data;
    } else if (element.name == "punctuation") {
      parsedText += element.data + " ";
    } else if (element.name == "dash") {
      parsedText += " - ";
    } else if (element.name == "longdash") {
      parsedText += " " + element.data + " ";
    }
    if (!startsWithWord && index == 0)
      parsedText += `<sup>${verse}</sup>`;
  });
  return parsedText;
}

function createAndSaveXhtml(book, chapterNumber,
  verses, chapterStrings) {
  const h1 = chapterNumber == 1
    ? book.long_name
    : '';
  const chapterString = book.book_number == 230
    ? chapterStrings[1].value
    : chapterStrings[0].value;
  const h2 = `${book.short_name} ${chapterString} ${chapterNumber}`;

  let mainContent = "";

  verses.forEach(({ verse, text }) => {
    mainContent += parseText(JSON.parse(text), verse);
  });
  //if (book.book_number == 470 && chapterNumber == 1)
  //  console.log( mainContent);
  const xhtml
    = `<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <link href="../styles/style.css" rel="stylesheet" type="text/css"/>
    <title>
      ${book.long_name} ${chapterString} ${chapterNumber}
    </title>
  </head>
  <body>
    ${h1 ? "<h1>" + h1 + "</h1>" : ''}
    <h2>${h2}</h2>
    <div>
      ${mainContent}
    </div>
  </body>
</html>
`;
  //console.log(xhtml);
  try {
    writeFileSync(sprintf('./output/%s/%03d_%03d.xhtml',
      databaseName,
      book.book_number,
      chapterNumber),
      xhtml);
  } catch (err) {
    console.error(err);
  }
}

async function main() {
  const getBooksSQL = "SELECT * FROM books";
  const getChaptersSQL
    = `SELECT DISTINCT chapter FROM verses
WHERE book_number = ? AND verse = 1`;
  const getVersesSQL
    = `SELECT DISTINCT verse, text FROM verses
WHERE book_number = ? AND chapter = ?`;
  const getChapterStringsSQL
    = `SELECT name, value FROM info
WHERE name IN ('chapter_string', 'chapter_string_ps')
ORDER BY name ASC`;

  const chapterStrings = await getRecords(
    getChapterStringsSQL);

  if (!existsSync(`./output/${databaseName}`))
    mkdirSync(`./output/${databaseName}`);


  const books = await getRecords(getBooksSQL);
  books.forEach(async book => {
    //console.log(sprintf("book: %04d", book.book_number ));
    //console.log(book);
    const chapters = await getRecords(
      getChaptersSQL,
      [book.book_number]);
    //if (book.book_number == 470)
    //  console.log(chapters);
    chapters.forEach(async chapter => {
      // console.log(
      // `${book.book_number} ${chapter.chapter}`);
      const verses = await getRecords(
        getVersesSQL,
        [book.book_number, chapter.chapter]);
      createAndSaveXhtml(book, chapter.chapter,
        verses, chapterStrings);
    });
  });
}

main().catch(err => console.error(err));
