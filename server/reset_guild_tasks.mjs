
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function resetTasks() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    console.log("Resetando tarefas de todas as guildas para forçar nova geração...");
    
    const { error } = await supabase
        .from('guilds')
        .update({
            daily_tasks: [],
            tasks_last_reset: '-infinity' 
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Resetar todas

    if (error) {
        console.error("Erro ao resetar tarefas:", error);
    } else {
        console.log("Sucesso! As tarefas serão geradas novamente no próximo acesso à aba de Tasks.");
    }
}

resetTasks();
