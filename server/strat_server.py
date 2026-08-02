#!/usr/bin/env python3
"""StratServer — jeu de stratégie territoriale multijoueur"""

import asyncio, json, os, hashlib, secrets, sqlite3, time, math, random
from http.server import SimpleHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from pathlib import Path
from urllib.parse import urlparse
import websockets
from websockets.asyncio.server import serve
from websockets.http11 import Response
from websockets.datastructures import Headers

PORT_HTTP = int(os.environ.get("PORT", 8080))
PORT_WS = int(os.environ.get("PORT_WS", 8081))
_WS_INTERNAL_PORT = 8081
ROOT = Path(__file__).resolve().parent.parent

# ─── Territory data (world map — single source: server/worldmap.py) ──────
from worldmap import EMPIRE_DATA, TERRITORIES

# ─── Game state ────────────────────────────────────────────────────
class StratGame:
    def __init__(self):
        self.players = {}       # pid -> {name, gold, food, wood, stone, ready, conn}
        self.turn = 0
        self.phase = 'waiting'  # waiting | playing | done
        self.territories = {}   # tid -> {owner, army, pop, grid, buildings}
        for t in TERRITORIES:
            self.territories[t['id']] = {
                'name': t['name'], 'lon': t['lon'], 'lat': t['lat'],
                'cap': t.get('cap', False), 'adj': t['adj'], 'home': t.get('home'),
                'owner': None, 'army': 0, 'pop': 0, 'grid': None, 'buildings': []
            }

    def to_dict(self, pid=None):
        d = {
            'turn': self.turn, 'phase': self.phase,
            'players': {k: {kk:vv for kk,vv in v.items() if kk!='conn'}
                       for k,v in self.players.items()},
            'territories': {k:{kk:vv for kk,vv in v.items() if kk not in ('adj','home')}
                          for k,v in self.territories.items()},
            'empires': self._empires_dict(),
        }
        if pid:
            me = self.players.get(pid, {})
            d['you'] = pid
            d['your_empire'] = me.get('empire', 'carthage')
            d['your_turn'] = (self.phase == 'playing' and
                             list(self.players.keys()).index(pid) == self.turn % max(1, len(self.players)))
        return d

    # ─── Empire helpers ────────────────────────────────────────────
    def _empire_of(self, pid):
        return self.players.get(pid, {}).get('empire', 'carthage')

    def _empire_pids(self, empire):
        return [pid for pid, p in self.players.items() if p.get('empire') == empire]

    def _player_army(self, pid):
        return sum(t['army'] for t in self.territories.values() if t['owner'] == pid)

    def _player_pop(self, pid):
        return sum(t.get('pop', 0) for t in self.territories.values() if t['owner'] == pid)

    def _empire_army(self, empire):
        return sum(self._player_army(pid) for pid in self._empire_pids(empire))

    def _empire_pop(self, empire):
        return sum(self._player_pop(pid) for pid in self._empire_pids(empire))

    def _empire_pids_except(self, empire, except_pid):
        return [pid for pid in self._empire_pids(empire) if pid != except_pid]

    def _empires_dict(self):
        out = {}
        for eid, info in EMPIRE_DATA.items():
            pids = self._empire_pids(eid)
            if pids:
                out[eid] = {
                    'name': info['name'], 'capital': info['capital'],
                    'color': info['color'], 'icon': info['icon'],
                    'players': pids,
                    'pop': self._empire_pop(eid),
                    'army': self._empire_army(eid),
                }
        return out

    def _take_army(self, pid, amount):
        """Retire `amount` soldats au joueur, proportionnellement à ses territoires."""
        owned = [t for t in self.territories.values() if t['owner'] == pid and t['army'] > 0]
        total = sum(t['army'] for t in owned)
        if total <= 0 or amount <= 0:
            return
        taken = 0
        for t in owned:
            share = min(t['army'], int(t['army'] * amount / total))
            t['army'] -= share
            taken += share
        rem = amount - taken
        for t in owned:
            if rem <= 0:
                break
            take = min(rem, t['army'])
            t['army'] -= take
            rem -= take

    def _empire_setup(self, eid, pids):
        """Give one empire its capital + home territories, split round-robin among members"""
        info = EMPIRE_DATA.get(eid)
        if not info or not pids:
            return
        cap_tid = info['capital']
        cap_t = self.territories[cap_tid]
        cap_t['owner'] = pids[0]
        cap_t['army'] = 100
        cap_t['pop'] = 5000
        cap_t['grid'] = self._make_grid()
        cap_t['home'] = eid
        home_tids = [tid for tid, t in self.territories.items() if t.get('home') == eid]
        rest = [tid for tid in home_tids if tid != cap_tid]
        for i, tid in enumerate(rest):
            t = self.territories[tid]
            t['owner'] = pids[i % len(pids)]
            t['army'] = 100
            t['pop'] = 1000
            t['grid'] = self._make_grid()

    def distribute(self):
        """Give starting territories per empire, split round-robin among members"""
        groups = {}
        for pid, p in self.players.items():
            groups.setdefault(p.get('empire', 'carthage'), []).append(pid)

        for eid, pids in groups.items():
            self._empire_setup(eid, pids)

        # Give all players starting gold/food
        for p in self.players.values():
            p['gold'] = 100
            p['food'] = 100
        self.phase = 'playing'

    def admit(self, pid):
        """Late join: re-split the empire's home territories among its members"""
        p = self.players.get(pid)
        if not p:
            return
        p['gold'] = 100
        p['food'] = 100
        empire = p.get('empire', 'carthage')
        members = self._empire_pids(empire)
        if len(members) < 2:
            return
        # Brand-new empire joining mid-game: full setup from scratch
        owns_home = any(t['owner'] in members for t in self.territories.values()
                        if t.get('home') == empire)
        if not owns_home:
            self._empire_setup(empire, members)
            return
        cap = EMPIRE_DATA.get(empire, {}).get('capital')
        home_owned = [tid for tid, t in self.territories.items()
                      if t.get('home') == empire and t['owner'] in members]
        rest = [tid for tid in home_owned if tid != cap]
        for i, tid in enumerate(rest):
            self.territories[tid]['owner'] = members[i % len(members)]
        if cap is not None and self.territories[cap].get('home') == empire:
            self.territories[cap]['owner'] = members[0]

    def _make_grid(self):
        """8x8 interior grid"""
        return [[None]*8 for _ in range(8)]

    def process(self, pid, cmd, data):
        if cmd == 'state':
            return self.to_dict(pid)
        if cmd == 'ready' and self.phase == 'playing':
            p = self.players.get(pid)
            if p: p['ready'] = True
            if all(p.get('ready') for p in self.players.values()):
                self._next_turn()
                return None  # _next_turn already broadcast
            return self.to_dict(pid)
        return self._action(pid, cmd, data)

    def _action(self, pid, cmd, data):
        tid = data.get('tid')
        t = self.territories.get(tid)
        if not t or t['owner'] != pid:
            return {'error': 'Pas votre territoire'}
        me = self.players[pid]
        my_empire = me.get('empire', 'carthage')

        if cmd == 'recruit':
            amt = data.get('amount', 50)
            cost = amt // 2
            if (me['gold'] or 0) < cost:
                return {'error': 'Or insuffisant'}
            me['gold'] = me.get('gold', 0) - cost
            t['army'] = t.get('army', 0) + amt
            return {'ok': True, **self.to_dict(pid)}

        if cmd == 'attack':
            to_tid = data.get('to')
            to_t = self.territories.get(to_tid)
            if not to_t:
                return {'error': 'Territoire inconnu'}
            if to_t['owner'] and self._empire_of(to_t['owner']) == my_empire:
                return {'error': 'Territoire allié (même empire)'}
            if t['army'] < 10:
                return {'error': 'Pas assez de soldats'}

            # Attacker commits 70% of the source territory + up to 20% of each ally's army
            atk = int(t['army'] * 0.7)
            t['army'] -= atk
            atk_assist = 0
            for ally_pid in self._empire_pids_except(my_empire, pid):
                take = int(self._player_army(ally_pid) * 0.2)
                if take > 0:
                    self._take_army(ally_pid, take)
                    atk_assist += take
            atk += atk_assist

            def_power = to_t['army'] * (1 + to_t.get('fort', 0) * 0.2)
            def_assist = 0
            if to_t['owner'] and to_t['owner'] in self.players:
                for ally_pid in self._empire_pids_except(self._empire_of(to_t['owner']), to_t['owner']):
                    take = int(self._player_army(ally_pid) * 0.2)
                    if take > 0:
                        self._take_army(ally_pid, take)
                        def_assist += take
            def_power += def_assist

            atk_power = atk * (0.8 + 0.4 * random.random())
            if atk_power > def_power:
                old_owner = to_t['owner']
                to_t['owner'] = pid
                to_t['army'] = max(1, atk - to_t['army'])
                if not to_t['grid']:
                    to_t['grid'] = self._make_grid()
                self._broadcast({'action':'battle','battle':{
                    'territory':to_t['name'],'attackerWins':True,
                    'attacker':pid,'defender':old_owner,
                    'fromTid':tid,'toTid':to_tid,
                    'atkLosses':atk - t['army'],'defLosses':to_t['army'],
                    'atkAssist':atk_assist,'defAssist':def_assist
                }})
            else:
                self._broadcast({'action':'battle','battle':{
                    'territory':to_t['name'],'attackerWins':False,
                    'attacker':pid,'defender':to_t['owner'],
                    'fromTid':tid,'toTid':to_tid,
                    'atkLosses':atk,'defLosses':int(def_power * 0.3),
                    'atkAssist':atk_assist,'defAssist':def_assist
                }})
            asyncio.create_task(self._send_personalized())
            return {'ok': True, **self.to_dict(pid)}

        if cmd == 'build':
            bid = data.get('building')
            gx, gy = data.get('gx', 0), data.get('gy', 0)
            grid = t['grid']
            if not grid or gx < 0 or gy < 0 or gx >= 8 or gy >= 8:
                return {'error': 'Position invalide'}
            if grid[gy][gx] is not None:
                return {'error': 'Case occupée'}
            costs = {'house':{'gold':30,'wood':20},'farm':{'gold':20},
                     'wall':{'stone':25},'barracks':{'gold':80,'wood':40},
                     'market':{'gold':50,'wood':30},'temple':{'gold':60,'stone':30},
                     'port':{'gold':100,'wood':80}}
            c = costs.get(bid)
            if not c: return {'error': 'Bâtiment inconnu'}
            for res, amt in c.items():
                if me.get(res, 0) < amt:
                    return {'error': f'{res} insuffisant'}
            for res, amt in c.items():
                me[res] = me.get(res, 0) - amt
            grid[gy][gx] = bid
            if bid == 'house': t['pop'] = (t.get('pop',0) or 0) + 500
            if bid == 'farm': me['food'] = me.get('food',0) + 15
            if bid == 'market': me['gold'] = me.get('gold',0) + 10
            if bid == 'wall': t['fort'] = t.get('fort',0) + 1
            if bid == 'barracks': me['army_rate'] = me.get('army_rate',0) + 2
            return {'ok': True, **self.to_dict(pid)}

        if cmd == 'move':
            to_tid = data.get('to')
            to_t = self.territories.get(to_tid)
            if not to_t or not to_t['owner'] or self._empire_of(to_t['owner']) != my_empire:
                return {'error': 'Territoire non possédé'}
            if to_tid == tid:
                return {'error': 'Même territoire'}
            amt = data.get('amount', 50)
            if t['army'] < amt:
                return {'error': 'Pas assez de soldats'}
            t['army'] -= amt
            to_t['army'] = to_t.get('army',0) + amt
            self._broadcast({'action':'move','move':{
                'fromTid':tid,'toTid':to_tid,'amount':amt}})
            asyncio.create_task(self._send_personalized())
            return {'ok': True, **self.to_dict(pid)}

        return {'error': 'Commande inconnue'}

    def _next_turn(self):
        self.turn += 1
        for p in self.players.values():
            p['ready'] = False
            n_terr = sum(1 for t in self.territories.values() if t['owner'] == p.get('_pid'))
            p['gold'] = p.get('gold',0) + 20 + n_terr * 5
            p['food'] = p.get('food',0) + 10 + n_terr * 3
        for t in self.territories.values():
            if t['owner']:
                growth = max(1, int(t.get('pop', 0) / 200))
                t['army'] = t.get('army', 0) + growth
        # Check win
        pids = list(self.players.keys())
        for pid in pids:
            owns_cap = [tid for tid,t in self.territories.items()
                       if t['owner']==pid and t.get('cap')]
            if len(owns_cap) >= 3:
                self._broadcast({'action':'game_over','winner':pid,
                                'winnerName':self.players[pid].get('name','?')})
        asyncio.create_task(self._send_personalized())

    def _broadcast(self, msg):
        msg_s = json.dumps(msg)
        for p in self.players.values():
            conn = p.get('conn')
            if conn:
                asyncio.create_task(self._safe_send(conn, msg_s))
    
    async def _send_personalized(self, exclude_conn=None):
        for p_id, p_data in self.players.items():
            c = p_data.get('conn')
            if c and c is not exclude_conn:
                msg = json.dumps({'action':'state','state':self.to_dict(p_id)})
                await self._safe_send(c, msg)

    async def _safe_send(self, conn, msg):
        try: await conn.send(msg)
        except Exception as e:
            print(f'ws error: {e}', flush=True)

