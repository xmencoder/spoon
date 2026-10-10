const fs = require('fs');

const path = require('path');

// Reads credentials from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const lines = env.split(/\r?\n/);
const envVars = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > -1) {
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    envVars[k] = v;
  }
}

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function cleanOrders() {
  console.log("Cleaning all orders and transactions from Supabase...");

  const tables = [
    'order_items',
    'order_status_history',
    'notification_logs',
    'audit_logs',
    'order_notifications',
    'orders'
  ];

  for (const table of tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Deleted records from ${table}: HTTP ${res.status}`);
    } catch (e) {
      console.warn(`Notice on ${table}:`, e.message);
    }
  }

  // Reset product order counters
  try {
    const res = await fetch(`${url}/rest/v1/products?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ total_ordered: 0 })
    });
    console.log(`Reset products total_ordered: HTTP ${res.status}`);
  } catch (e) {
    console.warn("Notice on products:", e.message);
  }

  // Reset delivery slots order count
  try {
    const res = await fetch(`${url}/rest/v1/delivery_slots?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ current_order_count: 0 })
    });
    console.log(`Reset delivery_slots current_order_count: HTTP ${res.status}`);
  } catch (e) {
    console.warn("Notice on delivery_slots:", e.message);
  }

  console.log("\nDatabase orders cleaned successfully! Your store is now ready for fresh test orders.");
}

cleanOrders();
