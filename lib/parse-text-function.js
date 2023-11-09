const parseText = (text, verse, tooltip) => {
  let parsedText = '';

  const startsWithWord = [
    'word',
    'dash',
    'longdash',
  ].includes(text[0].name);

  if (!startsWithWord) {
    parsedText += `<sup title="${tooltip}">${verse}</sup>`;
  }

  text.forEach((element, index) => {
    switch (element.name) {
      case 'pb':
        parsedText += '<br />\n';
        break;
      case 'J':
        if (element.position === 'start') {
          parsedText += '<div class="j">';
        } else {
          parsedText += '</div>\n';
        }
        break;
      case 't':
        if (element.position === 'start') {
          parsedText += '<span class="t">';
        } else {
          parsedText += '</span>\n';
        }
        break;
      case 'e':
        if (element.position === 'start') {
          parsedText += '<strong class="e">';
        } else {
          parsedText += '</strong>\n';
        }
        break;
      case 'word':
        parsedText += ' ' + element.data;
        break;
      case 'punctuation':
        parsedText += element.data + ' ';
        break;
      case 'dash':
        parsedText += ' - ';
        break;
      case 'longdash':
        parsedText += ' ' + element.data + ' ';
        break;
    }

    if (startsWithWord && index === 0) {
      parsedText =
        `<sup title="${tooltip}">${verse}</sup>` +
        parsedText;
    }
  });

  return parsedText;
};

export default parseText;
