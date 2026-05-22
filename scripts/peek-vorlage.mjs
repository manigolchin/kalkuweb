import XLSX from 'xlsx';
const wb = XLSX.readFile('/Users/admin/Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx');
const ws = wb.Sheets['Kalkulation'];

// Just show what's in specific cells of the canonical positions: rows 13–22
const cols = ['A','B','C','D','E','F','G','H','I','J','K','L','M'];
console.log('CELL-BY-CELL (key rows):');
for (const r of [2,3,4,5,6,7,8,9,10,11,12,13,15,16,17,18]) {
  const row = [];
  for (const c of cols) {
    const cell = ws[c+r];
    if (cell !== undefined) row.push(`${c}=${typeof cell.v==='string'?cell.v.slice(0,25):cell.v}`);
  }
  if (row.length) console.log(`r${r}:`, row.join(' | '));
}

// Check for merged cells
console.log('\nMERGES:', (ws['!merges'] || []).slice(0, 10));

// Check column widths
console.log('\nCOL WIDTHS:', (ws['!cols'] || []).slice(0, 15).map((c, i) => `${cols[i]}:${c?.wpx ?? c?.wch ?? '-'}`).join(', '));
