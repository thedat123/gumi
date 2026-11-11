#!/usr/bin/env python3
"""Clear event scores and start a fresh round for every connected device."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import parse_qsl, unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
MIGRATION = ROOT / 'supabase/migrations/0065_event_reset_round.sql'


def database_env():
    config = {}
    for filename in ('.env', '.env.local'):
        path = ROOT / filename
        if path.exists():
            for line in path.read_text().splitlines():
                key, sep, value = line.removeprefix('export ').partition('=')
                if sep and key.strip() in ('DATABASE_URL', 'SUPABASE_DB_URL'):
                    config[key.strip()] = value.strip().strip('"\'')
    config.update({key: value for key in ('DATABASE_URL', 'SUPABASE_DB_URL') if (value := os.getenv(key))})
    url = os.getenv('DATABASE_URL') or os.getenv('SUPABASE_DB_URL') or config.get('DATABASE_URL') or config.get('SUPABASE_DB_URL')
    if not url:
        raise ValueError('Thiếu DATABASE_URL hoặc SUPABASE_DB_URL trong môi trường / .env.local.')
    connection = urlparse(url)
    if connection.scheme not in ('postgres', 'postgresql') or not connection.hostname:
        raise ValueError('Database URL phải có dạng postgresql://…')
    env = os.environ.copy()
    env.update({
        'PGHOST': connection.hostname, 'PGPORT': str(connection.port or 5432),
        'PGUSER': unquote(connection.username or ''), 'PGPASSWORD': unquote(connection.password or ''),
        'PGDATABASE': unquote(connection.path.lstrip('/')), 'PGCONNECT_TIMEOUT': '10',
    })
    for key, value in parse_qsl(connection.query):
        if key in ('sslmode', 'sslrootcert', 'options', 'connect_timeout'):
            env['PG' + key.upper()] = value
    return env


def clear_sql(dry_run=False):
    statements = ['BEGIN;', "SET LOCAL lock_timeout = '15s';", "SET LOCAL statement_timeout = '60s';",
                  'SELECT pg_advisory_xact_lock(734218906);']
    if not dry_run:
        # Bootstrap the narrowly scoped migration, so npm run clear also works
        # on an installation that has only the previous event schema.
        statements += [MIGRATION.read_text(),
                       'UPDATE public.event_state SET round_id = gen_random_uuid() WHERE singleton;']
    for table in ('event_plays', 'event_results'):
        action = f'SELECT count(*) INTO affected FROM public.{table};' if dry_run else f'DELETE FROM public.{table}; GET DIAGNOSTICS affected = ROW_COUNT;'
        statements.append(f"""DO $$ DECLARE affected bigint; BEGIN
  IF to_regclass('public.{table}') IS NOT NULL THEN
    {action}
    RAISE NOTICE '{table}: %', affected;
  END IF;
END $$;""")
    if not dry_run:
        statements += ["""DO $$ BEGIN
  IF to_regclass('public.gumi_schema_migrations') IS NOT NULL THEN
    INSERT INTO public.gumi_schema_migrations(version, filename)
    VALUES ('0065', '0065_event_reset_round.sql') ON CONFLICT DO NOTHING;
  END IF;
END $$;""", 'NOTIFY pgrst, \'reload schema\';']
    statements += ['ROLLBACK;' if dry_run else 'COMMIT;']
    return '\n'.join(statements) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true', help='Chỉ đếm dữ liệu; không xóa hoặc đổi đợt chơi.')
    args = parser.parse_args()
    try:
        env = database_env()
        executable = shutil.which('psql')
        if not executable:
            raise ValueError('Cần cài PostgreSQL client (psql) trước khi chạy lệnh.')
        result = subprocess.run([executable, '-X', '-v', 'ON_ERROR_STOP=1', '-q'],
                                input=clear_sql(args.dry_run), text=True, env=env, capture_output=True)
        # Never expose connection credentials in errors.
        output = result.stderr
        if env.get('PGPASSWORD'):
            output = output.replace(env['PGPASSWORD'], '[redacted]')
        if result.returncode:
            print(output.strip(), file=sys.stderr)
            return result.returncode
        for line in output.splitlines():
            if 'event_plays:' in line or 'event_results:' in line:
                print(line.removeprefix('NOTICE:').strip())
        if args.dry_run:
            print('Dry run: chưa xóa dữ liệu, chưa mở đợt mới.')
        else:
            print('Đã xóa tên, lượt chơi và điểm event. Đợt mới đã bắt đầu.')
            print('Điện thoại dùng bản app mới sẽ tự về màn nhập tên khi mở lại / có mạng.')
        return 0
    except (ValueError, OSError) as error:
        # Connection parsing errors can contain credentials; keep this generic.
        if isinstance(error, ValueError) and 'Database URL' not in str(error) and 'Thiếu' not in str(error) and 'Cần cài' not in str(error):
            print('Database URL không hợp lệ.', file=sys.stderr)
        else:
            print(str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
