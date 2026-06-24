const fs = require('fs');
const path = require('path');

// Create directories
const dirs = [
  'c:\\Project\\ui_web_rnd\\src\\app\\api\\notifications',
  'c:\\Project\\ui_web_rnd\\src\\app\\api\\notifications\\[id]',
  'c:\\Project\\ui_web_rnd\\src\\app\\api\\notifications\\[id]\\read',
  'c:\\Project\\ui_ambil_sampel\\src\\app\\api\\notifications',
  'c:\\Project\\ui_ambil_sampel\\src\\app\\api\\notifications\\[id]',
  'c:\\Project\\ui_ambil_sampel\\src\\app\\api\\notifications\\[id]\\read',
];

dirs.forEach(dir => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  } catch (error) {
    console.error(`❌ Error creating ${dir}:`, error.message);
  }
});
