const stdout = `
?? 18835 ?????? ? 2138 ?????????
2 ????? ? 18833 ?? ?????.
1 223 562 410 ???? ?????? ???????? ? 1 223 562 410 ??????.
??????? ?????? 1.0 ? 1.
`;

const lines = stdout.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
if (lines.length >= 4) {
  const ratioLine = lines[lines.length - 1];
  const bytesLine = lines[lines.length - 2];
  const compressedLine = lines[lines.length - 3];
  const filesLine = lines[lines.length - 4];

  const extractNumbers = (str) => str.match(/\d+(?:[.,\s]\d+)*/g)?.map(n => parseInt(n.replace(/\D/g, ''), 10)) || [];
  const bytesNums = extractNumbers(bytesLine);
  const compNums = extractNumbers(compressedLine);
  const filesNums = extractNumbers(filesLine);

  console.log('Bytes:', bytesNums);
  console.log('Comp:', compNums);
  console.log('Files:', filesNums);
  
  if (bytesNums.length >= 2) {
    const ratioMatch = ratioLine.match(/(\d+[.,]\d+)/);
    const parsedRatio = ratioMatch ? parseFloat(ratioMatch[1].replace(',', '.')) : 1.0;
    console.log('Ratio:', parsedRatio);
  }
}
