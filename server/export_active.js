import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function exportActivePlayers() {
    try {
        const { data: chars, error } = await supabase
            .from('characters')
            .select('name, current_activity, state, activity_started_at')
            .or('current_activity.not.is.null,state->combat.not.is.null,state->dungeon.not.is.null');

        if (error) throw error;

        const now = new Date();
        const report = (chars || []).map(char => {
            let activityName = 'Idle';
            let startTime = null;

            if (char.state.dungeon) {
                activityName = `Dungeon: ${char.state.dungeon.id}`;
                startTime = new Date(char.state.dungeon.started_at);
            } else if (char.state.combat) {
                activityName = `Combat: ${char.state.combat.mobName}`;
                startTime = new Date(char.state.combat.started_at);
            } else if (char.current_activity) {
                activityName = `${char.current_activity.type}: ${char.current_activity.item_id}`;
                startTime = new Date(char.activity_started_at);
            }

            let durationStr = 'Unknown';
            if (startTime && !isNaN(startTime.getTime())) {
                const diffMs = now - startTime;
                const h = Math.floor(diffMs / 3600000);
                const m = Math.floor((diffMs % 3600000) / 60000);
                const s = Math.floor((diffMs % 60000) / 1000);
                durationStr = `${h}h ${m}m ${s}s`;
            }

            return { name: char.name, activity: activityName, duration: durationStr };
        });

        fs.writeFileSync('active_report.json', JSON.stringify(report, null, 2), 'utf8');
        console.log("Report generated: active_report.json");

    } catch (err) {
        console.error("Error:", err.message);
    }
}

exportActivePlayers();
