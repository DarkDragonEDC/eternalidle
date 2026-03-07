import fs from 'fs';
let content = fs.readFileSync('GuildPanel.jsx', 'utf8');

// 1. Identify the building selector start
const selectorStart = content.indexOf("<div style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>");
// If there are multiple, we need to find the one inside the Guild Panel selection area.
// Actually, let's look for the labels.

const gatheringMatch = content.indexOf("selectedBuilding === 'GATHERING' ? 'Gathering Station'");
if (gatheringMatch === -1) {
    console.log("Could not find selector labels");
    process.exit(1);
}

// We want to reconstruct from the start of the "header" component down to the start of the building sections.
// Building sections start with {selectedBuilding === 'GUILD_HALL' && (

const sectionsStart = content.indexOf("{selectedBuilding === 'GUILD_HALL' && (");

const cleanHeader = `                                <div 
                                    onClick={() => setShowBuildingDropdown(!showBuildingDropdown)}
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '15px',
                                        padding: '10px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: 'var(--accent)22', padding: '8px', borderRadius: '10px' }}>
                                            {selectedBuilding === 'BANK' ? <Landmark size={20} color="var(--accent)" /> :
                                             selectedBuilding === 'GUILD_HALL' ? <Building2 size={20} color="var(--accent)" /> :
                                             selectedBuilding === 'GATHERING' ? <Pickaxe size={20} color="var(--accent)" /> :
                                             selectedBuilding === 'REFINING' ? <FlaskConical size={20} color="var(--accent)" /> :
                                             selectedBuilding === 'CRAFTING' ? <Hammer size={20} color="var(--accent)" /> :
                                             <Landmark size={20} color="var(--accent)" />}
                                        </div>
                                        <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
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
`;

// Identify the start of the dropdown component (the first place where it's defined in the panel)
const panelAreaStart = content.indexOf("<div style={{ position: 'relative' }}>"); // This is usually where the building selector is.
if (panelAreaStart === -1) {
    console.log("Could not find panel selection area");
    process.exit(1);
}

// We want to replace everything between the panelAreaStart's first child div (the header) 
// and the sectionsStart.

// This is tricky because the automated edits broke it into multiple pieces.
// I'll try to find the very first instance of "selectedBuilding === 'BANK'" labels 
// and the very last instance of "setShowBuildingDropdown(false)" before sectionsStart.

const firstLabel = content.indexOf("selectedBuilding === 'BANK' ? <Landmark");
const lastDropdownClose = content.lastIndexOf("setShowBuildingDropdown(false);", sectionsStart);

if (firstLabel === -1 || lastDropdownClose === -1) {
    console.log("Could not find boundaries");
    process.exit(1);
}

// Re-evaluate: I'll just look for the containing relative div.
const headerBlockStart = content.lastIndexOf("<div", firstLabel);
// Find the end of the AnimatePresence block that contains the dropdown.
const dropdownBlockEnd = content.indexOf("</AnimatePresence>", lastDropdownClose) + "</AnimatePresence>".length;

const newContent = content.substring(0, headerBlockStart) + cleanHeader + content.substring(dropdownBlockEnd);
fs.writeFileSync('GuildPanel.jsx', newContent);
console.log("GuildPanel.jsx header fixed.");
