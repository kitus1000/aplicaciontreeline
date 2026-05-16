require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTable() {
    const { data, error } = await supabase.from('checadas').select('*').limit(1);
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Columns:', data.length > 0 ? Object.keys(data[0]) : 'Table is empty');
        
        // Try inserting a dummy row but rolling it back? No, just try an insert that fails on purpose.
        const res = await supabase.from('checadas').insert([{
            id_empleado: '00000000-0000-0000-0000-000000000000', // Invalid ID, should cause foreign key error
            tipo_checada: 'ENTRADA',
            fecha_local: '2026-05-15',
            es_manual: true
        }]);
        console.log('Insert attempt:', res.error ? res.error.message : 'Success');
    }
}
checkTable();
