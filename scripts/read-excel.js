const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('external/List Produksi + Ket Rak (1).xlsx');
  console.log('Sheet names:', workbook.SheetNames);
  
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});
  
  console.log('\n=== First 15 rows ===');
  data.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i}:`, row);
  });
  
  console.log('\n=== Total rows:', data.length);
  
  // Check cell styles/colors if available
  const range = XLSX.utils.decode_range(sheet['!ref']);
  console.log('\n=== Checking for cell styles in first few rows ===');
  for (let R = 0; R < Math.min(10, range.e.r); R++) {
    for (let C = 0; C < Math.min(5, range.e.c); C++) {
      const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
      const cell = sheet[cellAddress];
      if (cell && cell.s) {
        console.log(`Cell ${cellAddress}:`, cell.v, 'Style:', JSON.stringify(cell.s));
      }
    }
  }
  
} catch (error) {
  console.error('Error:', error.message);
}
