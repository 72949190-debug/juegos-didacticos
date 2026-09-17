const rooms = globalThis.__riskArcadeRooms || (globalThis.__riskArcadeRooms = new Map());
const games = ['laberinto','carrera','tesoro'];
const dirs = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const clean = n => String(n || 'Jugador').trim().slice(0,18) || 'Jugador';
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const fresh = (code, game, host, nick) => ({code,game,host,hostNick:nick,status:'lobby',question:0,updatedAt:Date.now(),players:[]});
const send = (res, data, status=200) => res.status(status).json(data);

export default async function handler(req,res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const parts = Array.isArray(req.query.path) ? req.query.path : String(req.query.path||'').split('/');
  const action = parts[1] || 'get';
  if (parts[0] === 'create' && req.method === 'POST') {
    const b = req.body || {}; if (!games.includes(b.game)) return send(res,{error:'Juego no válido'},400);
    let code; do { code=Math.random().toString(36).slice(2,8).toUpperCase(); } while (rooms.has(code));
    const host=uid(), room=fresh(code,b.game,host,clean(b.nick)); rooms.set(code,room);
    return send(res,{code,playerId:host,role:'spectator',room});
  }
  const code = String(parts[0]||'').toUpperCase(), room=rooms.get(code);
  if (!room) return send(res,{error:'Sala no encontrada'},404);
  if (req.method === 'GET') return send(res,{room});
  const b=req.body||{};
  if (action==='join') { if(room.status!=='lobby') return send(res,{error:'La partida ya comenzó'},409); if(room.players.length>=3) return send(res,{error:'Sala llena: máximo 3 jugadores'},409); const pid=uid(); room.players.push({id:pid,nick:clean(b.nick),score:0,x:11,y:11,answer:null}); return send(res,{code,playerId:pid,role:'player',room}); }
  if (action==='start') { if(b.playerId!==room.host) return send(res,{error:'Solo el creador puede iniciar'},403); room.status='playing'; return send(res,{room}); }
  const p=room.players.find(x=>x.id===b.playerId); if(!p) return send(res,{error:'Jugador no pertenece a esta sala'},403);
  if(action==='move'){const d=dirs[b.dir]; if(!d)return send(res,{error:'Dirección inválida'},400); p.x=Math.max(0,Math.min(22,p.x+d[0]));p.y=Math.max(0,Math.min(12,p.y+d[1]));return send(res,{room});}
  if(action==='answer'){if(room.status!=='playing'||b.question!==room.question)return send(res,{room}); if(p.answer!==null)return send(res,{room});p.answer=Number.isInteger(b.answer)?b.answer:null; if(p.answer===[0,2,3][room.question])p.score+=100; if(room.players.every(x=>x.answer!==null)){room.question++;room.players.forEach(x=>x.answer=null);if(room.question>=3)room.status='finished';} return send(res,{room});}
  return send(res,{error:'Ruta no encontrada'},404);
}

