const fs = require('fs');
const path = require('path');

const targetPath = 'C:/Users/Cliente/Desktop/projetinho/Game/client/src/components/MarketPanel.jsx';
let content = fs.readFileSync(targetPath, 'utf8');

const newImports = fs.readFileSync('C:/Users/Cliente/Desktop/projetinho/Game/client/newImports.txt', 'utf8');
const newComponentStart = fs.readFileSync('C:/Users/Cliente/Desktop/projetinho/Game/client/newComponentStart.txt', 'utf8');
const newJSXStart = fs.readFileSync('C:/Users/Cliente/Desktop/projetinho/Game/client/newJSXStart.txt', 'utf8');

// The `newImports` replaces from the top imports down to `const QUALITIES =`
const startImportToken = "import React, { useState, useEffect } from 'react';";
const endImportToken = "const QUALITIES =";
const importStartIdx = content.indexOf(startImportToken);
const importEndIdx = content.indexOf(endImportToken);

if (importStartIdx !== -1 && importEndIdx !== -1) {
    content = content.substring(0, importStartIdx) + newImports + "\n" + content.substring(importEndIdx);
} else {
    console.log("Could not find imports block");
}

// Extract from `const MarketPanel = ` down to `{/* NOTIFICATIONS */}`
const startToken = "const MarketPanel = ({ socket, gameState";
const endToken = "{/* NOTIFICATIONS */}";
const startIdx = content.indexOf(startToken);
const endIdx = content.indexOf(endToken);

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + newComponentStart + "\n\n" + newJSXStart + "\n\n                " + content.substring(endIdx);
} else {
    console.log("Could not find main component block");
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully refactored MarketPanel.jsx');
