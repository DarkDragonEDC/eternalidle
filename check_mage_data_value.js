
import fs from 'fs';
let text = fs.readFileSync('mage_full_data.js', 'utf8');
// Remove the assignment to make it valid JSON
text = text.replace('export const MAGE_STATS_FIXED = ', '').trim();
if (text.endsWith(';')) text = text.slice(0, -1);

const MAGE_STATS_FIXED = JSON.parse(text);

const staff = MAGE_STATS_FIXED['Fire Staff'];
if (staff && staff[10] && staff[10][4]) {
    console.log('T10 Masterpiece Fire Staff Stats:', JSON.stringify(staff[10][4], null, 2));
} else {
    console.log('T10 Masterpiece Fire Staff NOT FOUND');
}
