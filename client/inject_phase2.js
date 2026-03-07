const fs = require('fs');
const content = fs.readFileSync('src/components/GuildPanel.jsx', 'utf8');

const startMarker = "{selectedBuilding === 'GUILD_HALL' && (";
const endMarker = "{selectedBuilding === 'BANK' && (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found');
    process.exit(1);
}

const hallBlock = fs.readFileSync('hall.txt', 'utf8');
const stationsBlock = "\n" + fs.readFileSync('stations.txt', 'utf8');

let newContent = content.slice(0, startIndex) + hallBlock + stationsBlock + content.slice(endIndex);

// Also add the Donate button to the Bank header
const bankMarker = "GUILD BANK";
const bankHeaderIndex = newContent.indexOf(bankMarker);
if (bankHeaderIndex !== -1) {
    const divStartIndex = newContent.lastIndexOf('<div', bankHeaderIndex);
    // Find where the first child div of the header ends to insert the button
    const headerTitleEndIndex = newContent.indexOf('</h3>', bankHeaderIndex) + 5;
    const buttonHtml = `
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setShowDonateModal(true)}
                                                style={{
                                                    background: 'var(--accent)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '6px 12px',
                                                    color: '#000',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <PackagePlus size={14} /> DONATE
                                            </motion.button>`;
    
    // Check if button already exists
    if (!newContent.includes('setShowDonateModal(true)')) {
        newContent = newContent.slice(0, headerTitleEndIndex) + buttonHtml + newContent.slice(headerTitleEndIndex);
    }
}

fs.writeFileSync('src/components/GuildPanel.jsx', newContent);
console.log('Phase 2 Injected successfully');
