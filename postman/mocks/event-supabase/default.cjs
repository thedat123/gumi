// Local test double for the event_results contract in 0041_event_games.sql.
// Auth is synthetic; this does not claim to reproduce Supabase RLS.
const http = require('http');
const rows = new Map();
let failure = 'none';
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
  if (path.endsWith('/__test/control') && req.method === 'POST') { failure = JSON.parse(body).failure; return send(200, { failure }); }
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
