import { Client } from 'pg';

const password = 'pNpNunNHoRiY8cSPlq8ZEVvdxz8u_xGg';
const projectRef = 'arzthloosvnasokxygfo';

const urls = [
  // Direct connection
  `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
  // Different pooler regions
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,  
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
];

async function testConnection(url: string): Promise<boolean> {
  const shortUrl = url.replace(password, '***').substring(0, 80);
  process.stdout.write(`Testing ${shortUrl}... `);
  
  const client = new Client({ 
    connectionString: url, 
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
  
  try {
    await client.connect();
    const result = await client.query('SELECT 1 as test');
    await client.end();
    console.log('✅ SUCCESS');
    return true;
  } catch (err: any) {
    console.log(`❌ ${err.message.substring(0, 50)}`);
    return false;
  }
}

async function main() {
  console.log('Testing OLD database connections...\n');
  
  for (const url of urls) {
    const success = await testConnection(url);
    if (success) {
      console.log('\n✅ Found working connection!');
      console.log(`URL: ${url.replace(password, '***')}`);
      break;
    }
  }
}

main();

