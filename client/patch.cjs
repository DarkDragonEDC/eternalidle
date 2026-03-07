const fs = require('fs');

const targetFile = 'c:\\Users\\Administrator\\Desktop\\Jogo\\eternalidle\\client\\src\\components\\GuildPanel.jsx';
const hallFile = 'c:\\Users\\Administrator\\Desktop\\Jogo\\eternalidle\\client\\hall.txt';
const stationsFile = 'c:\\Users\\Administrator\\Desktop\\Jogo\\eternalidle\\client\\stations.txt';

try {
    const content = fs.readFileSync(targetFile, 'utf8');
    const hallBlock = fs.readFileSync(hallFile, 'utf8');
    const stationsBlock = fs.readFileSync(stationsFile, 'utf8');

    const startMarker = "{selectedBuilding === 'GUILD_HALL' && (";
    const endMarker = "{selectedBuilding === 'BANK' && (";

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        console.error('Markers not found');
        console.log('startIndex:', startIndex);
        console.log('endIndex:', endIndex);
        process.exit(1);
    }

    const newContent = content.slice(0, startIndex) + hallBlock + '\n' + stationsBlock + '\n' + content.slice(endIndex);
    fs.writeFileSync(targetFile, newContent);
    console.log('Succesfully patched GuildPanel.jsx');
} catch (err) {
    console.error('Error during patching:', err);
    process.exit(1);
}