game = StratGame()

# ─── Auth DB ───────────────────────────────────────────────────────
DB_PATH = ROOT / 'server' / 'strat.db'
def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute('CREATE TABLE IF NOT EXISTS users (user TEXT PRIMARY KEY, pass TEXT)')
    conn.commit(); conn.close()

def register(user, pwd):
    conn = sqlite3.connect(str(DB_PATH))
    try:
        conn.execute('INSERT INTO users VALUES (?,?)', (user, hashlib.sha256(pwd.encode()).hexdigest()))
        conn.commit(); conn.close(); return True
    except: conn.close(); return False

def login(user, pwd):
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.execute('SELECT pass FROM users WHERE user=?', (user,))
    r = c.fetchone()
    conn.close()
    return r and r[0] == hashlib.sha256(pwd.encode()).hexdigest()

# ─── HTTP handler ──────────────────────────────────────────────────
MIME_TYPES = {'.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json',
              '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
              '.ico':'image/x-icon', '.webp':'image/webp', '.txt':'text/plain'}

def _static_response(path):
    """Serve a static file from ROOT. Returns (status, content_type, body)."""
    clean = urlparse(path).path
    if clean.startswith('/'):
        clean = clean[1:]
    if not clean:
        clean = 'index.html'
    fp = (ROOT / clean).resolve()
    if fp.is_dir():
        fp = fp / 'index.html'
    if not str(fp).startswith(str(ROOT)):
        return 403, 'text/plain', b'Forbidden'
    if not fp.is_file():
        return 404, 'text/plain; charset=utf-8', b'Not Found'
    body = fp.read_bytes()
    ctype = MIME_TYPES.get(fp.suffix, 'application/octet-stream')
    if fp.suffix == '.html':
        ctype = 'text/html; charset=utf-8'
    return 200, ctype, body

