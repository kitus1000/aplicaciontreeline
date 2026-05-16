require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTable() {
    const { data, error } = await supabase.from('workday_events').select('*').limit(1);
    if (error) {
        console.error('workday_events Error:', error.message);
    } else {
        console.log('workday_events OK');
    }
}
checkTable();
