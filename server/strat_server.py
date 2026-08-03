#!/usr/bin/env python3
"""StratServer — jeu de stratégie territoriale multijoueur"""

import asyncio, json, os, hashlib, secrets, sqlite3, time, math, random, re
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
from strat_engine import (StrategyEngine, load_config, save_config,
                          config_path, CONFIGS_DIR, default_strat_config)

# ─── Game state ────────────────────────────────────────────────────
# ─── StratGame = moteur configuré (configs/strat.json) ─────────────
class StratGame(StrategyEngine):
    """Le jeu Strat est le moteur générique piloté par config JSON.
    Les algorithmes (combat pierre-feuille-ciseaux, siège, terrains,
    empires, économie, tours) vivent dans strat_engine.py et sont
    réutilisables pour créer d'autres jeux de stratégie."""

    def __init__(self):
        super().__init__(load_config('strat'))


# ─── Rooms : un moteur par jeu configuré (configs/*.json) ──────────────
GAME_ROOMS = {}
_GID_RE = re.compile(r'^[A-Za-z0-9_-]{1,40}$')

def _gid_ok(gid):
    return bool(gid) and _GID_RE.fullmatch(gid) is not None


def _get_room(gid):
    if not _gid_ok(gid):
        gid = 'strat'
    if gid not in GAME_ROOMS:
        GAME_ROOMS[gid] = StrategyEngine(load_config(gid))
    return GAME_ROOMS[gid]


game = _get_room('strat')

# ─── Auth DB ───────────────────────────────────────────────────────
DB_PATH = ROOT / 'server' / 'strat.db'
def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute('CREATE TABLE IF NOT EXISTS users (user TEXT PRIMARY KEY, pass TEXT)')
    conn.execute('''CREATE TABLE IF NOT EXISTS api_keys (
        key_private TEXT PRIMARY KEY, key_public TEXT UNIQUE,
        game TEXT, name TEXT, created REAL)''')
    conn.commit(); conn.close()

# ─── API keys (clé privée = écriture, clé publique = partage/lecture) ──
def create_api_key(game, name):
    kp = 'phg_priv_' + secrets.token_hex(16)
    kpub = 'phg_pub_' + secrets.token_hex(16)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute('INSERT INTO api_keys VALUES (?,?,?,?,?)',
                 (kp, kpub, game or '', name or '', time.time()))
    conn.commit(); conn.close()
    return {'privateKey': kp, 'publicKey': kpub, 'game': game or '', 'name': name or ''}

def valid_private_key(key):
    if not key:
        return False
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.execute('SELECT 1 FROM api_keys WHERE key_private=?', (key,))
    ok = c.fetchone() is not None
    conn.close()
    return ok

def valid_public_key(key):
    if not key:
        return False
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.execute('SELECT 1 FROM api_keys WHERE key_public=?', (key,))
    ok = c.fetchone() is not None
    conn.close()
    return ok

def list_api_keys():
    conn = sqlite3.connect(str(DB_PATH))
    rows = conn.execute('SELECT key_public, game, name, created FROM api_keys ORDER BY created').fetchall()
    conn.close()
    return [{'publicKey': r[0], 'game': r[1], 'name': r[2], 'created': r[3]} for r in rows]

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

# ─── Studio API : listes / sauvegarde des configs de jeux ────────────────
_STUDIO_GID_RE = _GID_RE

def _api_key_from(data):
    """Extrait une clé API de la requête (body ou headers, normalisé)."""
    if isinstance(data, dict):
        return data.get('apiKey') or data.get('api_key') or data.get('privateKey')
    return data