# ─── Unified HTTP+WS server (single port) ─────────────────────────
async def _read_request(reader):
    """Read an HTTP request head + body. Returns (request_line, header_lines, body) or None."""
    head = b''
    while b'\r\n\r\n' not in head:
        chunk = await reader.read(4096)
        if not chunk:
            return None
        head += chunk
        if len(head) > 65536:
            return None
    head_bytes, _, rest = head.partition(b'\r\n\r\n')
    lines = head_bytes.split(b'\r\n')
    if not lines or not lines[0]:
        return None
    request_line = lines[0].decode('latin-1', 'replace')
    header_lines = [l.decode('latin-1', 'replace') for l in lines[1:]]
    clen = 0
    for l in header_lines:
        if l.lower().startswith('content-length:'):
            try:
                clen = int(l.split(':', 1)[1].strip())
            except Exception:
                clen = 0
    body = rest
    while len(body) < clen:
        chunk = await reader.read(clen - len(body))
        if not chunk:
            break
        body += chunk
    return request_line, header_lines, body

async def _http_respond(writer, status, ctype, body_bytes):
    reasons = {200: 'OK', 400: 'Bad Request', 403: 'Forbidden', 404: 'Not Found',
               500: 'Internal Server Error'}
    reason = reasons.get(status, 'OK')
    head = (f'HTTP/1.1 {status} {reason}\r\n'
            f'Content-Type: {ctype}\r\n'
            f'Content-Length: {len(body_bytes)}\r\n'
            f'Access-Control-Allow-Origin: *\r\n'
            f'Connection: close\r\n\r\n')
    writer.write(head.encode('latin-1') + body_bytes)
    await writer.drain()

