#!/usr/bin/env node
/**
 * Noor Fleet Management System - Initial Super Admin Setup CLI
 * 
 * Usage:
 *   node scripts/setup-super-admin.cjs
 *   node scripts/setup-super-admin.cjs "Admin Name" "admin@alnoortransport.com" "SecurePassword123!"
 */

const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xpbcfnxorfqnoraqdpiq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwYmNmbnhvcmZxbm9yYXFkcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQwMjMzMiwiZXhwIjoyMTA4OTc4MzMyfQ.xJl3mRJilo5nHwJavt9m_LDBgUMeDroSJPG_Q1L4S6A';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function promptQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('  NOOR FLEET ERP - SECURE SUPER ADMIN SETUP UTILITY');
  console.log('======================================================\n');

  try {
    // 1. Audit existing accounts
    const { data: profiles, error: pErr } = await admin
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('role', 'SUPER_ADMIN');

    if (pErr) {
      console.error('[Error] Could not check existing profiles:', pErr.message);
    }

    const existingSuperAdmins = profiles || [];
    if (existingSuperAdmins.length > 0) {
      console.log(`[Info] ${existingSuperAdmins.length} Super Admin account(s) already exist in the system:`);
      existingSuperAdmins.forEach(sa => console.log(`  - ${sa.full_name} (${sa.email}) [Active: ${sa.is_active}]`));
      console.log('\nTo manage users, log in to the web application as Super Admin and navigate to User Management.');
      
      const proceed = await promptQuestion('\nDo you want to create an additional Super Admin account? (y/N): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('Aborting.');
        process.exit(0);
      }
    }

    // 2. Collect credentials from CLI arguments or prompts
    const args = process.argv.slice(2);
    let fullName = args[0];
    let email = args[1];
    let password = args[2];
    let department = args[3] || 'Executive Management';

    if (!fullName) {
      fullName = await promptQuestion('Enter Full Legal Name (e.g. Faisal Al-Noor): ');
    }
    if (!email) {
      email = await promptQuestion('Enter Corporate Email (e.g. admin@alnoortransport.com): ');
    }
    if (!password) {
      password = await promptQuestion('Enter Secure Master Password (min 8 characters): ');
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();

    if (!cleanName || !cleanEmail || !password) {
      console.error('\n[Error] Full name, email, and password are all required.');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('\n[Error] Password must be at least 8 characters long.');
      process.exit(1);
    }

    console.log(`\nProvisioning Super Admin account for: ${cleanEmail}...`);

    // 3. Create user via Supabase Auth Admin API
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        role: 'SUPER_ADMIN',
        department: department
      }
    });

    if (createError) {
      console.error('\n[Error] Supabase Auth creation failed:', createError.message);
      process.exit(1);
    }

    const userId = newUser.user.id;

    // 4. Upsert into public.profiles
    const { error: profError } = await admin.from('profiles').upsert({
      id: userId,
      email: cleanEmail,
      full_name: cleanName,
      role: 'SUPER_ADMIN',
      department: department,
      is_active: true
    });

    if (profError) {
      console.warn('[Warning] Profile upsert notice:', profError.message);
    }

    console.log('\n======================================================');
    console.log('  SUCCESS! SUPER ADMIN ACCOUNT CREATED AND ACTIVATED');
    console.log('======================================================');
    console.log(`  User ID:    ${userId}`);
    console.log(`  Full Name:  ${cleanName}`);
    console.log(`  Email:      ${cleanEmail}`);
    console.log(`  Role:       SUPER_ADMIN (Full System Authority)`);
    console.log(`  Department: ${department}`);
    console.log(`  Status:     Active & Email Confirmed`);
    console.log('======================================================\n');
    console.log('You can now log in at:');
    console.log('  Web App:  https://noor-fleet.vercel.app');
    console.log('  Local:    http://localhost:5173\n');
  } catch (err) {
    console.error('\n[Unexpected Error]:', err);
    process.exit(1);
  }
}

main();

