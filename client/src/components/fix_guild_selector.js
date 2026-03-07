import fs from 'fs';
let content = fs.readFileSync('GuildPanel.jsx', 'utf8');

// The block we want to replace starts with the "SELECT BUILDING" label container.
const selectLabel = "<div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.5px' }}>SELECT BUILDING</div>";
const blockStart = content.indexOf(selectLabel);
if (blockStart === -1) {
    console.log("Could not find select label");
    process.exit(1);
}

// The block ends before {selectedBuilding === 'GUILD_HALL' && (
const blockEnd = content.indexOf("{selectedBuilding === 'GUILD_HALL' && (");
if (blockEnd === -1) {
    console.log("Could not find sections start");
    process.exit(1);
}

const cleanBlock = `                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.5px' }}>SELECT BUILDING</div>
                                <div
                                    onClick={() => setShowBuildingDropdown(!showBuildingDropdown)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {selectedBuilding === 'GUILD_HALL' ? (
                                            <Building2 size={18} color="var(--accent)" />
                                        ) : selectedBuilding === 'GATHERING' ? (
                                            <Pickaxe size={18} color="var(--accent)" />
                                        ) : selectedBuilding === 'REFINING' ? (
                                            <FlaskConical size={18} color="var(--accent)" />
                                        ) : selectedBuilding === 'CRAFTING' ? (
                                            <Hammer size={18} color="var(--accent)" />
                                        ) : (
                                            <Landmark size={18} color="var(--accent)" />
                                        )}
                                        <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {selectedBuilding === 'GUILD_HALL' ? 'Guild Hall' : 
                                             selectedBuilding === 'GATHERING' ? 'Gathering Station' : 
                                             selectedBuilding === 'REFINING' ? 'Refining Station' : 
                                             selectedBuilding === 'CRAFTING' ? 'Crafting Station' : 
                                             'Bank'}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} color="rgba(255,255,255,0.3)" style={{ transform: showBuildingDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                                </div>

                                <AnimatePresence>
                                    {showBuildingDropdown && (
                                        <>
                                            <div
                                                onClick={() => setShowBuildingDropdown(false)}
                                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                style={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 8px)',
                                                    left: 0,
                                                    right: 0,
                                                    background: '#1a1a1a',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    zIndex: 101,
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                                }}
                                            >
                                                {[
                                                    { id: 'BANK', name: 'Bank', icon: Landmark },
                                                    { id: 'GUILD_HALL', name: 'Guild Hall', icon: Building2 },
                                                    { id: 'GATHERING', name: 'Gathering Station', icon: Pickaxe },
                                                    { id: 'REFINING', name: 'Refining Station', icon: FlaskConical },
                                                    { id: 'CRAFTING', name: 'Crafting Station', icon: Hammer }
                                                ].map(b => (
                                                    <div
                                                        key={b.id}
                                                        onClick={() => {
                                                            setSelectedBuilding(b.id);
                                                            setShowBuildingDropdown(false);
                                                        }}
                                                        style={{
                                                            padding: '12px 16px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            cursor: 'pointer',
                                                            background: selectedBuilding === b.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                                                            transition: 'background 0.2s ease'
                                                        }}
                                                    >
                                                        <b.icon size={16} color={selectedBuilding === b.id ? 'var(--accent)' : 'rgba(255,255,255,0.4)'} />
                                                        <span style={{ color: selectedBuilding === b.id ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: selectedBuilding === b.id ? 'bold' : 'normal' }}>
                                                            {b.name}
                                                        </span>
                                                        {selectedBuilding === b.id && <Check size={14} color="var(--accent)" style={{ marginLeft: 'auto' }} />}
                                                    </div>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                            `;

const newContent = content.substring(0, blockStart) + cleanBlock + content.substring(blockEnd);
fs.writeFileSync('GuildPanel.jsx', newContent);
console.log("GuildPanel.jsx header fixed and cleaned.");
