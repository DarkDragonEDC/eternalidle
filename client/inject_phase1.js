import fs from 'fs';
let content = fs.readFileSync('src/components/GuildPanel.jsx', 'utf8');

const stateInsert = 'const [showNavDropdown, setShowNavDropdown] = useState(false);';
if (!content.includes('showDonateModal')) {
    content = content.replace(stateInsert, stateInsert + '\n    const [showDonateModal, setShowDonateModal] = useState(false);\n    const [donationSilver, setDonationSilver] = useState("");\n    const [selectedDonationItem, setSelectedDonationItem] = useState(null);\n    const [donationItemAmount, setDonationItemAmount] = useState("");\n    const [donationPending, setDonationPending] = useState(false);');
    console.log('Added state');
}

if (!content.includes("{ id: 'TASKS'")) {
    content = content.replace(/{ id: 'MEMBERS', label: 'Home', icon: Home },/g, 
        "{ id: 'MEMBERS', label: 'Home', icon: Home },\n                                            { id: 'TASKS', label: 'Tasks', icon: ClipboardList },");
    console.log('Added tasks tab to nav');
}

const reqTabInsertStr = "{activeTab === 'SETTINGS' && (";
if (content.includes(reqTabInsertStr) && !content.includes("activeTab === 'TASKS'")) {
    const tasksHtml = `{activeTab === 'TASKS' && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                            <ClipboardList size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '15px' }} />
                            <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>Guild Tasks</h3>
                            <p style={{ margin: 0 }}>Guild tasks will be available here soon.</p>
                        </div>
                    )}\n\n                    `;
    content = content.replace(reqTabInsertStr, tasksHtml + reqTabInsertStr);
    console.log('Added tasks tab html');
}

if (!content.includes("{ id: 'GATHERING'")) {
    content = content.replace(
        /{ id: 'GUILD_HALL', name: 'Guild Hall', icon: Building2 }/g,
        "{ id: 'GUILD_HALL', name: 'Guild Hall', icon: Building2 },\n                                                    { id: 'GATHERING', name: 'Gathering Station', icon: Pickaxe },\n                                                    { id: 'REFINING', name: 'Refining Station', icon: FlaskConical },\n                                                    { id: 'CRAFTING', name: 'Crafting Station', icon: Hammer }"
    );
    console.log('Added buildings to dropdown');
}

fs.writeFileSync('src/components/GuildPanel.jsx', content);
console.log('Done');
