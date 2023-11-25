import sqlite3 from "sqlite3";
import {sprintf} from "sprintf-js";
import {mkdirSync, writeFileSync, existsSync} from "fs";

const databaseName = process.argv[2];
const secondaryDatabaseName = process.argv[3];
const databasePath = `./database/${databaseName}.SQLite3`;
const secondaryDatabasePath = `./database/${secondaryDatabaseName}.SQLite3`;

const db = new sqlite3.Database(databasePath);
const secondaryDb = new sqlite3.Database(
  secondaryDatabasePath
);

function getRecords(database, sql, variables = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, variables, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function createAndSaveXhtml(
  book,
  chapterNumber,
  verses,
  chapterStrings,
  tooltipVerses
) {
  const h1 = chapterNumber == 1 ? book.long_name : "";
  const chapterString =
    book.book_number == 230
      ? chapterStrings[1].value
      : chapterStrings[0].value;
  const h2 = `${book.short_name} ${chapterString} ${chapterNumber}`;

  const mainContent = verses.reduce(
    (total, {verse, text}, index) => {
      return (
        total + `
<tr>
  <td>${verse}. ${text}</td>
  <td>${tooltipVerses[index]?.text || ""}</td>
</tr>`);
    },
    ""
  );

  const xhtml = `<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <link href="../styles/style.css" rel="stylesheet" type="text/css"/>
    <title>
      ${book.long_name} ${chapterString} ${chapterNumber}
    </title>
  </head>
  <body>
    ${h1 ? "<h1>" + h1 + "</h1>" : ""}
    <h2>${h2}</h2>
    <table>
    <tr>
      <th>${databaseName}</th>
      <th>${secondaryDatabaseName}</th>
    </tr>
      ${mainContent}
    </table>
  </body>
</html>
`;
  try {
    writeFileSync(
      sprintf(
        "../output/%s/%03d_%03d.xhtml",
        `${databaseName}+${secondaryDatabaseName}`,
        book.book_number,
        chapterNumber
      ),
      xhtml
    );
  } catch (err) {
    console.error(err);
  }
}

const getBooksSQL = "SELECT * FROM books";
const getChaptersSQL = `SELECT DISTINCT chapter FROM verses
WHERE book_number = ? AND verse = 1`;
const getVersesSQL = `SELECT DISTINCT verse, text FROM verses
WHERE book_number = ? AND chapter = ?`;
const getChapterStringsSQL = `SELECT name, value FROM info
WHERE name IN ('chapter_string', 'chapter_string_ps')
ORDER BY name ASC`;

const chapterStrings = await getRecords(
  db,
  getChapterStringsSQL
);

if (
  !existsSync(
    `../output/${databaseName}+${secondaryDatabaseName}`
  )
)
  mkdirSync(
    `../output/${databaseName}+${secondaryDatabaseName}`
  );

const books = await getRecords(db, getBooksSQL);
books.forEach(async (book) => {
  const chapters = await getRecords(db, getChaptersSQL, [
    book.book_number,
  ]);
  chapters.forEach(async (chapter) => {
    const verses = await getRecords(db, getVersesSQL, [
      book.book_number,
      chapter.chapter,
    ]);
    const tooltipVerses = await getRecords(
      secondaryDb,
      getVersesSQL,
      [book.book_number, chapter.chapter]
    );
    createAndSaveXhtml(
      book,
      chapter.chapter,
      verses,
      chapterStrings,
      tooltipVerses
    );
  });
});
