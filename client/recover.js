const fs = require('fs');
const path = require('path');

const historyDir = 'C:\\Users\\Administrator\\AppData\\Roaming\\Code\\User\\History';
const targetString = 'gpCost'; // Uniquely identifies the recent GP changes

function findRecentFile(dir) {
    let recentFile = null;
    let recentTime = 0;

    const traverse = (currentDir) => {
        try {
            const files = fs.readdirSync(currentDir);
            for (const file of files) {
                const fullPath = path.join(currentDir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    traverse(fullPath);
                } else {
                    if (stat.mtimeMs > recentTime) {
                        try {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            if (content.includes(targetString) && content.includes('GuildPanel')) {
                                recentFile = fullPath;
                                recentTime = stat.mtimeMs;
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {}
    };

    traverse(historyDir);
    return recentFile;
}

const file = findRecentFile(historyDir);
if (file) {
    console.log('Found recent file: ' + file);
    fs.copyFileSync(file, 'C:\\Users\\Administrator\\Desktop\\Jogo\\eternalidle\\client\\src\\components\\GuildPanel.jsx');
    console.log('Restored GuildPanel.jsx successfully.');
} else {
    console.log('File not found in history.');
}
