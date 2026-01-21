const { createClient } = require("@supabase/supabase-js");

let supabase = null;
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length === 0) {
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
    console.log(`[INIT] Supabase Connected. Key Type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON'}`);
} else {
    console.warn(`[INIT] Supabase NOT initialized. Missing: ${missingEnv.join(', ')}`);
}

module.exports = supabase;
