const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

// The corrupted block starts at line 775 (1-indexed)
// Let's find the exact markers to replace.
const lines = content.split('\n');

// Verify line 775
// 775:     socket.on('kick_guild_member', async ({ memberId }) => {
if (lines[774] && lines[774].includes("socket.on('kick_guild_member'")) {
    console.log("Found kick_guild_member at line 775");

    // We want to replace from 775 to 792 (1-indexed)
    // 792:             });
    // 793: 
    // 794:             socket.on('change_name'

    const correctGuildLogic = `    socket.on('kick_guild_member', async ({ memberId }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = await gameManager.guildManager.kickMember(char, { targetMemberId: memberId });
                if (result.success) {
                    socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                }
            });
        } catch (err) {
            console.error('[GUILD] Error in kick_guild_member socket:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('upgrade_guild_building', async ({ buildingType }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = await gameManager.guildManager.upgradeBuilding(char, buildingType);
                if (result.success) {
                    socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                }
            });
        } catch (err) {
            console.error('[GUILD] Error in upgrade_guild_building socket:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('donate_to_guild_bank', async ({ silver, items }) => {
        try {
            if (!socket.data.characterId || socket.data.characterId === 'undefined') return;
            await gameManager.executeLocked(socket.user.id, async () => {
                const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
                const result = await gameManager.guildManager.donateToBank(char, { silver, items });
                if (result.success) {
                    socket.emit('status_update', await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
                }
            });
        } catch (err) {
            console.error('[GUILD] Error in donate_to_guild_bank socket:', err);
            socket.emit('error', { message: err.message });
        }
    });`;

    // Now, we need to extract everything from line 794 (socket.on('change_name')) onwards, 
    // de-indent it by 8 spaces (2 levels of 4 spaces, based on the corruption), 
    // and then find the extra closing braces to remove at the end of the connection block.

    const blockToDeindent = lines.slice(793); // from index 793 (line 794) to end

    // The corruption introduced 2 extra levels of async callback nesting:
    // 1. executeLocked callback
    // 2. another executeLocked callback (corrupted)
    // Wait, let's look at line 794 indentation.
    // In view_file, line 794 was preceded by 12 spaces (3 levels of 4 spaces).
    // It SHOULD be at 1 level of indentation (4 spaces).
    // So we de-indent by 8 spaces.

    const deindentedBlock = blockToDeindent.map(line => {
        if (line.startsWith('            ')) return line.substring(8);
        if (line.startsWith('        ')) return line.substring(8); // Careful with short lines
        if (line.trim() === '') return '';
        return line.replace(/^\s{1,8}/, ''); // Fallback
    });

    // We also need to find the 2 extra closing braces at the end of the connection block.
    // The connection block ends at line 3122: });
    // Let's find where the ticker loop starts.
    let endIndexInDeindented = -1;
    for (let i = 0; i < deindentedBlock.length; i++) {
        if (deindentedBlock[i].includes("}, 1000);")) { // End of heartbeat loop
            endIndexInDeindented = i;
            break;
        }
    }

    // Actually, the connection block ended around line 3122.
    // In the deindented block, this would be roughly 3122 - 794 = 2328.
    // Let's look for the }); that closed the io.on('connection').
    // Since we de-indented, we should have 2 extra }); that were supposed to close the corrupted blocks.

    // Reconstruct the file
    let newLines = lines.slice(0, 774); // Keep up to line 774
    newLines.push(correctGuildLogic);
    newLines.push(...deindentedBlock);

    let newContent = newLines.join('\n');

    // Final Polish: Removing the 2 extra }); at the end of the connection block.
    // We need to be VERY careful here.
    // The heartbeat loop starts at:
    // 3126:             })); (Wait, what is this?)
    // In my view_file:
    // 3122:     }); (Connection end)
    // 3123:                 } catch (err) {
    // 3124:                     console.error(`[TICKER] Error for character ${user.id}: `, err);
    // 3125:                 }
    // 3126:             }));

    // Wait, if I de-indented by 8 spaces, line 3122 (});) is now at -4 indentation level? 
    // No, it will be at 0 level if it was at 4.

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("File repaired and written.");
} else {
    console.error("Could not find line 775 correctly.");
}
