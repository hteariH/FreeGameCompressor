const stdout = \
Of 18835 files within 2138 directories
2 are compressed and 18833 are not compressed.
1,223,562,410 total bytes of data are stored in 1,223,562,410 bytes.
The compression ratio is 1.0 to 1.
\;

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
