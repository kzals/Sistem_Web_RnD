const XLSX = require('xlsx');

const wb = XLSX.readFile('external/List Produksi + Ket Rak (1).xlsx', { cellStyles: true });
const ws = wb.Sheets['Sumber'];

const summary = {
  rowsScanned: 0,
  designRows: 0,
  aMissing: 0,
  aNoStyle: 0,
  aTheme0: 0,
  aRgbWhite: 0,
  aSolidWhite: 0,
  aOtherColor: 0,
  aEmptyValue: 0,
};

const samples = {
  theme0: [],
  rgbWhite: [],
  solidWhite: [],
  otherColor: [],
  noStyle: [],
  emptyValue: [],
};

function pick(cell) {
  const s = cell?.s || {};
  const fg = s.fgColor || s.fill?.fgColor || {};
  const pattern = String(s.patternType || s.fill?.patternType || '').toLowerCase();
  const raw = fg.rgb ? String(fg.rgb).toUpperCase() : '';
  const rgb = raw.startsWith('FF') && raw.length === 8 ? raw.slice(2) : raw;

  return {
    v: cell?.v,
    hasStyle: Boolean(cell?.s),
    pattern,
    theme: fg.theme,
    tint: fg.tint,
    rgb,
    indexed: fg.indexed,
  };
}

for (let row = 6; row <= 7401; row++) {
  summary.rowsScanned++;
  const design = ws[`B${row}`];
  if (!design || design.v === undefined || String(design.v).trim() === '') {
    continue;
  }

  summary.designRows++;

  const a = ws[`A${row}`];
  if (!a) {
    summary.aMissing++;
    continue;
  }

  const info = pick(a);

  if (a.v === undefined || String(a.v).trim() === '') {
    summary.aEmptyValue++;
    if (samples.emptyValue.length < 6) samples.emptyValue.push({ row, ...info });
  }

  if (!info.hasStyle) {
    summary.aNoStyle++;
    if (samples.noStyle.length < 6) samples.noStyle.push({ row, ...info });
    continue;
  }

  const isTheme0 = info.theme === 0;
  const isRgbWhite = info.rgb === 'FFFFFF';
  const isSolidWhite = isRgbWhite && info.pattern === 'solid';

  if (isTheme0) {
    summary.aTheme0++;
    if (samples.theme0.length < 6) samples.theme0.push({ row, ...info });
  }
  if (isRgbWhite) {
    summary.aRgbWhite++;
    if (samples.rgbWhite.length < 6) samples.rgbWhite.push({ row, ...info });
  }
  if (isSolidWhite) {
    summary.aSolidWhite++;
    if (samples.solidWhite.length < 6) samples.solidWhite.push({ row, ...info });
  }
  if (!isTheme0 && !isRgbWhite) {
    summary.aOtherColor++;
    if (samples.otherColor.length < 12) samples.otherColor.push({ row, ...info });
  }
}

console.log('SUMMARY');
console.log(JSON.stringify(summary, null, 2));
console.log('\nSAMPLES');
console.log(JSON.stringify(samples, null, 2));
