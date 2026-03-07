import fs from 'fs';
let content = fs.readFileSync('GuildPanel.jsx', 'utf8');

// Update Header
const headerSearch = /\{selectedBuilding === 'GUILD_HALL' \? \(\s+<Building2 size=\{18\} color="var\(--accent\)" \/>\s+\) : selectedBuilding === 'GATHERING' \? \(\s+<Pickaxe size=\{18\} color="var\(--accent\)" \/>\s+\) : \(\s+<Landmark size=\{18\} color="var\(--accent\)" \/>\s+\)\}/g;
const headerReplacement = `{selectedBuilding === 'GUILD_HALL' ? (
                                            <Building2 size={18} color="var(--accent)" />
                                        ) : selectedBuilding === 'GATHERING' ? (
                                            <Pickaxe size={18} color="var(--accent)" />
                                        ) : selectedBuilding === 'REFINING' ? (
                                            <FlaskConical size={18} color="var(--accent)" />
                                        ) : (
                                            <Landmark size={18} color="var(--accent)" />
                                        )}`;

content = content.replace(headerSearch, headerReplacement);

const titleSearch = /\{selectedBuilding === 'GUILD_HALL' \? 'Guild Hall' : \s+selectedBuilding === 'GATHERING' \? 'Gathering Station' : \s+'Bank'\}/g;
const titleReplacement = `{selectedBuilding === 'GUILD_HALL' ? 'Guild Hall' : 
                                             selectedBuilding === 'GATHERING' ? 'Gathering Station' : 
                                             selectedBuilding === 'REFINING' ? 'Refining Station' : 
                                             'Bank'}`;

content = content.replace(titleSearch, titleReplacement);

// Update Dropdown List
const dropdownSearch = /\{ id: 'GATHERING', name: 'Gathering Station', icon: Pickaxe \}/g;
const dropdownReplacement = `{ id: 'GATHERING', name: 'Gathering Station', icon: Pickaxe },\n                                                    { id: 'REFINING', name: 'Refining Station', icon: FlaskConical }`;

content = content.replace(dropdownSearch, dropdownReplacement);

fs.writeFileSync('GuildPanel.jsx', content);
console.log("Header and Dropdown updated.");
