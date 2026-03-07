const fs = require('fs');
try {
  const content = fs.readFileSync('build_err.txt', 'utf16le');
  fs.writeFileSync('build_err_utf8.txt', content, 'utf8');
} catch (e) {
  console.log(e);
}
