import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    const { data: tables, error: tableError } = await supabase.rpc('get_tables');
    if (tableError) {
        // If RPC doesn't exist, we can try to query information_schema if we have access via postgres, but with REST API it's limited.
        // Another way is to query PG connection directly if we have DATABASE_URL.
        console.log("RPC Error:", tableError.message);
    }
    
    // We have a direct PG connection in backend/src/config/database.js probably? Let's check package.json for pg.
    // Yes, pg is in package.json.
}

main();