def _studio_api(op, gid, data, api_key=None):
    """Studio config endpoints. Returns (status, content_type, bytes).
    Écriture (POST/DELETE/GENERATE) → clé privée requise. Lecture → public."""
    def _json(obj, code=200):
        return code, 'application/json', json.dumps(obj, ensure_ascii=False).encode()
    if op == 'LIST':
        games = []
        CONFIGS_DIR.mkdir(parents=True, exist_ok=True)
        for p in sorted(CONFIGS_DIR.glob('*.json')):
            try:
                cfg = json.loads(p.read_text(encoding='utf-8'))
            except Exception:
                continue
            games.append({'id': cfg.get('id') or p.stem, 'name': cfg.get('name', p.stem),
                          'icon': cfg.get('icon', '🎮'), 'genre': cfg.get('genre', 'Stratégie')})
        return _json({'games': games})
    if op == 'KEYS':
        return _json(create_api_key((data or {}).get('game', ''), (data or {}).get('name', '')))
    if op == 'LISTKEYS':
        return _json({'keys': list_api_keys()})
    if op == 'GENERATE':
        if not valid_private_key(api_key):
            return _json({'error': 'Clé privée requise (X-Api-Key)'}, 401)
        cfg = generate_config((data or {}).get('prompt', ''))
        base = re.sub(r'[^A-Za-z0-9]+', '', (cfg.get('name') or 'jeu')).lower()[:24] or 'jeu'
        cfg['id'] = base
        n = 2
        while config_path(cfg['id']).is_file():
            cfg['id'] = base + str(n)
            n += 1
        return _json({'config': cfg, 'generatedFrom': (data or {}).get('prompt', '')})
    if not gid or not _STUDIO_GID_RE.match(gid):
        return _json({'error': 'Identifiant invalide'}, 400)
    if op == 'GET':
        p = config_path(gid)
        if not p.is_file():
            return _json({'error': 'Config introuvable'}, 404)
        try:
            return _json(json.loads(p.read_text(encoding='utf-8')))
        except Exception as e:
            return _json({'error': str(e)}, 500)
    if op == 'DELETE':
        if not valid_private_key(api_key):
            return _json({'error': 'Clé privée requise (X-Api-Key)'}, 401)
        p = config_path(gid)
        if not p.is_file():
            return _json({'error': 'Config introuvable'}, 404)
        p.unlink()
        GAME_ROOMS.pop(gid, None)
        return _json({'ok': True, 'deleted': gid})
    if op == 'POST':
        if not valid_private_key(api_key):
            return _json({'error': 'Clé privée requise (X-Api-Key)'}, 401)
        if not isinstance(data, dict) or not data.get('id'):
            return _json({'error': 'Config invalide (id requis)'}, 400)
        data['id'] = gid
        try:
            save_config(gid, data)
            GAME_ROOMS[gid] = StrategyEngine(load_config(gid))  # recharge la salle
            return _json({'ok': True, 'id': gid})
        except Exception as e:
            return _json({'error': str(e)}, 500)
    return _json({'error': 'unknown'}, 404)


