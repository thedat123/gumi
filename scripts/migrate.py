#!/usr/bin/env python3
"""Apply pending SQL migrations; explicitly baseline databases predating tracking."""
import argparse
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('database_url', nargs='?')
parser.add_argument('--baseline', metavar='VERSION', help='Record files through VERSION without executing SQL (existing databases only)')
parser.add_argument('--status', action='store_true')
args = parser.parse_args()
url = args.database_url or os.getenv('DATABASE_URL') or os.getenv('SUPABASE_DB_URL')
if not url:
    for line in (ROOT / '.env.local').read_text().splitlines() if (ROOT / '.env.local').exists() else []:
        if line.startswith('SUPABASE_DB_URL='):
            url = line.split('=', 1)[1].strip().strip('\"\'')
if not url:
    sys.exit('Missing DATABASE_URL / SUPABASE_DB_URL (or .env.local).')
files = sorted((ROOT / 'supabase/migrations').glob('*.sql'))
if args.baseline and args.baseline not in [f.name.split('_')[0] for f in files]:
    sys.exit('Unknown baseline version. Example: --baseline 0031')

def literal(value):
    return "'" + value.replace("'", "''") + "'"

sql = [r'\set ON_ERROR_STOP on', 'SELECT pg_advisory_lock(734218906);']
sql += ["""SELECT to_regclass('public.gumi_schema_migrations') IS NULL
 AND to_regclass('public.profiles') IS NOT NULL AS needs_baseline \\gset"""]
if not args.baseline:
    sql += [r'\if :needs_baseline', r'\echo Existing database has no migration history. Review its current version, then run --baseline VERSION.', "DO $$ BEGIN RAISE EXCEPTION 'Migration history required: run --baseline VERSION after verifying existing schema'; END $$;", r'\endif']
sql += ['''CREATE TABLE IF NOT EXISTS public.gumi_schema_migrations (
 version text PRIMARY KEY, filename text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gumi_schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gumi_schema_migrations FROM PUBLIC;''']
if args.baseline:
    sql += ['BEGIN;']
    for f in files:
        version = f.name.split('_')[0]
        if version <= args.baseline:
            sql += [f'INSERT INTO public.gumi_schema_migrations(version,filename) VALUES ({literal(version)},{literal(f.name)}) ON CONFLICT DO NOTHING;']
    sql += ['COMMIT;', r'\echo Baseline recorded. No migration SQL executed.']
elif args.status:
    for f in files:
        version = f.name.split('_')[0]
        sql += [f"SELECT {literal(f.name)} AS migration, CASE WHEN EXISTS (SELECT 1 FROM public.gumi_schema_migrations WHERE version={literal(version)}) THEN 'applied' ELSE 'pending' END AS status;"]
else:
    for f in files:
        version = f.name.split('_')[0]
        sql += [f'SELECT NOT EXISTS (SELECT 1 FROM public.gumi_schema_migrations WHERE version={literal(version)}) AS pending \\gset', r'\if :pending', f'\\echo Applying {f.name}', 'BEGIN;', f.read_text(), f'INSERT INTO public.gumi_schema_migrations(version,filename) VALUES ({literal(version)},{literal(f.name)});', 'COMMIT;', r'\endif']
sql += ['SELECT pg_advisory_unlock(734218906);']
# Parse URI credentials into libpq environment variables.
from urllib.parse import urlparse, unquote
env = os.environ.copy()
connection = urlparse(url)
if connection.scheme not in ('postgres', 'postgresql'):
    sys.exit('Use a postgresql:// connection URL.')
for key, value in {'PGHOST': connection.hostname, 'PGPORT': str(connection.port or 5432),
                   'PGUSER': unquote(connection.username or ''), 'PGPASSWORD': unquote(connection.password or ''),
                   'PGDATABASE': unquote(connection.path.lstrip('/'))}.items():
    if value:
        env[key] = value
from urllib.parse import parse_qsl
for key, value in parse_qsl(connection.query):
    if key in ('sslmode', 'connect_timeout', 'sslrootcert', 'options'):
        env['PG' + key.upper()] = value
try:
    result = subprocess.run(['psql', '-X', '-v', 'ON_ERROR_STOP=1'], input='\n'.join(sql)+'\n', text=True, env=env)
except FileNotFoundError:
    sys.exit('psql is required.')
sys.exit(result.returncode)
