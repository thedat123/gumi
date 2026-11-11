// Local test double for the event_results contract in 0041_event_games.sql.
// Auth is synthetic; this does not claim to reproduce Supabase RLS.
const http = require('http');
const rows = new Map();
let failure = 'none';
let round = '11111111-1111-4111-8111-111111111112';
const plays = new Map();
const calls = { round: 0, submit: 0, board: 0, profile: 0 };
const owner = '11111111-1111-4111-8111-111111111111';
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'authorization,apikey,content-type,prefer,x-client-info');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const path = new URL(req.url, 'http://local').pathname;
  const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  let body = '';
  for await (const chunk of req) body += chunk;
  if (path.endsWith('/__test/control') && req.method === 'POST') {
    const control = JSON.parse(body);
    if (control.failure) failure = control.failure;
    if (control.reset) { round = require('crypto').randomUUID(); plays.clear(); }
    return send(200, { failure, round, calls, plays: [...plays.values()] });
  }
  if (path.endsWith('/rest/v1/rpc/event_round')) { calls.round++; if (failure === 'round-error') return send(503, { message: 'test unavailable' }); return send(200, round); }
  if (path.endsWith('/rest/v1/rpc/event_submit')) {
    calls.submit++;
    if (failure === 'error') return send(503, { message: 'test unavailable' });
    const p = JSON.parse(body);
    if (p.p_round !== round) return send(400, { message: 'EVENT_ROUND_EXPIRED', code: 'P0001' });
    if (!p.p_id || !p.p_key || !p.p_player?.trim() || p.p_player.length > 40 || ![1,2,3].includes(p.p_game) || !Number.isInteger(p.p_score) || p.p_score < 0 || p.p_score % 5 || p.p_score > (p.p_game === 1 ? 600 : 25)) return send(400, { message: 'contract violation' });
    if (![...plays.values()].some(row => row.player_key === p.p_key) && !plays.has(p.p_id)) plays.set(p.p_id, { id: p.p_id, player_key: p.p_key, player: p.p_player, game: p.p_game, score: p.p_score, created_at: new Date().toISOString() });
    if (failure === 'hang') return setTimeout(() => send(503, { message: 'write committed, response delayed' }), 15000);
    return send(200, null);
  }
  if (path.endsWith('/rest/v1/rpc/event_board')) {
    calls.board++;
    const p = JSON.parse(body);
    const ranked = [...plays.values()].sort((a,b) => b.score - a.score || a.created_at.localeCompare(b.created_at)).map((row,i) => ({ id: row.id, player: row.player, game: row.game, score: row.score, rank: i + 1, me: row.player_key === p.p_key, total: plays.size }));
    return send(200, ranked.filter(row => (row.rank > p.p_offset && row.rank <= p.p_offset + p.p_limit) || row.me));
  }
  if (path.endsWith('/rest/v1/rpc/get_profile')) return send(200, { id: owner, name: 'Event operator', avatar:'🐱',level:100,drinksPerWeek:7,role:'gamer',sugarPassAvailable:true });
  if (path.endsWith('/rest/v1/event_results')) {
    if (failure === 'hang') return setTimeout(() => send(503, { message:'delayed' }), 15000);
    if (failure === 'error') return send(503, { message:'test unavailable',code:'503' });
    if (req.method === 'GET') return send(200, [...rows.values()].sort((a,b) => b.total-a.total));
    if (req.method === 'POST') {
      const r = JSON.parse(body);
      if (!r.id || !r.team?.trim() || r.team.length>60 || r.operator_id!==owner || r.scores?.length!==4 || r.total!==r.scores.reduce((a,b) => a+b,0)) return send(400, { message:'contract violation' });
      if (!rows.has(r.id)) rows.set(r.id,{...r,created_at:new Date().toISOString()});
      res.writeHead(201); return res.end();
    }
  }
  send(501, { message:'Endpoint outside event test contract' });
}).listen(process.env.PORT);