# ─── Création agentic : génère une config à partir d'une description ──
def generate_config(prompt):
    """Génère une config de jeu à partir d'une description en français.
    Heuristique (aucun LLM externe) : détecte thèmes, nombre, vitesse, carte."""
    p = (prompt or '').lower()
    cfg = default_strat_config()

    def has(*words):
        return any(w in p for w in words)

    # Carte : mini vs monde
    if has('petit', 'mini', 'rapide', 'court', 'duel', '1v1'):
        mini = True
    else:
        mini = False

    # Noms des empires extraits du texte (mots en capitales)
    names = []
    for w in re.findall(r'[A-ZÀ-Þ][a-zà-ÿ]{2,}', prompt or ''):
        w = w.rstrip('s')
        low = w.lower()
        if low not in ('le', 'la', 'les', 'des', 'une', 'jeu', 'jeux', 'de', 'du') and w not in names:
            names.append(w)
        if len(names) >= 4:
            break
    if not names:
        names = ['Aurore', 'Borée', 'Cobalt', 'Drakar']

    if mini:
        from strat_engine import _mini_map
        mm = _mini_map(names)
        cfg['territories'] = mm['territories']
        cfg['empires'] = mm['empires']
        cfg['name'] = _title(prompt) or 'Mini Conquête'
        cfg['icon'] = '⚔️'
        cfg['genre'] = 'Stratégie rapide'
    else:
        cfg['name'] = _title(prompt) or 'Strat'
        # renomme les empires affichés (garde ids/capitales du monde)
        eids = list(cfg['empires'].keys())
        for i, eid in enumerate(eids):
            cfg['empires'][eid]['name'] = names[i % len(names)]

    # Nombre de capitales pour gagner (nombre extrait du texte, sinon défaut)
    nums = re.findall(r'\d+', p)
    if nums:
        win_n = max(1, min(10, int(nums[0])))
    elif has('rapide', 'duel', '1v1'):
        win_n = 1 if has('duel', '1v1') else 2
    elif has('épique', 'immense', 'longue', 'long'):
        win_n = 6
    else:
        win_n = 3
    cfg['win']['capitals'] = win_n

    # Thèmes → unités / terrains / économie
    if has('magie', 'mage', 'sorcier', 'fantastique', 'wizard'):
        cfg['units']['mage'] = {'name': 'Mage', 'icon': '🧙', 'a': 4.0, 'd': 3.0, 'cost': 4}
        for row in cfg['counters'].values():
            row['mage'] = 1.0
        cfg['counters']['mage'] = {u: 1.0 for u in cfg['units']}
    if has('feu', 'dragon', 'flamme'):
        cfg['units']['dragon'] = {'name': 'Dragon', 'icon': '🐉', 'a': 7.0, 'd': 5.0, 'cost': 8}
        for row in cfg['counters'].values():
            row['dragon'] = 1.0
        cfg['counters']['dragon'] = {u: 1.0 for u in cfg['units']}
    if has('naval', 'océan', 'mer', 'île', 'ile', 'pirate', 'flotte'):
        cfg['units']['navy']['cost'] = 2
        cfg['terrain_gen']['coastal_prob'] = 0.92
        cfg['icon'] = '🚢'
    if has('forêt', 'foret', 'elfe', 'elf', 'jungle'):
        cfg['terrain_gen']['min_forest'] = 6
        cfg['terrain_gen']['max_forest'] = 10
    if has('désert', 'desert', 'sable', 'nomade'):
        cfg['terrain_gen']['water_ratio'] = 0.15
        cfg['terrain_gen']['coastal_prob'] = 0.3
    if has('techno', 'robot', 'cyber', 'futur', 'sf', 'mécha'):
        cfg['units'] = {
            'soldier': {'name': 'Bot', 'icon': '🤖', 'a': 1.0, 'd': 1.0, 'cost': 1},
            'drone': {'name': 'Drone', 'icon': '🛸', 'a': 2.5, 'd': 1.5, 'cost': 2},
            'tank': {'name': 'Tank', 'icon': '🚀', 'a': 5.0, 'd': 4.0, 'cost': 5},
            'navy': {'name': 'Croiseur', 'icon': '⛴️', 'a': 2.0, 'd': 2.0, 'cost': 4},
        }
        cfg['counters'] = {a: {d: 1.0 for d in cfg['units']} for a in cfg['units']}
        cfg['units']['tank']['cost'] = 5
        cfg['icon'] = '🛸'
        cfg['genre'] = 'Stratégie futuriste'
    if has('médiéval', 'medieval', 'chevalier', 'château', 'chateau'):
        cfg['units']['soldier']['name'] = 'Chevalier'
        cfg['combat']['fort_defense'] = 0.3
        cfg['icon'] = '⚔️'

    # Économie : rapide → riche, épique → lente
    if has('rapide', 'richesse', 'riche'):
        cfg['economy']['gold_per_terr'] = 9
        cfg['economy']['gold_base'] = 40
        cfg['start']['gold'] = 300
    if has('difficile', 'pauvre', 'survie'):
        cfg['economy']['gold_per_terr'] = 2
        cfg['start']['gold'] = 40

    cfg['blueprint'] = {'enabled': False, 'code': ''}
    return cfg

