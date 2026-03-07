import fs from 'fs';
const path = 'c:/Users/Administrator/Desktop/Jogo/eternalidle/client/src/components/GuildPanel.jsx';
let content = fs.readFileSync(path, 'utf8');

const modalStateInject = `    const [showDonateModal, setShowDonateModal] = useState(false);`;
if (!content.includes('showDonateModal')) {
    content = content.replace("const [donationPending, setDonationPending] = useState(false);", "const [donationPending, setDonationPending] = useState(false);\n" + modalStateInject);
}

const bankStartTag = "{selectedBuilding === 'BANK' && (";
const bankEndTag = "{/* Tasks placeholder */"; // or something, let's search for "selectedBuilding === 'TASKS' && (" or similar

const reqTasksTab = "{activeTab === 'TASKS' && (";
const endBankBuilding = content.indexOf(reqTasksTab);
if (endBankBuilding === -1) {
    console.log("Could not find end of buildings block");
}

let bankStartIdx = content.indexOf(bankStartTag);
// find the last closing div of BANK before TASKS logic
// wait, the buildings are inside activeTab === 'HOME'
const activeTabHomeEndIdx = content.indexOf("{activeTab === 'MEMBERS' && (");

const newBankBlock = `
                            {selectedBuilding === 'BANK' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Bank Balances Card */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 100%)',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        padding: isMobile ? '15px' : '20px',
                                        position: 'relative'
                                    }}>
                                        {/* Donate Button at Top Left */}
                                        <div style={{ position: 'absolute', top: isMobile ? '-10px' : '-15px', left: isMobile ? '15px' : '20px', zIndex: 2 }}>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setShowDonateModal(true)}
                                                style={{
                                                    background: 'var(--accent)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    borderRadius: '8px',
                                                    padding: '6px 12px',
                                                    color: '#000',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    boxShadow: '0 4px 10px rgba(212, 175, 55, 0.3)'
                                                }}
                                            >
                                                <PackagePlus size={14} color="#000" />
                                                DONATE
                                            </motion.button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '15px' : '20px', gap: '10px', marginTop: '10px' }}>
                                            <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Landmark size={isMobile ? 20 : 24} /> GUILD BANK
                                            </h3>
                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                <div style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Coins size={isMobile ? 16 : 18} color="#ffd700" />
                                                    {formatSilver(guild.bank_silver || 0)}
                                                </div>
                                                <div style={{ color: 'var(--accent)', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <ClipboardList size={isMobile ? 16 : 18} color="var(--accent)" />
                                                    {(guild.guild_points || 0).toLocaleString()} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>GP</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Item Balances Grid */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(130px, 1fr))',
                                            gap: isMobile ? '8px' : '10px',
                                            maxHeight: isMobile ? '300px' : '300px',
                                            overflowY: 'auto',
                                            paddingRight: '5px'
                                        }}>
                                            {Object.entries(guild.bank_items || {}).length > 0 ? (
                                                Object.entries(guild.bank_items).sort().map(([itemId, amount]) => (
                                                    <div key={itemId} style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        padding: isMobile ? '8px' : '10px',
                                                        borderRadius: '12px',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: isMobile ? '6px' : '10px'
                                                    }}>
                                                        <div style={{ width: isMobile ? '18px' : '24px', height: isMobile ? '18px' : '24px' }}>
                                                            <img src={\`/items/\${itemId.split('::')[0]}.webp\`} alt={itemId} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ color: '#fff', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 'bold' }}>{amount.toLocaleString()}</div>
                                                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemId.replace(/_/g, ' ')}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                    The bank is empty.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
`;

let contentPrefix = content.substring(0, bankStartIdx);

let bankEndIdx = content.indexOf("{activeTab === 'TASKS' && (", bankStartIdx);
if (bankEndIdx !== -1) {
    // We need to just go back slightly before {activeTab === 'TASKS' && (
    // Actually {selectedBuilding === 'BANK'} is closed with `)}` and then `</div>`
    let possibleEnd = content.indexOf("</div>", content.lastIndexOf(")}", bankEndIdx - 10)) + 6;
    let contentSuffix = content.substring(content.lastIndexOf(")}", bankEndIdx) - 1); // wait

    // Let's just find "activeTab === 'TASKS'" and use that as anchor to replace the entire END of the HOME tab.
    // In GuildPanel.jsx, HOME tab ends at line 1699: </div> )}
    // Then TASKS starts.
    bankEndIdx = content.lastIndexOf("</div>", content.indexOf("{activeTab === 'TASKS' && (")) - 10;
}

