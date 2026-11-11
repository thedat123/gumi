#!/usr/bin/env python3
"""Isolated PostgreSQL integration test. Never connects to .env / production."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parent.parent
PG = Path(shutil.which('psql')).parent
work = Path(tempfile.mkdtemp(prefix='gumi-event-reset-', dir='/private/tmp'))
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
env = {**os.environ, 'PGHOST': '127.0.0.1', 'PGPORT': str(port), 'PGUSER': 'postgres', 'PGDATABASE': 'postgres', 'PGPASSWORD': '',
       'DATABASE_URL': f'postgresql://postgres@127.0.0.1:{port}/postgres', 'SUPABASE_DB_URL': ''}


def run(args, **kwargs):
    result = subprocess.run([str(a) for a in args], env=env, text=True, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(result.stderr + result.stdout)
    return result.stdout.strip()


def sql(statement):
    return run([PG / 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At'], input=statement)


started = False
try:
    run([PG / 'initdb', '-D', work / 'db', '-A', 'trust', '-U', 'postgres', '--no-locale'])
    run([PG / 'pg_ctl', '-D', work / 'db', '-l', work / 'postgres.log', '-o', f'-h 127.0.0.1 -p {port} -k {work} -c max_connections=250 -c shared_buffers=32MB', 'start', '-w'])
    started = True
    sql("CREATE ROLE anon; CREATE ROLE authenticated; CREATE FUNCTION public._is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;")
    for name in ('0063_event_public_play.sql', '0064_event_one_play_common_board.sql'):
        sql((ROOT / 'supabase/migrations' / name).read_text())
    sql("CREATE TABLE public.event_results(id uuid PRIMARY KEY); INSERT INTO public.event_results VALUES(gen_random_uuid()); CREATE TABLE public.profiles(id int, name text); INSERT INTO public.profiles VALUES(1,'preserve me'); CREATE TABLE public.gumi_schema_migrations(version text PRIMARY KEY, filename text, applied_at timestamptz DEFAULT now());")
    player = str(uuid.uuid4())
    sql(f"INSERT INTO public.event_plays VALUES(gen_random_uuid(),'{player}','Previous player',1,25,now());")
    before = sql('SELECT count(*) FROM event_plays;')
    dry = run(['python3', ROOT / 'scripts/clear-event.py', '--dry-run'])
    assert before == sql('SELECT count(*) FROM event_plays;') == '1'
    assert sql("SELECT to_regclass('public.event_state') IS NULL;") == 't'
    print('PASS: dry run leaves records and schema unchanged.')
    run(['python3', ROOT / 'scripts/clear-event.py'])
    assert sql('SELECT count(*) FROM event_plays;') == '0'
    assert sql('SELECT count(*) FROM event_results;') == '0'
    assert sql("SELECT name FROM profiles;") == 'preserve me'
    assert sql("SELECT count(*) FROM gumi_schema_migrations WHERE version='0065';") == '1'
    first = sql('SELECT event_round();')
    sql(f"SET ROLE anon; SELECT event_submit(gen_random_uuid(),'{player}','Play again',1,25,'{first}'); RESET ROLE;")
    # Retrying a result cannot create a second row for the device.
    sql(f"SELECT event_submit(gen_random_uuid(),'{player}','Retry',1,25,'{first}');")
    assert sql('SELECT count(*) FROM event_plays;') == '1'
    run(['python3', ROOT / 'scripts/clear-event.py'])
    second = sql('SELECT event_round();')
    assert first != second
    stale = subprocess.run([str(PG / 'psql'), '-X', '-v', 'ON_ERROR_STOP=1'], input=f"SELECT event_submit(gen_random_uuid(),'{player}','Stale offline result',1,25,'{first}');", env=env, text=True, capture_output=True)
    assert stale.returncode and 'EVENT_ROUND_EXPIRED' in stale.stderr
    old_client = subprocess.run([str(PG / 'psql'), '-X', '-v', 'ON_ERROR_STOP=1'], input=f"SELECT event_submit(gen_random_uuid(),'{player}','Old client',1,25);", env=env, text=True, capture_output=True)
    assert old_client.returncode and 'EVENT_ROUND_EXPIRED' in old_client.stderr
    sql(f"SELECT event_submit(gen_random_uuid(),'{player}','Same phone after clear',1,25,'{second}');")
    assert sql('SELECT count(*) FROM event_plays;') == '1'
    print('PASS: clear is atomic, rotates round, empties current/legacy scores, preserves profiles, rejects stale/offline/old-client scores, allows same phone to play again.')
    run(['python3', ROOT / 'scripts/clear-event.py'])
    workload = work / 'load.sql'
    workload.write_text("BEGIN;\nSELECT event_round();\nSELECT event_submit(gen_random_uuid(), gen_random_uuid(), 'Local load player', 1, 25, (SELECT event_round()));\nSELECT * FROM event_board(0, 10, NULL);\nCOMMIT;\n")
    time.sleep(1.05)  # Separate the reset notification window from this score burst.
    revision_before = int(sql('SELECT revision FROM event_board_updates;'))
    started_at = time.monotonic()
    metrics = run([PG / 'pgbench', '-n', '-c', '200', '-j', '8', '-t', '1', '-f', workload])
    assert sql('SELECT count(*) FROM event_plays;') == '200'
    assert 'number of failed transactions: 0' in metrics
    revision_after = int(sql('SELECT revision FROM event_board_updates;'))
    assert 0 < revision_after - revision_before < 200
    sql('SET ROLE anon; SELECT revision FROM event_board_updates; RESET ROLE;')
    print(f'PASS: 200 submissions produced {revision_after - revision_before} public change signal(s), containing no player data.')
    print('PASS: 200 concurrent PostgreSQL clients, each reads round + submits score + reads board; exactly 200 results.')
    print(metrics)
    print(f'Wall time: {time.monotonic() - started_at:.2f}s. Local database evidence only; excludes Supabase gateway, production hardware and Internet latency.')
finally:
    if started:
        subprocess.run([str(PG / 'pg_ctl'), '-D', str(work / 'db'), 'stop', '-m', 'fast', '-w'], text=True, capture_output=True)