def _title(prompt):
    s = (prompt or '').strip().rstrip('.')
    if not s:
        return ''
    return s[:1].upper() + s[1:60]


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
        api_key = headers.get('x-api-key') or headers.get('api-key')
        if method == 'DELETE' and clean.startswith('/api/studio/config/'):
            gid = clean.split('/')[-1]
            st, ct, raw = _studio_api('DELETE', gid, None, api_key)
            await _http_respond(writer, st, ct, raw)
            return
        if method == 'POST':
            try:
                data = json.loads(body.decode('utf-8')) if body else {}
            except Exception:
                data = {}
            api_key = api_key or data.get('apiKey') or data.get('api_key') or data.get('privateKey')
            if clean == '/api/keys':
                st, ct, raw = _studio_api('KEYS', None, data)
                await _http_respond(writer, st, ct, raw)
                return
            if clean == '/api/studio/generate':
                st, ct, raw = _studio_api('GENERATE', None, data, api_key)
                await _http_respond(writer, st, ct, raw)
                return
            if clean.startswith('/api/studio/config/'):
                gid = clean.split('/')[-1]
                st, ct, raw = _studio_api('POST', gid, data, api_key)
                await _http_respond(writer, st, ct, raw)
                return
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

        if clean == '/api/keys':
            st, ct, raw = _studio_api('LISTKEYS', None, None)
            await _http_respond(writer, st, ct, raw)
            return
        if clean.startswith('/api/studio/configs'):
            st, ct, raw = _studio_api('LIST', None, None)
            await _http_respond(writer, st, ct, raw)
            return
        if clean.startswith('/api/studio/config/'):
            gid = clean.split('/')[-1]
            st, ct, raw = _studio_api('GET', gid, None)
            await _http_respond(writer, st, ct, raw)
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
    def _api_key(self):
        return (self.headers.get('X-Api-Key') or self.headers.get('Api-Key') or '').strip()
    def do_POST(self):
        path = urlparse(self.path).path
        api_key = self._api_key()
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
        elif path == '/api/keys':
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            st, ct, raw = _studio_api('KEYS', None, body)
            self._respond(st, ct, raw)
        elif path == '/api/studio/generate':
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            body.setdefault('apiKey', api_key)
            st, ct, raw = _studio_api('GENERATE', None, body, api_key or body.get('apiKey'))
            self._respond(st, ct, raw)
        elif path.startswith('/api/studio/config/'):
            gid = path.split('/')[-1]
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            body.setdefault('apiKey', api_key)
            st, ct, raw = _studio_api('POST', gid, body, api_key or body.get('apiKey'))
            self._respond(st, ct, raw)
        else:
            self.send_error(404)
    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/keys':
            st, ct, raw = _studio_api('LISTKEYS', None, None)
            self._respond(st, ct, raw)
        elif path.startswith('/api/studio/configs'):
            st, ct, raw = _studio_api('LIST', None, None)
            self._respond(st, ct, raw)
        elif path.startswith('/api/studio/config/'):
            gid = path.split('/')[-1]
            st, ct, raw = _studio_api('GET', gid, None)
            self._respond(st, ct, raw)
        else:
            super().do_GET()
    def do_DELETE(self):
        path = urlparse(self.path).path
        if path.startswith('/api/studio/config/'):
            gid = path.split('/')[-1]
            st, ct, raw = _studio_api('DELETE', gid, None, self._api_key())
            self._respond(st, ct, raw)
        else:
            self.send_error(404)
    def _respond(self, status, ctype, raw):
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
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
_pid_room = {}   # pid -> gid (salle du moteur)

