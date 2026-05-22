// Extract a small fixture from LV3_BH (real positions + groups, well-shaped)
import XLSX from 'xlsx';
const wb = XLSX.readFile('/Users/admin/Desktop/Claude/example 1/LV3_BH_mit_Preisen.xlsx', { cellFormula: true });
const ws = wb.Sheets['Kalkulation'];

function getRow(r) {
  const cells = {};
  for (const c of ['A','B','C','D','E','F','I','J','K','L','M']) {
    const ref = c + r;
    const cell = ws[ref];
    if (cell !== undefined) cells[c] = cell.v;
  }
  return cells;
}

// Extract canonical rows: 15-32 (KG 442 group + ~12 positions covers a real KG)
const out = [];
for (let r = 15; r <= 32; r++) {
  const row = getRow(r);
  if (Object.keys(row).length === 0) continue;
  out.push({ row: r, ...row });
}
console.log(JSON.stringify(out, null, 2));
