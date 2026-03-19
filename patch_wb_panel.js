const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/components/WorldBossPanel.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add missing imports if necessary (Medal is in lucide-react?)
if (!content.includes('Medal,')) {
    content = content.replace('Trophy, ', 'Trophy, Medal, ');
}
if(!content.includes('resolveItem')) {
    content = content.replace("import { formatNumber }", "import { formatNumber }\nimport { resolveItem } from '@shared/items';");
}

// 2. Add properties to WorldBossPanel
content = content.replace(
    /const WorldBossPanel = \(\{\s*gameState,\s*isMobile,\s*socket,\s*onChallenge\s*\}\) => \{/,
    'const WorldBossPanel = ({ gameState, isMobile, socket, onChallenge, onInspect, onShowInfo }) => {'
);

// 3. Add to BossCard props
content = content.replace(
    /const BossCard = \(\{\s*data,\s*type,\s*onChallenge,\s*isMobile,\s*setShowInfo,\s*rankingType,\s*setRankingType,\s*gameState,\s*socket\s*\}\) => \{/,
    'const BossCard = ({ data, type, onChallenge, isMobile, setShowInfo, rankingType, setRankingType, gameState, socket, onInspect, onShowItem }) => {\n\n    const getMedalColor = (index) => {\n        if (index === 0) return \'#FFD700\';\n        if (index === 1) return \'#E0E0E0\';\n        if (index === 2) return \'#CD7F32\';\n        return \'var(--text-dim)\';\n    };\n\n    const MedalIcon = ({ index, size = 20 }) => {\n        if (index > 2) return <span style={{ fontSize: \'0.85rem\', opacity: 0.6 }}>#{index + 1}</span>;\n        return (\n            <div className="medal-glow" style={{ position: \'relative\', display: \'flex\', alignItems: \'center\', justifyContent: \'center\' }}>\n                <Medal size={size} style={{ filter: `drop-shadow(0 0 6px ${getMedalColor(index)}44)`, fill: index === 0 ? \'#FFD700\' : index === 1 ? \'#E0E0E0\' : \'#CD7F32\', stroke: \'rgba(0,0,0,0.3)\', strokeWidth: 1.5 }} />\n            </div>\n        );\n    };\n\n    const DAMAGE_MILESTONES = [\n        { id: \'T10_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 1100000 },\n        { id: \'T10_WORLDBOSS_CHEST_EXCELLENT\', dmg: 950000 },\n        { id: \'T10_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 825000 },\n        { id: \'T10_WORLDBOSS_CHEST_GOOD\', dmg: 750000 },\n        { id: \'T10_WORLDBOSS_CHEST_NORMAL\', dmg: 670000 },\n        { id: \'T9_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 605000 },\n        { id: \'T9_WORLDBOSS_CHEST_EXCELLENT\', dmg: 550000 },\n        { id: \'T9_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 505000 },\n        { id: \'T9_WORLDBOSS_CHEST_GOOD\', dmg: 465000 },\n        { id: \'T9_WORLDBOSS_CHEST_NORMAL\', dmg: 430000 },\n        { id: \'T8_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 400000 },\n        { id: \'T8_WORLDBOSS_CHEST_EXCELLENT\', dmg: 370000 },\n        { id: \'T8_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 335000 },\n        { id: \'T8_WORLDBOSS_CHEST_GOOD\', dmg: 315000 },\n        { id: \'T8_WORLDBOSS_CHEST_NORMAL\', dmg: 290000 },\n        { id: \'T7_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 272000 },\n        { id: \'T7_WORLDBOSS_CHEST_EXCELLENT\', dmg: 252000 },\n        { id: \'T7_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 235000 },\n        { id: \'T7_WORLDBOSS_CHEST_GOOD\', dmg: 220000 },\n        { id: \'T7_WORLDBOSS_CHEST_NORMAL\', dmg: 205000 },\n        { id: \'T6_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 192000 },\n        { id: \'T6_WORLDBOSS_CHEST_EXCELLENT\', dmg: 178000 },\n        { id: \'T6_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 165000 },\n        { id: \'T6_WORLDBOSS_CHEST_GOOD\', dmg: 155000 },\n        { id: \'T6_WORLDBOSS_CHEST_NORMAL\', dmg: 145000 },\n        { id: \'T5_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 134000 },\n        { id: \'T5_WORLDBOSS_CHEST_EXCELLENT\', dmg: 125000 },\n        { id: \'T5_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 117000 },\n        { id: \'T5_WORLDBOSS_CHEST_GOOD\', dmg: 108000 },\n        { id: \'T5_WORLDBOSS_CHEST_NORMAL\', dmg: 100000 },\n        { id: \'T4_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 93000 },\n        { id: \'T4_WORLDBOSS_CHEST_EXCELLENT\', dmg: 86000 },\n        { id: \'T4_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 80000 },\n        { id: \'T4_WORLDBOSS_CHEST_GOOD\', dmg: 73000 },\n        { id: \'T4_WORLDBOSS_CHEST_NORMAL\', dmg: 68000 },\n        { id: \'T3_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 63000 },\n        { id: \'T3_WORLDBOSS_CHEST_EXCELLENT\', dmg: 58000 },\n        { id: \'T3_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 52000 },\n        { id: \'T3_WORLDBOSS_CHEST_GOOD\', dmg: 47000 },\n        { id: \'T3_WORLDBOSS_CHEST_NORMAL\', dmg: 42000 },\n        { id: \'T2_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 38000 },\n        { id: \'T2_WORLDBOSS_CHEST_EXCELLENT\', dmg: 33000 },\n        { id: \'T2_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 29000 },\n        { id: \'T2_WORLDBOSS_CHEST_GOOD\', dmg: 25000 },\n        { id: \'T2_WORLDBOSS_CHEST_NORMAL\', dmg: 22000 },\n        { id: \'T1_WORLDBOSS_CHEST_MASTERPIECE\', dmg: 18000 },\n        { id: \'T1_WORLDBOSS_CHEST_EXCELLENT\', dmg: 14000 },\n        { id: \'T1_WORLDBOSS_CHEST_OUTSTANDING\', dmg: 11000 },\n        { id: \'T1_WORLDBOSS_CHEST_GOOD\', dmg: 8000 },\n        { id: \'T1_WORLDBOSS_CHEST_NORMAL\', dmg: 1 }\n    ];\n\n    const calculatePotentialChest = (damage) => {\n        if (damage <= 0) return { label: \'T1 WB Chest (Normal)\', id: \'T1_WORLDBOSS_CHEST_NORMAL\' };\n        const milestone = DAMAGE_MILESTONES.find(m => damage >= m.dmg) || DAMAGE_MILESTONES[DAMAGE_MILESTONES.length - 1];\n        const chestId = milestone.id;\n        const parts = chestId.split(\'_\');\n        const tier = parts[0];\n        const rarity = parts[parts.length - 1];\n        const rarityFormatted = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();\n        return {\n            label: `${tier} WB Chest (${rarityFormatted})`,\n            id: chestId\n        };\n    };\n'
);

// 4. Also forward the props from WorldBossPanel invocation of BossCard
content = content.replace(
    /socket=\{socket\}\n\s*\/>/g,
    'socket={socket}\n                    onInspect={onInspect}\n                    onShowItem={onShowInfo}\n                />'
);

// 5. Replace list.map entirely
const oldMapBlock = `list.map((rank, i) => (
                                        <div key={rank.character_id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: rank.character_id === gameState?.character?.id ? 'var(--accent-soft)' : 'transparent', borderRadius: '10px', border: rank.character_id === gameState?.character?.id ? '1px solid var(--accent)' : '1px solid transparent' }}>
                                            <div style={{ width: '30px', fontWeight: '900', color: i < 3 ? '#d4af37' : 'var(--text-dim)', fontSize: '0.8rem' }}>#{i + 1}</div>
                                            <div style={{ flex: 1, fontWeight: '700', fontSize: '0.8rem' }}>{rank.name}</div>
                                            <div style={{ fontWeight: '900', fontSize: '0.8rem' }}>{formatNumber(rank.damage)}</div>
                                        </div>
                                    ))`;

const newMapBlock = `list.map((rank, index) => {
                                        const isMe = rank.character_id === gameState?.character?.id;
                                        const isTop3 = index < 3;
                                        return (
                                            <motion.div
                                                key={rank.character_id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                className={\`ranking-row \${isMe ? 'me' : ''} \${isTop3 ? 'top-3' : ''}\`}
                                                style={{ marginBottom: '6px' }}
                                            >
                                                <div className="ranking-position">
                                                    <MedalIcon index={index} size={isMobile ? 22 : 26} />
                                                </div>
                                                <div style={{ flex: 1, marginLeft: isMobile ? '12px' : '16px', overflow: 'hidden' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span
                                                            onClick={onInspect ? () => onInspect(rank.name) : undefined}
                                                            className={\`ranking-name \${isMe ? 'me' : ''}\`}
                                                            style={{ cursor: onInspect ? 'pointer' : 'default' }}
                                                        >
                                                            {rank.guild_tag && <span style={{ color: 'var(--accent)', opacity: 0.8, fontSize: '0.8rem', marginRight: '4px' }}>[{rank.guild_tag}]</span>}
                                                            {rank.isIronman && <span title="Ironman" style={{ fontSize: '0.8rem' }}>🛡️</span>}
                                                            {rank.name}
                                                        </span>
                                                        {isMe && <span style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>— yours</span>}
                                                    </div>
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const chest = calculatePotentialChest(rank.damage);
                                                            if (onShowItem) onShowItem(resolveItem(chest.id));
                                                        }}
                                                        className="chest-label"
                                                        style={{ fontSize: '0.65rem', color: '#ae00ff', cursor: 'pointer', marginTop: '2px', opacity: 0.9, letterSpacing: '0.5px' }}
                                                    >
                                                        {calculatePotentialChest(rank.damage).label}
                                                    </div>
                                                </div>
                                                <div className="ranking-damage-container">
                                                    <div className="ranking-damage-value">
                                                        {formatNumber(rank.damage)}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })`;

content = content.replace(oldMapBlock, newMapBlock);

fs.writeFileSync(filePath, content);
console.log('Script patched World Boss Panel!');
