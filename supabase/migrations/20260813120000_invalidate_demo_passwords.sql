-- The original demo seed used shared, documented passwords. Keep the synthetic
-- showcase data intact, but make every known demo auth identity inaccessible.
-- This migration is safe to re-run: it assigns a new random password each time.
UPDATE auth.users
SET
  encrypted_password = crypt(encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
  updated_at = now()
WHERE email IN (
  'demo.agent@estately.test',
  'demo.landlord@estately.test',
  'demo.tenant@estately.test',
  'demo.contractor@estately.test',
  'demo-landlord@estately.dev',
  'demo-agent@estately.dev',
  'demo-tenant@estately.dev',
  'demo-buyer@estately.dev',
  'demo-conveyancer@estately.dev',
  'demo-contractor@estately.dev',
  'demo-inventory@estately.dev',
  'demo-utility@estately.dev'
);