async def _pipe_forever(reader, writer):
    try:
        while True:
            data = await reader.read(65536)
            if not data:
                break
            writer.write(data)
            await writer.drain()
    except Exception:
        pass
    finally:
        try:
            writer.close()
        except Exception:
            pass

async def _handle_unified(reader, writer):
    try:
        req = await _read_request(reader)
        if req is None:
            return
        request_line, header_lines, body = req
        parts = request_line.split(' ')
        if len(parts) < 3:
            return
        method, path = parts[0], parts[1]
        headers = {}
        for l in header_lines:
            if ':' in l:
                k, v = l.split(':', 1)
                headers[k.strip().lower()] = v.strip()

        if headers.get('upgrade', '').lower() == 'websocket':
            # Proxy the raw handshake to the internal WebSocket server
            raw = request_line.encode('latin-1') + b'\r\n'
            for l in header_lines:
                raw += l.encode('latin-1') + b'\r\n'
            raw += b'\r\n' + body
            r2, w2 = await asyncio.open_connection('127.0.0.1', _WS_INTERNAL_PORT)
            w2.write(raw)
            await w2.drain()
            await asyncio.gather(_pipe_forever(reader, w2), _pipe_forever(r2, writer))
            return

        clean = urlparse(path).path
        if method == 'POST':
            try:
                data = json.loads(body.decode('utf-8')) if body else {}
            except Exception:
                data = {}
            if clean == '/api/register':
                try:
                    ok = register(data.get('username', ''), data.get('password', ''))
                    await _http_respond(writer, 200, 'application/json', json.dumps(
                        {'ok': ok, 'error': '' if ok else 'Utilisateur existe deja'}).encode())
                except Exception as e:
                    await _http_respond(writer, 400, 'application/json', json.dumps(
                        {'ok': False, 'error': 'Requete invalide'}).encode())
            elif clean == '/api/login':
                try:
                    if login(data.get('username', ''), data.get('password', '')):
                        tok = secrets.token_hex(16)
                        await _http_respond(writer, 200, 'application/json', json.dumps(
                            {'ok': True, 'token': tok, 'username': data.get('username', '')}).encode())
                    else:
                        await _http_respond(writer, 200, 'application/json', json.dumps(
                            {'ok': False, 'error': 'Identifiants incorrects'}).encode())
                except Exception:
                    await _http_respond(writer, 400, 'application/json', json.dumps(
                        {'ok': False, 'error': 'Requete invalide'}).encode())
            else:
                await _http_respond(writer, 404, 'application/json', b'{"error":"not found"}')
            return

        status, ctype, body_bytes = _static_response(path)
        await _http_respond(writer, status, ctype, body_bytes)
    except Exception as e:
        try:
            await _http_respond(writer, 500, 'text/plain', str(e).encode())
        except Exception:
            pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)
    def log_message(self, *a): pass
    def guess_type(self, path):
        ext = Path(path).suffix
        return MIME_TYPES.get(ext) or super().guess_type(path)
    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/api/register':
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            ok = register(body['username'], body['password'])
            self._json({'ok':ok, 'error':'' if ok else 'Utilisateur existe deja'})
        elif path == '/api/login':
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            if login(body['username'], body['password']):
                tok = secrets.token_hex(16)
                self._json({'ok':True, 'token':tok, 'username':body['username']})
            else:
                self._json({'ok':False, 'error':'Identifiants incorrects'})
        else:
            self.send_error(404)
    def _json(self, d):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(d).encode())

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

