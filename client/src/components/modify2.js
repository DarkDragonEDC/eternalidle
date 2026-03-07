import fs from 'fs';
const path = 'c:/Users/Administrator/Desktop/Jogo/eternalidle/client/src/components/GuildPanel.jsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('showDonateModal')) {
    code = code.replace("const [donationPending, setDonationPending] = useState(false);", 
        "const [donationPending, setDonationPending] = useState(false);\n    const [showDonateModal, setShowDonateModal] = useState(false);");
}

let bankStart = code.lastIndexOf("{/* Donation Section */}");
if (bankStart === -1) {
    console.log("Donation Section not found, perhaps already modified.");
}

// Find {selectedBuilding === 'BANK' && ( and {selectedBuilding === 'GUILD_HALL' && (
let selectedBankStart = code.indexOf("{selectedBuilding === 'BANK' && (");
let selectedHallStart = code.indexOf("{selectedBuilding === 'GUILD_HALL' && (");

if (selectedBankStart !== -1 && selectedHallStart !== -1) {
    let preBank = code.substring(0, selectedBankStart);
    let postBank = code.substring(selectedHallStart);
    
    // We recreate the entire selectedBuilding === 'BANK' block
    let newBankBlock = `                            {selectedBuilding === 'BANK' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Bank Balances Card */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 100%)',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        padding: isMobile ? '15px' : '20px',
                                        position: 'relative',
                                        overflow: 'visible'
                                    }}>
                                        {/* Donate Button at Top Left */}
                                        <div style={{ position: 'absolute', top: isMobile ? '-10px' : '-16px', left: isMobile ? '15px' : '20px', zIndex: 10 }}>
                                            <motion.button
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setShowDonateModal(true)}
                                                style={{
                                                    background: 'var(--accent)',
                                                    border: '2px solid rgba(255,255,255,0.2)',
                                                    borderRadius: '8px',
                                                    padding: '6px 16px',
                                                    color: '#000',
                                                    fontWeight: '900',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)'
                                                }}
                                            >
                                                <PackagePlus size={16} color="#000" />
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
                            
    code = preBank + newBankBlock + postBank;
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
                                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                                maxHeight: '90vh'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                                <h3 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PackagePlus size={24} /> 
                                    MAKE A DONATION
                                </h3>
                                <button
                                    onClick={() => setShowDonateModal(false)}
                                    style={{
                                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                                        padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '5px' }}>
                                {/* Silver Donation */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>SILVER DONATION</span>
                                        <span style={{ color: '#ffd700' }}>{formatSilver(gameState?.state?.silver || 0)} Available</span>
                                    </div>
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
                                                padding: '0 15px',
                                                background: 'rgba(212, 175, 55, 0.1)',
                                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                                borderRadius: '10px',
                                                color: 'var(--accent)',
                                                fontSize: '0.7rem',
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
                                        disabled={donationPending || !donationSilver || parseInt(donationSilver) <= 0 || parseInt(donationSilver) > (gameState?.state?.silver || 0)}
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
                                            background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.4) 100%)',
                                            border: '1px solid rgba(212, 175, 55, 0.5)',
                                            borderRadius: '12px',
                                            color: '#fff',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            cursor: (donationPending || !donationSilver || parseInt(donationSilver) <= 0 || parseInt(donationSilver) > (gameState?.state?.silver || 0)) ? 'not-allowed' : 'pointer',
                                            opacity: (!donationSilver || parseInt(donationSilver) <= 0 || parseInt(donationSilver) > (gameState?.state?.silver || 0)) ? 0.3 : 1
                                        }}
                                    >
                                        DONATE SILVER
                                    </motion.button>
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />

                                {/* Item Donation */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 'bold' }}>ITEM DONATION (RAW)</div>
                                    
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                                        gap: '10px',
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        padding: '5px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '12px',
                                        border: '1px inset rgba(255,255,255,0.05)'
                                    }}>
                                        {Object.entries(gameState?.state?.inventory || {})
                                            .filter(([key, val]) => {
                                                const amount = typeof val === 'object' ? (val.amount || 0) : val;
                                                const isRunic = key.includes('_RUNE_') || key.includes('_SHARD');
                                                // Check if it's a raw resource
                                                return amount > 0 && !isRunic && (key.includes('_WOOD') || key.includes('_ORE') || key.includes('_HIDE') || key.includes('_FIBER') || key.includes('_FISH') || key.includes('_HERB'));
                                            })
                                            .map(([id, val]) => {
                                                const amount = typeof val === 'object' ? val.amount : val;
                                                const isSelected = selectedDonationItem?.id === id;
                                                return (
                                                    <div 
                                                        key={id}
                                                        onClick={() => {
                                                            setSelectedDonationItem({ id, max: amount });
                                                            setDonationItemAmount(amount.toString());
                                                        }}
                                                        style={{
                                                            background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.03)',
                                                            padding: '10px',
                                                            borderRadius: '10px',
                                                            border: \`1px solid \${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}\`,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: isSelected ? 'inset 0 0 10px rgba(212, 175, 55, 0.2)' : 'none'
                                                        }}
                                                    >
                                                        <div style={{ width: '32px', height: '32px' }}>
                                                            <img src={\`/items/\${id}.webp\`} alt={id} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: isSelected ? 'drop-shadow(0 0 5px rgba(212, 175, 55, 0.5))' : 'none' }} />
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{amount.toLocaleString()}</div>
                                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>{id.replace(/_/g, ' ')}</div>
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
                                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textAlign: 'center', padding: '30px 20px', gridColumn: '1/-1' }}>
                                                No donatable items in inventory.
                                                <br/>
                                                <span style={{ fontSize: '0.6rem', fontStyle: 'italic', marginTop: '5px', display: 'block' }}>Only raw items can be donated.</span>
                                            </div>
                                        )}
                                    </div>

                                    {selectedDonationItem && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }} 
                                            animate={{ opacity: 1, height: 'auto' }} 
                                            style={{ display: 'flex', gap: '10px', marginTop: '5px' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0 10px', height: '42px' }}>
                                                 <img src={\`/items/\${selectedDonationItem.id}.webp\`} style={{ width: '20px', height: '20px' }} />
                                            </div>
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
                                                    padding: '0 15px',
                                                    background: 'rgba(212, 175, 55, 0.1)',
                                                    border: '1px solid rgba(212, 175, 55, 0.3)',
                                                    borderRadius: '10px',
                                                    color: 'var(--accent)',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '900',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                MAX
                                            </motion.button>
                                        </motion.div>
                                    )}

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={donationPending || !selectedDonationItem || !donationItemAmount || parseInt(donationItemAmount) <= 0 || parseInt(donationItemAmount) > selectedDonationItem.max}
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
                                            setTimeout(() => {
                                                setDonationPending(false);
                                                setShowDonateModal(false);
                                            }, 500);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'linear-gradient(90deg, var(--accent) 0%, #ffdf22 100%)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            color: '#000',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            cursor: (donationPending || !selectedDonationItem || !donationItemAmount || parseInt(donationItemAmount) <= 0 || parseInt(donationItemAmount) > selectedDonationItem.max) ? 'not-allowed' : 'pointer',
                                            opacity: (!selectedDonationItem || !donationItemAmount || parseInt(donationItemAmount) <= 0 || parseInt(donationItemAmount) > selectedDonationItem.max) ? 0.3 : 1
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

if (!code.includes("showDonateModal && (")) {
    let returnHtmlStart = code.lastIndexOf("</AnimatePresence>");
    code = code.substring(0, returnHtmlStart) + donateModalCode + code.substring(returnHtmlStart);
}

const lucideImportMatch = code.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/);
if (lucideImportMatch && !lucideImportMatch[1].includes("PackagePlus")) {
    let newImports = lucideImportMatch[1] + ", PackagePlus";
    code = code.replace(lucideImportMatch[0], `import {${newImports}} from "lucide-react";`);
}

fs.writeFileSync(path, code);
console.log("Script execution succeeded.");
