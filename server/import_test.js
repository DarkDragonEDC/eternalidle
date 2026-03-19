import { supabase } from "./services/supabase.js";
console.log("Supabase imported");
import { GameManager } from "./GameManager.js";
console.log("GameManager imported");
const gm = new GameManager(supabase);
console.log("GameManager instance created");