# ─── WebSocket ─────────────────────────────────────────────────────
_pid_counter = 0

async def ws_handler(conn):
    global _pid_counter
    pid = None
    try:
        async for msg in conn:
            data = json.loads(msg)
            action = data.get('action')
            if action == 'join':
                name = data.get('name', 'Anonyme')
                empire = data.get('empire', 'carthage')
                if empire not in EMPIRE_DATA:
                    empire = 'carthage'
                _pid_counter += 1
                pid = f'p{_pid_counter}'
                game.players[pid] = {'name':name, '_pid':pid, 'conn':conn, 'empire':empire,
                    'gold':0, 'food':0, 'wood':0, 'stone':0, 'ready':False}
                if len(game.players) >= 2 and game.phase == 'waiting':
                    game.distribute()
                    await game._send_personalized(exclude_conn=conn)
                    await conn.send(json.dumps({'action':'state','state':game.to_dict(pid)}))
                elif game.phase == 'playing':
                    game.admit(pid)
                    await game._send_personalized(exclude_conn=conn)
                    await conn.send(json.dumps({'action':'state','state':game.to_dict(pid)}))
                else:
                    await conn.send(json.dumps({'action':'state','state':game.to_dict(pid)}))
            elif action == 'cmd' and pid:
                print(f'[cmd] {pid} {data.get("cmd","")} {data.get("data",{})}', flush=True)
                result = game.process(pid, data.get('cmd',''), data.get('data',{}))
                if result is not None:
                    if isinstance(result, dict) and 'error' in result:
                        print(f'[cmd] -> error: {result["error"]}', flush=True)
                        await conn.send(json.dumps({'action':'error','error':result['error']}))
                    else:
                        print(f'[cmd] -> state ok', flush=True)
                        await conn.send(json.dumps({'action':'state','state':result}))
    except:
        import traceback; traceback.print_exc()
    finally:
        if pid and pid in game.players:
            del game.players[pid]
        if not game.players:
            game.phase = 'waiting'
            for t in game.territories.values():
                t['owner'] = None
                t['army'] = 0
                t['pop'] = 0
                t['home'] = None

