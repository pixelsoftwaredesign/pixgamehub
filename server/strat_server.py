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
from strat_engine import StrategyEngine, load_config

# ─── Game state ────────────────────────────────────────────────────
# ─── StratGame = moteur configuré (configs/strat.json) ─────────────
class StratGame(StrategyEngine):
    """Le jeu Strat est le moteur générique piloté par config JSON.
    Les algorithmes (combat pierre-feuille-ciseaux, siège, terrains,
    empires, économie, tours) vivent dans strat_engine.py et sont
    réutilisables pour créer d'autres jeux de stratégie."""

    def __init__(self):
        super().__init__(load_config('strat'))


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
            f'Cache-Control: no-cache, no-store, must-revalidate\r\n'
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
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()
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
_last_pid = {}

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
                # Reconnect: reuse the last pid for this name so ownership is kept
                last = _last_pid.get(name)
                if last is not None:
                    pid = last
                else:
                    _pid_counter += 1
                    pid = f'p{_pid_counter}'
                _last_pid[name] = pid
                old = game.players.get(pid)
                if old:
                    # même joueur (autre dispositif): garde empire, soldats et ressources
                    empire = old.get('empire', empire)
                    gold, food, wood, stone = old['gold'], old['food'], old['wood'], old['stone']
                else:
                    gold = food = wood = stone = 0
                game.players[pid] = {'name':name, '_pid':pid, 'conn':conn, 'empire':empire,
                    'gold':gold, 'food':food, 'wood':wood, 'stone':stone, 'ready':False}
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
        if pid and pid in game.players and game.players[pid].get('conn') is conn:
            del game.players[pid]
        if not game.players:
            game.phase = 'waiting'
            game.wars.clear()
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
