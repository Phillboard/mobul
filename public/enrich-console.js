// COPY THIS ENTIRE FILE AND PASTE INTO BROWSER CONSOLE
// Make sure you're on http://localhost:8080 first

(async function () {
    console.log('🚀 Starting enrichment...');

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
        'https://arzthloosvnasokxygfo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenRobG9vc3ZuYXNva3h5Z2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODM2NDgsImV4cCI6MjA3ODM1OTY0OH0.-Nv9m7Gcf2h-RHP2wWLT8UiKBmmnxFKmMsyqkBKzAhI'
    );

    const r = (n, x) => Math.floor(Math.random() * (x - n + 1)) + n;
    const e = a => a[r(0, a.length - 1)];
    const p = d => { const t = new Date(); t.setDate(t.getDate() - r(0, d)); return t.toISOString(); };

    const fn = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer'];
    const ln = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];

    const client = {
        id: crypto.randomUUID(),
        company_name: 'Summit Roofing & Construction',
        industry: 'roofing',
        address: '1234 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        phone: '(512) 555-0100',
        website: 'www.summitroofing.com',
        created_at: p(180),
        is_active: true
    };

    console.log('Creating client...');
    await supabase.from('clients').upsert(client);

    const contacts = [];
    for (let i = 0; i < 25; i++) {
        const f = e(fn), l = e(ln);
        contacts.push({
            id: crypto.randomUUID(),
            client_id: client.id,
            first_name: f,
            last_name: l,
            email: `${f.toLowerCase()}.${l.toLowerCase()}@gmail.com`,
            phone: `(${r(200, 999)}) ${r(200, 999)}-${r(1000, 9999)}`,
            job_title: e(['Homeowner', 'Property Manager']),
            address: `${r(100, 9999)} Main St`,
            city: 'Austin',
            state: 'TX',
            zip: '78701',
            lifecycle_stage: e(['lead', 'opportunity', 'customer']),
            lead_source: 'website',
            created_at: p(90)
        });
    }

    console.log('Adding 25 contacts...');
    await supabase.from('contacts').upsert(contacts);

    console.log('✅ Done!');
    alert('Done! Refresh and select "Summit Roofing & Construction"');
})();