async def main():
    init_db()
    mode = os.environ.get('MODE') or ('single' if os.environ.get('PORT') else 'both')
    port_ws = int(os.environ.get('PORT_WS', os.environ.get('PORT', 8081)))

    if mode in ('both', 'http'):
        httpd = ThreadedHTTPServer(('0.0.0.0', PORT_HTTP), Handler)
        import threading
        t = threading.Thread(target=httpd.serve_forever, daemon=True)
        t.start()
        print(f'StratServer: HTTP on :{PORT_HTTP}')
        if mode == 'http':
            await asyncio.Future()
            return

    if mode == 'single':
        global _WS_INTERNAL_PORT
        _WS_INTERNAL_PORT = port_ws if port_ws != PORT_HTTP else PORT_HTTP + 1
        print(f'StratServer: HTTP+WS unified on :{PORT_HTTP} (WS proxy -> :{_WS_INTERNAL_PORT})')

        async def serve_unified():
            async with serve(ws_handler, '127.0.0.1', _WS_INTERNAL_PORT):
                server = await asyncio.start_server(_handle_unified, '0.0.0.0', PORT_HTTP)
                async with server:
                    await server.serve_forever()
        await serve_unified()

    if mode in ('both', 'ws'):
        async def process_request(connection, request):
            if request.headers.get('Upgrade', '').lower() != 'websocket':
                return Response(200, 'OK', Headers(), b'ok')
            return None

        print(f'StratServer: WS on :{port_ws}')
        async with serve(ws_handler, '0.0.0.0', port_ws, process_request=process_request):
            await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())
