import fs from 'fs';
let content = fs.readFileSync('GuildPanel.jsx', 'utf8');

const syncSearch = /<div style=\{\{ fontSize: '0\.6rem', color: isSyncBlocked \? '#ff4444' : 'rgba\(255,255,255,0\.3\)', fontWeight: 'bold', textTransform: 'uppercase' \}\}>\s*\{isSyncBlocked \? `SYNC REQ: ALL LVL \$\{currentLevel\}` : `Upgrade To Lv \$\{nextLevel\}`\}\s*<\/div>/g;

const syncReplacement = `{isSyncBlocked ? (
                                                                <div style={{ 
                                                                    background: 'rgba(255, 68, 68, 0.05)', 
                                                                    border: '1px solid rgba(255, 68, 68, 0.1)',
                                                                    borderRadius: '8px',
                                                                    padding: '8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    <Lock size={14} color="#ff4444" />
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontSize: '0.65rem', color: '#ff4444', fontWeight: 'bold', letterSpacing: '0.5px' }}>SYNC REQUIRED</span>
                                                                        <span style={{ fontSize: '0.55rem', color: 'rgba(255, 68, 68, 0.7)', fontWeight: 'medium' }}>All paths must reach Lv {currentLevel}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                                    Upgrade To Lv {nextLevel}
                                                                </div>
                                                            )}`;

const btnSearch = /\{isSyncBlocked \? 'READY ALL' : isMax \? 'MAXED' : `UPGRADE \(\+\$\{config\.bonusPerLevel\}\$\{config\.suffix\}\)`\}/g;
const btnReplacement = `{isMax ? 'MAX LEVEL' : isSyncBlocked ? 'LOCKED BY SYNC' : canUpgrade ? 'UPGRADE' : 'MISSING REQUIREMENTS'}`;

if (content.match(syncSearch)) {
    content = content.replace(syncSearch, syncReplacement);
    console.log("Sync requirement UI updated.");
} else {
    console.log("Could not find sync requirement UI.");
}

if (content.match(btnSearch)) {
    content = content.replace(btnSearch, btnReplacement);
    console.log("Button text updated.");
} else {
    console.log("Could not find button text.");
}

fs.writeFileSync('GuildPanel.jsx', content);
