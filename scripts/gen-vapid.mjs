#!/usr/bin/env node
// Sinh cặp khoá VAPID cho Web Push. Cần: npm i -D web-push
//   node scripts/gen-vapid.mjs
// Public key → .env.local (VITE_VAPID_PUBLIC_KEY) để frontend subscribe.
// Private key → Supabase secrets (KHÔNG commit, KHÔNG để ở frontend):
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@domain

let webpush;
try {
  ({ default: webpush } = await import('web-push'));
} catch {
  console.error('Cần web-push: npm i -D web-push');
  process.exit(1);
}

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log('# Frontend (.env.local):');
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}`);
console.log('\n# Supabase Edge Function secrets:');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:you@domain');