async def ws_handler(conn):
    global _pid_counter
    pid = None
    gid = 'strat'
    try:
        async for msg in conn:
            data = json.loads(msg)
            action = data.get('action')
            if action == 'join':
                name = data.get('name', 'Anonyme')
                gid = data.get('game') or 'strat'
                g = _get_room(gid)
                valid_empires = g._cfg.get('empires', {})
                empire = data.get('empire', 'carthage')
                if empire not in valid_empires:
                    empire = next(iter(valid_empires), 'carthage')
                # Reconnect: reuse the last pid for this name so ownership is kept
                last = _last_pid.get(name)
                if last is not None:
                    pid = last
                else:
                    _pid_counter += 1
                    pid = f'p{_pid_counter}'
                _last_pid[name] = pid
                _pid_room[pid] = gid
                old = g.players.get(pid)
                if old:
                    # même joueur (autre dispositif): garde empire, soldats et ressources
                    empire = old.get('empire', empire)
                    gold, food, wood, stone = old['gold'], old['food'], old['wood'], old['stone']
                else:
                    gold = food = wood = stone = 0
                g.players[pid] = {'name':name, '_pid':pid, 'conn':conn, 'empire':empire,
                    'gold':gold, 'food':food, 'wood':wood, 'stone':stone, 'ready':False}
                g.last_human = time.time()
                if g.phase == 'waiting':
                    g.ensure_bots()   # les empires sans humain reçoivent un bot IA
                    if len(g.players) >= 2:
                        g.distribute()
                        await g._send_personalized(exclude_conn=conn)
                        await conn.send(json.dumps({'action':'state','state':g.to_dict(pid)}))
                    else:
                        await conn.send(json.dumps({'action':'state','state':g.to_dict(pid)}))
                else:
                    # partie en cours : un bot cède l'empire si un humain le rejoint
                    g.take_over(pid, empire)
                    g.admit(pid)
                    g.ensure_bots()
                    await g._send_personalized(exclude_conn=conn)
                    await conn.send(json.dumps({'action':'state','state':g.to_dict(pid)}))
            elif action == 'cmd' and pid:
                g = _get_room(_pid_room.get(pid, gid))
                print(f'[cmd] {pid} {data.get("cmd","")} {data.get("data",{})}', flush=True)
                result = g.process(pid, data.get('cmd',''), data.get('data',{}))
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
        g = _get_room(_pid_room.get(pid, gid))
        if pid and pid in g.players and g.players[pid].get('conn') is conn:
            empire = g.players[pid].get('empire')
            del g.players[pid]
            if g.phase == 'playing':
                # l'empire abandonné est défendu par un bot jusqu'à un humain
                g.ensure_bots()
            elif not any(not p.get('ai') for p in g.players.values()):
                _reset_room(g)

def _reset_room(g):
    """Remet une salle à zéro (attente, aucun bot ni joueur)."""
    g.phase = 'waiting'
    g.turn = 0
    g.wars.clear()
    g.players.clear()
    for t in g.territories.values():
        t['owner'] = None
        t['army'] = 0
        t['units'] = {}
        t['pop'] = 0
        t['home'] = None
        t['fort'] = 0
        t['fort_hill'] = 0
        t['buildings'] = []
        t['grid'] = None

BOT_TICK = 0.5          # rythme de vérification des tours de bots
BOT_IDLE_RESET = 900    # reset d'une salle 100% bots restée sans humain (s)
BOT_RUNNING = {}        # (gid, pid) -> tâche en cours

async def _run_bot_turn(g, pid):
    """Un tour de bot : décisions puis fin de tour automatique (avec délai)."""
    import traceback
    try:
        await asyncio.sleep(random.uniform(0.3, 1.0))
        try:
            g.bot_act(pid)
        except Exception:
            traceback.print_exc()
        if pid not in g.players or g.players[pid].get('ready'):
            return
        await asyncio.sleep(random.uniform(0.2, 0.8))
        try:
            g.process(pid, 'ready', {})
        except Exception:
            traceback.print_exc()
    except Exception:
        traceback.print_exc()

async def _bot_manager():
    """Chaque empire sans humain joue à chaque tour : les bots agissent puis
    terminent leur tour en parallèle. Une salle restée sans humain trop
    longtemps est remise à zéro."""
    while True:
        await asyncio.sleep(BOT_TICK)
        now = time.time()
        for gid in list(GAME_ROOMS.keys()):
            g = GAME_ROOMS[gid]
            if g.phase != 'playing':
                continue
            if not g._human_pids() and now - g.last_human > BOT_IDLE_RESET:
                _reset_room(g)
                continue
            for pid, p in list(g.players.items()):
                if p.get('ai') and not p.get('ready') and (gid, pid) not in BOT_RUNNING:
                    BOT_RUNNING[(gid, pid)] = asyncio.create_task(_run_bot_turn(g, pid))
            for k in [k for k in BOT_RUNNING if BOT_RUNNING[k].done()]:
                BOT_RUNNING.pop(k)

async def main():
    init_db()
    asyncio.create_task(_bot_manager())
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