const donateModalCode = `
            {/* Donation Modal */}
            <AnimatePresence>
                {showDonateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowDonateModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(5px)',
                            zIndex: 1000,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: '#111',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '20px',
                                width: '100%',
                                maxWidth: '500px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                maxHeight: '90vh'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PackagePlus size={20} /> MAKE A DONATION
                                </h3>
                                <button
                                    onClick={() => setShowDonateModal(false)}
                                    style={{
                                        background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
                                        padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {/* Silver Donation */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 'bold' }}>SILVER DONATION</div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <input
                                                type="number"
                                                placeholder="Amount of silver..."
                                                value={donationSilver}
                                                onChange={(e) => setDonationSilver(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 12px 12px 40px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    color: '#fff',
                                                    fontSize: '0.85rem',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            <Coins size={16} color="#ffd700" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setDonationSilver(gameState?.state?.silver?.toString() || '0')}
                                            style={{
                                                padding: '0 12px',
                                                background: 'rgba(212, 175, 55, 0.1)',
                                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                                borderRadius: '10px',
                                                color: 'var(--accent)',
                                                fontSize: '0.65rem',
                                                fontWeight: '900',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            MAX
                                        </motion.button>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={donationPending || !donationSilver || parseInt(donationSilver) <= 0}
                                        onClick={() => {
                                            const amount = parseInt(donationSilver);
                                            if (isNaN(amount) || amount <= 0) return;
                                            setDonationPending(true);
                                            socket?.emit('donate_to_guild_bank', { silver: amount });
                                            setDonationSilver('');
                                            setTimeout(() => setDonationPending(false), 1000);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            border: '1px solid rgba(212, 175, 55, 0.3)',
                                            borderRadius: '12px',
                                            color: 'var(--accent)',
                                            fontWeight: 'bold',
                                            fontSize: '0.75rem',
                                            cursor: donationPending ? 'not-allowed' : 'pointer',
                                            opacity: (!donationSilver || parseInt(donationSilver) <= 0) ? 0.3 : 1
                                        }}
                                    >
                                        DONATE SILVER
                                    </motion.button>
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '5px 0' }} />

                                {/* Item Donation */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 'bold' }}>ITEM DONATION</div>
                                    
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                        gap: '8px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        padding: '5px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        {Object.entries(gameState?.state?.inventory || {})
                                            .filter(([key, val]) => {
                                                const amount = typeof val === 'object' ? (val.amount || 0) : val;
                                                const isRunic = key.includes('_RUNE_') || key.includes('_SHARD');
                                                return amount > 0 && !isRunic && (key.includes('_WOOD') || key.includes('_ORE') || key.includes('_HIDE') || key.includes('_FIBER') || key.includes('_FISH') || key.includes('_HERB'));
                                            })
                                            .map(([id, val]) => {
                                                const amount = typeof val === 'object' ? val.amount : val;
                                                const isSelected = selectedDonationItem?.id === id;
                                                return (
                                                    <div 
                                                        key={id}
                                                        onClick={() => setSelectedDonationItem({ id, max: amount })}
                                                        style={{
                                                            background: isSelected ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.03)',
                                                            padding: '8px',
                                                            borderRadius: '10px',
                                                            border: \`1px solid \${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}\`,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <div style={{ width: '20px', height: '20px' }}>
                                                            <img src={\`/items/\${id}.webp\`} alt={id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>{amount.toLocaleString()}</div>
                                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{id.replace(/_/g, ' ')}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        }
                                        {Object.entries(gameState?.state?.inventory || {}).filter(([key, val]) => {
                                                const amount = typeof val === 'object' ? (val.amount || 0) : val;
                                                const isRunic = key.includes('_RUNE_') || key.includes('_SHARD');
                                                return amount > 0 && !isRunic && (key.includes('_WOOD') || key.includes('_ORE') || key.includes('_HIDE') || key.includes('_FIBER') || key.includes('_FISH') || key.includes('_HERB'));
                                        }).length === 0 && (
                                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', padding: '20px', gridColumn: '1/-1' }}>
                                                No donatable items in inventory.
                                            </div>
                                        )}
                                    </div>

                                    {selectedDonationItem && (
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <input
                                                    type="number"
                                                    placeholder="Amount to donate..."
                                                    value={donationItemAmount}
                                                    onChange={(e) => setDonationItemAmount(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '12px',
                                                        color: '#fff',
                                                        fontSize: '0.85rem',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setDonationItemAmount(selectedDonationItem.max.toString())}
                                                style={{
                                                    padding: '0 12px',
                                                    background: 'rgba(212, 175, 55, 0.1)',
                                                    border: '1px solid rgba(212, 175, 55, 0.3)',
                                                    borderRadius: '10px',
                                                    color: 'var(--accent)',
                                                    fontSize: '0.65rem',
                                                    fontWeight: '900',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                MAX
                                            </motion.button>
                                        </div>
                                    )}

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={donationPending || !selectedDonationItem || !donationItemAmount || parseInt(donationItemAmount) <= 0}
                                        onClick={() => {
                                            const amount = parseInt(donationItemAmount);
                                            if (isNaN(amount) || amount <= 0 || !selectedDonationItem) return;
                                            if (amount > selectedDonationItem.max) return;

                                            setDonationPending(true);
                                            socket?.emit('donate_to_guild_bank', {
                                                items: { [selectedDonationItem.id]: amount }
                                            });
                                            setDonationItemAmount('');
                                            setSelectedDonationItem(null);
                                            setTimeout(() => setDonationPending(false), 1000);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'var(--accent)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            color: '#000',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            cursor: donationPending ? 'not-allowed' : 'pointer',
                                            opacity: (!selectedDonationItem || !donationItemAmount || parseInt(donationItemAmount) <= 0) ? 0.3 : 1
                                        }}
                                    >
                                        DONATE SELECTED ITEM
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
`;

