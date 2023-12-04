'use strict';
const parseStrong = (text, verse, cognateStrongNumbers, strongs) => {
  let textArray = text;
  const firstWordIndex = text.findIndex(({ name }) =>
    ['word', 'dash', 'longdash'].includes(name)
  );

  if (firstWordIndex !== -1) {
    textArray[firstWordIndex].verse = verse;
  }

  let parsedText = '';
  textArray.forEach((element) => {
    if (element.name == 'pb') {
      parsedText += '<br />\n';
    } else if (element.name == 'J') {
      if (element.position == 'start') {
        parsedText += '<div class="j">';
      } else {
        parsedText += '</div>\n';
      }
    } else if (element.name == 't') {
      if (element.position == 'start') {
        parsedText += '<span class="t">';
      } else {
        parsedText += '</span>\n';
      }
    } else if (element.name == 'e') {
      if (element.position == 'start') {
        parsedText += '<strong class="e">';
      } else {
        parsedText += '</strong>\n';
      }
    } else if (element.name == 'word') {
      const strongNumber = element.S ? `G${element.S}` : '';

      const studyPageNumber = strongNumber
        ? strongs.find((s) => s.topic === strongNumber)?.page_number ?? ''
        : '';

      if (element.verse) {
        parsedText += `<sup id="v${verse}">` + verse + '</sup>';
      }

      parsedText += strongNumber
        ? ` <a class="noteref" epub:type="noteref" role="doc-noteref" href="study${studyPageNumber}.xhtml#f${strongNumber}">${element.data}</a>`
        : ` <span>${element.data}</span>`;
    } else if (element.name == 'punctuation') {
      parsedText += element.data + ' ';
    } else if (element.name == 'dash') {
      parsedText += ' - ';
    } else if (element.name == 'longdash') {
      parsedText += ` ${element.name} `;
    }
  });
  return parsedText;
};

export default parseStrong;