let postBankIdx = content.indexOf("{activeTab === 'TASKS' && (", bankStartIdx);
let postBankContent = content.substring(postBankIdx - 30); // Need to make sure I don't lose the ending divs
// Let's accurately substitute by regex or string replacing.

const fsScript = `
import fs from 'fs';
let code = fs.readFileSync('${path}', 'utf8');

if (!code.includes('showDonateModal')) {
    code = code.replace("const [donationPending, setDonationPending] = useState(false);", "const [donationPending, setDonationPending] = useState(false);\\n    const [showDonateModal, setShowDonateModal] = useState(false);");
}

let bankStart = code.indexOf("{selectedBuilding === 'BANK' && (");
let bankEndMatches = [...code.matchAll(/\\{activeTab === 'TASKS' && \\(/g)];
let bankEnd = bankEndMatches[0].index;
let subText = code.substring(bankStart, bankEnd);
let lastDivClose = subText.lastIndexOf("</div>");
let sliceEnd = bankStart + subText.lastIndexOf(")}", lastDivClose); 
// this slices off exactly at the )\} block of the {activeTab === 'HOME' && (...)}
// wait, the enclosing block is for activeTab === 'HOME'
let replacement = ${JSON.stringify(newBankBlock)};
let modalCode = ${JSON.stringify(donateModalCode)};

// Inject Donate Modal at the end of the return
code = code.substring(0, bankStart) + replacement + code.substring(sliceEnd);
code = code.replace("</AnimatePresence>\\n        </div>\\n    );\\n};", "</AnimatePresence>\\n" + modalCode + "\\n        </div>\\n    );\\n};");

// Also add PackagePlus to lucide-react import
if (!code.includes("PackagePlus")) {
    code = code.replace("ClipboardList", "ClipboardList, PackagePlus");
}

fs.writeFileSync('${path}', code);
`;

fs.writeFileSync('modify.js', fsScript);
