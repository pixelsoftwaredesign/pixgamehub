#!/usr/bin/env python3
"""
PixGameHub Server — Pixel Software Design
Central game server: HTTP + WebSocket + SQLite + Auth + Chat + Leaderboard + Payments
"""

import asyncio
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import threading
import time
from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path
from socketserver import ThreadingMixIn
from typing import Any
from urllib.parse import parse_qs, urlparse


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

import websockets
from websockets.asyncio.server import serve

from server.carthage_war import CarthageWarGame

# ─── Config ───────────────────────────────────────────────────────────────────
PORT_HTTP = int(os.environ.get("PORT", 8080))
PORT_WS = int(os.environ.get("PORT_WS", 8081))
RAILWAY_MODE = os.environ.get("RAILWAY_ENVIRONMENT") is not None or os.environ.get("SINGLE_PORT") == "1"
ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.environ.get("DB_PATH", str(ROOT / "server" / "pixgamehub.db")))
JWT_SECRET = os.environ.get("JWT_SECRET", "pix-game-hub-secret-key-2026")
SALT_ROUNDS = 10000

# ─── MIME overrides ───────────────────────────────────────────────────────────
MIME_OVERRIDES = {
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
    ".wasm": "application/wasm",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
}

# ─── Game registry ────────────────────────────────────────────────────────────
GAMES = {
    "platform":        {"name": "Desert Aventure",         "path": "games/platform/index.html",         "genre": "Plateforme",     "multiplayer": False},
    "fight":           {"name": "Kung Fu Arena",           "path": "games/fight/index.html",            "genre": "Combat",         "multiplayer": True},
    "battle":          {"name": "Fort2D Battle Royale",    "path": "games/battle/index.html",           "genre": "Battle Royale",  "multiplayer": True},
    "anime":           {"name": "Naruto vs Zoro",          "path": "games/anime/index.html",            "genre": "Anime Battle",   "multiplayer": True},
    "pixel":           {"name": "Pixel Arena",             "path": "games/pixel/index.html",            "genre": "Pixel Arena",    "multiplayer": True},
    "jungle":          {"name": "Jungle Desert Scorpion",  "path": "games/jungle/index.html",           "genre": "Aventure",       "multiplayer": False},
    "manga":           {"name": "Manga Fighting Arena",    "path": "games/manga/index.html",            "genre": "Manga Battle",   "multiplayer": True},
    "arabparkour":     {"name": "Le Voleur de Bagdad",     "path": "games/arabparkour/index.html",      "genre": "Parkour Arabe",  "multiplayer": False},
    "shadows":         {"name": "Shadows in the City",     "path": "games/shadows/index.html",          "genre": "Social Deduction","multiplayer": True},
    "carthage":        {"name": "Empire de Carthage",      "path": "games/carthage/index.html",         "genre": "Strategie",      "multiplayer": True},
    "carthage_plat":   {"name": "Le Voleur de Carthage",   "path": "games/carthage_platformer/index.html","genre": "Platformer",    "multiplayer": False},
    "engine":          {"name": "Moteur 2D Integral",      "path": "engine/index.html",                 "genre": "Moteur Graphique","multiplayer": False},
}

# ═════════════════════════════════════════════════════════════════════════════
#  Database (SQLite)
# ═════════════════════════════════════════════════════════════════════════════

_db_lock = threading.Lock()

def _get_db():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    conn = _get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS game_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            game_id TEXT NOT NULL,
            score INTEGER NOT NULL DEFAULT 0,
            relics INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(username, game_id)
        );
        CREATE TABLE IF NOT EXISTS operator_wallets (
            username TEXT PRIMARY KEY,
            balance REAL NOT NULL DEFAULT 0.0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS market_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            item_id TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'COMPLETED',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room TEXT NOT NULL,
            sender TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        );
    """)
    conn.close()
    print("[DB] SQLite initialized:", DB_PATH)

def hash_password(password: str, salt: str = None) -> tuple:
    if salt is None:
        salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), SALT_ROUNDS)
    return h.hex(), salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), SALT_ROUNDS)
    return hmac.compare_digest(h.hex(), password_hash)

def make_token(username: str) -> str:
    payload = json.dumps({"u": username, "t": int(time.time()), "e": int(time.time()) + 86400})
    sig = hmac.new(JWT_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    import base64
    return base64.urlsafe_b64encode(payload.encode()).decode() + "." + sig

def verify_token(token: str) -> str:
    try:
        import base64
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload = base64.urlsafe_b64decode(parts[0].encode()).decode()
        sig = hmac.new(JWT_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, parts[1]):
            return None
        data = json.loads(payload)
        if data.get("e", 0) < time.time():
            return None
        return data.get("u")
    except Exception:
        return None

# ═════════════════════════════════════════════════════════════════════════════
#  HTTP Server with API
# ═════════════════════════════════════════════════════════════════════════════

class PixGameHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def guess_type(self, path: str) -> str:
        for ext, mime in MIME_OVERRIDES.items():
            if path.endswith(ext):
                return mime
        return super().guess_type(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        p = urlparse(self.path)
        if p.path == "/api/games":
            return self._json(GAMES)
        if p.path == "/api/status":
            return self._json({
                "status": "online",
                "brand": "Pixel Software Design",
                "uptime": round(time.time() - _server_start_time, 1),
                "games": len(GAMES),
                "multiplayer_games": sum(1 for g in GAMES.values() if g["multiplayer"]),
                "active_rooms": len(rooms),
                "total_players": sum(len(r.players) for r in rooms.values()),
                "rooms": {gid: len(r.players) for gid, r in rooms.items()},
                "websocket_port": PORT_WS,
            })
        if p.path.startswith("/api/leaderboard/"):
            game_id = p.path.split("/")[-1]
            return self._handle_leaderboard(game_id)
        if p.path.startswith("/api/pixsoftpay/wallet/"):
            username = p.path.split("/")[-1]
            return self._handle_wallet(username)
        if p.path.startswith("/api/"):
            return self._json({"error": "unknown endpoint"}, 404)
        super().do_GET()

    def do_POST(self):
        p = urlparse(self.path)
        body = self._read_body()

        if p.path == "/api/auth/register":
            return self._handle_register(body)
        if p.path == "/api/auth/login":
            return self._handle_login(body)
        if p.path == "/api/pixsoftpay/topup":
            return self._handle_topup(body)
        if p.path == "/api/pixsoftpay/buy":
            return self._handle_buy(body)
        return self._json({"error": "unknown endpoint"}, 404)

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except Exception:
            return {}

    def _json(self, data: Any, code: int = 200):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_register(self, body):
        username = (body.get("username") or "").strip()
        password = body.get("password") or ""
        if not username or not password:
            return self._json({"error": "Nom d'utilisateur et mot de passe requis."}, 400)
        if len(username) < 3 or len(password) < 4:
            return self._json({"error": "Username >= 3 car, password >= 4 car."}, 400)
        pw_hash, salt = hash_password(password)
        try:
            with _db_lock:
                conn = _get_db()
                conn.execute("INSERT INTO operators (username, password_hash, salt) VALUES (?, ?, ?)",
                             (username, pw_hash, salt))
                conn.execute("INSERT INTO operator_wallets (username, balance) VALUES (?, 0.0)", (username,))
                conn.commit()
                conn.close()
            return self._json({"message": "Operateur enregistre avec succes."}, 201)
        except sqlite3.IntegrityError:
            return self._json({"error": "Cet operateur existe deja."}, 409)
        except Exception as e:
            return self._json({"error": str(e)}, 500)

    def _handle_login(self, body):
        username = body.get("username", "")
        password = body.get("password", "")
        with _db_lock:
            conn = _get_db()
            row = conn.execute("SELECT * FROM operators WHERE username = ?", (username,)).fetchone()
            conn.close()
        if not row or not verify_password(password, row["password_hash"], row["salt"]):
            return self._json({"error": "Identifiants invalides."}, 401)
        token = make_token(username)
        return self._json({"token": token, "username": username})

    def _handle_leaderboard(self, game_id):
        with _db_lock:
            conn = _get_db()
            rows = conn.execute(
                "SELECT username, score, relics, updated_at FROM game_scores WHERE game_id = ? ORDER BY score DESC LIMIT 10",
                (game_id,)
            ).fetchall()
            conn.close()
        return self._json({"leaderboard": [dict(r) for r in rows]})

    def _handle_wallet(self, username):
        with _db_lock:
            conn = _get_db()
            row = conn.execute("SELECT balance FROM operator_wallets WHERE username = ?", (username,)).fetchone()
            if not row:
                conn.execute("INSERT INTO operator_wallets (username, balance) VALUES (?, 0.0)", (username,))
                conn.commit()
                conn.close()
                return self._json({"balance": 0.0})
            conn.close()
        return self._json({"balance": row["balance"]})

    def _handle_topup(self, body):
        username = body.get("username", "")
        amount = body.get("amount", 0)
        if not username or not amount or amount <= 0:
            return self._json({"error": "Parametres invalides."}, 400)
        with _db_lock:
            conn = _get_db()
            conn.execute("""
                INSERT INTO operator_wallets (username, balance, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(username) DO UPDATE SET balance = balance + excluded.balance, updated_at = CURRENT_TIMESTAMP
            """, (username, amount))
            row = conn.execute("SELECT balance FROM operator_wallets WHERE username = ?", (username,)).fetchone()
            conn.commit()
            conn.close()
        return self._json({"message": "Rechargement effectue.", "newBalance": row["balance"]})

    def _handle_buy(self, body):
        username = body.get("username", "")
        item_id = body.get("itemId", "")
        price = body.get("price", 0)
        if not username or not item_id or price <= 0:
            return self._json({"error": "Donnees d'achat invalides."}, 400)
        with _db_lock:
            conn = _get_db()
            row = conn.execute("SELECT balance FROM operator_wallets WHERE username = ?", (username,)).fetchone()
            if not row or row["balance"] < price:
                conn.close()
                return self._json({"error": "Fonds insuffisants."}, 400)
            conn.execute("UPDATE operator_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?",
                         (price, username))
            conn.execute("INSERT INTO market_transactions (username, item_id, amount) VALUES (?, ?, ?)",
                         (username, item_id, price))
            conn.commit()
            conn.close()
        return self._json({"message": f"Achat de [{item_id}] valide."})

    def log_message(self, fmt, *args):
        ts = time.strftime("%H:%M:%S")
        print(f"  [{ts}] {args[0]}")


# ═════════════════════════════════════════════════════════════════════════════
#  WebSocket Multiplayer + Chat
# ═════════════════════════════════════════════════════════════════════════════

class GameRoom:
    def __init__(self, game_id: str):
        self.game_id = game_id
        self.players: dict[str, dict] = {}
        self.created_at = time.time()

    def add_player(self, ws_id: str, username: str = ""):
        self.players[ws_id] = {
            "x": 100, "y": 150, "vx": 0, "vy": 0,
            "flipX": False, "score": 0, "relics": 0,
            "username": username or ws_id[:8],
            "joined_at": time.time(),
        }

    def remove_player(self, ws_id: str):
        self.players.pop(ws_id, None)

    def to_dict(self) -> dict:
        return {
            "gameId": self.game_id,
            "playerCount": len(self.players),
            "players": [{"id": pid, **pstate} for pid, pstate in self.players.items()],
        }


rooms: dict[str, GameRoom] = {}
carthage_war_games: dict[str, CarthageWarGame] = {}
connections: dict[str, Any] = {}
chat_history: dict[str, list] = {}
_server_start_time = time.time()


async def ws_handler(websocket):
    ws_id = str(websocket.id)
    connections[ws_id] = {"ws": websocket, "gameId": None, "username": None, "token": None}
    print(f"[WS] + {ws_id} connected  ({len(connections)} total)")

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action")

            # ── auth ───────────────────────────────────────────────
            if action == "auth":
                token = msg.get("token", "")
                username = verify_token(token)
                if username:
                    connections[ws_id]["username"] = username
                    connections[ws_id]["token"] = token
                    await websocket.send(json.dumps({"action": "auth_ok", "username": username}))
                    print(f"[WS]   {username} authenticated")
                else:
                    await websocket.send(json.dumps({"action": "auth_fail"}))

            # ── join_game ──────────────────────────────────────────
            elif action == "join_game":
                game_id = msg.get("gameId", "unknown")
                username = msg.get("username") or connections[ws_id].get("username") or ws_id[:8]

                if game_id not in rooms:
                    rooms[game_id] = GameRoom(game_id)

                room = rooms[game_id]
                room.add_player(ws_id, username)
                connections[ws_id]["gameId"] = game_id
                connections[ws_id]["username"] = username

                await websocket.send(json.dumps({"action": "init_room", **room.to_dict()}))
                await _broadcast(game_id, {
                    "action": "player_joined", "id": ws_id, "username": username,
                }, exclude=ws_id)

                if game_id == "carthage":
                    if game_id not in carthage_war_games:
                        carthage_war_games[game_id] = CarthageWarGame(game_id)
                    cwg = carthage_war_games[game_id]
                    cwg.add_player(ws_id, username)
                    await websocket.send(json.dumps({
                        "action": "carthage_state",
                        "state": cwg.to_player_state(ws_id),
                    }))
                    await _broadcast_carthage(cwg, {
                        "action": "carthage_player_joined",
                        "playerId": ws_id,
                        "username": username,
                    }, exclude=ws_id)

                print(f"[WS]   {username} -> {game_id}  ({len(room.players)} players)")

            # ── player_move ────────────────────────────────────────
            elif action == "player_move":
                game_id = connections[ws_id].get("gameId")
                if not game_id or game_id not in rooms:
                    continue
                room = rooms[game_id]
                if ws_id in room.players:
                    p = room.players[ws_id]
                    for key in ("x", "y", "vx", "vy", "flipX", "score", "relics"):
                        if key in msg:
                            p[key] = msg[key]
                    await _broadcast(game_id, {
                        "action": "player_update", "id": ws_id,
                        **{k: msg[k] for k in ("x", "y", "vx", "vy", "flipX") if k in msg},
                    }, exclude=ws_id)

            # ── update_score ───────────────────────────────────────
            elif action == "update_score":
                game_id = connections[ws_id].get("gameId")
                username = connections[ws_id].get("username", "")
                if not game_id or not username:
                    continue
                score = msg.get("score", 0)
                relics = msg.get("relics", 0)
                try:
                    with _db_lock:
                        conn = _get_db()
                        conn.execute("""
                            INSERT INTO game_scores (username, game_id, score, relics, updated_at)
                            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                            ON CONFLICT(username, game_id) DO UPDATE SET
                                score = MAX(game_scores.score, excluded.score),
                                relics = MAX(game_scores.relics, excluded.relics),
                                updated_at = CURRENT_TIMESTAMP
                        """, (username, game_id, score, relics))
                        conn.commit()
                        conn.close()
                except Exception as e:
                    print(f"[DB] Score save error: {e}")

                if game_id in rooms:
                    room = rooms[game_id]
                    lb = sorted(
                        [{"id": pid, "username": p["username"], "score": p["score"], "relics": p["relics"]}
                         for pid, p in room.players.items()],
                        key=lambda x: x["score"], reverse=True
                    )
                    await _broadcast(game_id, {"action": "leaderboard_update", "leaderboard": lb})

            # ── chat ───────────────────────────────────────────────
            elif action == "join_chat_room":
                room_name = msg.get("room", "global_hub")
                ws_id_key = ws_id
                if not hasattr(websocket, '_chat_rooms'):
                    websocket._chat_rooms = set()
                websocket._chat_rooms.add(room_name)
                history = chat_history.get(room_name, [])
                await websocket.send(json.dumps({
                    "action": "chat_history", "room": room_name, "messages": history[-50:],
                }))

            elif action == "send_chat_message":
                room_name = msg.get("room", "global_hub")
                content = (msg.get("content") or "").strip()[:200]
                if not content:
                    continue
                sender = connections[ws_id].get("username", "Anonyme")
                chat_msg = {
                    "sender": sender,
                    "content": content,
                    "room": room_name,
                    "timestamp": int(time.time() * 1000),
                }
                if room_name not in chat_history:
                    chat_history[room_name] = []
                chat_history[room_name].append(chat_msg)
                if len(chat_history[room_name]) > 50:
                    chat_history[room_name] = chat_history[room_name][-50:]

                for cid, conn in connections.items():
                    if cid == ws_id:
                        continue
                    try:
                        await conn["ws"].send(json.dumps({
                            "action": "receive_chat_message", **chat_msg,
                        }))
                    except Exception:
                        pass

            # ── get_rooms ──────────────────────────────────────────
            elif action == "get_rooms":
                await websocket.send(json.dumps({
                    "action": "rooms_list",
                    "rooms": [{"gameId": gid, "players": len(r.players)} for gid, r in rooms.items()],
                }))

            # ── ws_api (register/login/leaderboard via WS) ─────────
            elif action == "ws_api":
                api_path = msg.get("path", "")
                api_body = msg.get("body", {})
                resp = _handle_ws_api(api_path, api_body)
                await websocket.send(json.dumps({"action": "ws_api_response", "id": msg.get("id"), **resp}))

            # ── carthage war game ────────────────────────────────────
            elif action == "carthage_action":
                if game_id != "carthage":
                    continue
                await _handle_carthage_action(websocket, ws_id, msg)

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        conn = connections.pop(ws_id, {})
        game_id = conn.get("gameId")

        if game_id and game_id in rooms:
            room = rooms[game_id]
            room.remove_player(ws_id)
            print(f"[WS]   {conn.get('username', ws_id[:8])} left {game_id}")
            await _broadcast(game_id, {"action": "player_left", "id": ws_id})
            if len(room.players) == 0:
                del rooms[game_id]
                if game_id == "carthage" and game_id in carthage_war_games:
                    del carthage_war_games[game_id]

        if game_id == "carthage" and game_id in carthage_war_games:
            cwg = carthage_war_games[game_id]
            cwg.remove_player(ws_id)
            await _broadcast_carthage(cwg, {
                "action": "carthage_player_left",
                "playerId": ws_id,
                "username": conn.get("username", ws_id[:8]),
            })
            if len(cwg.players) <= 1 and cwg.turn > 0 and not cwg.winner:
                remaining = list(cwg.players.keys())
                if remaining:
                    cwg.winner = remaining[0]
                    await _broadcast_carthage(cwg, {
                        "action": "carthage_game_over",
                        "winner": remaining[0],
                        "winnerName": cwg.players[remaining[0]]["username"],
                    })
                print(f"[WS]   Room '{game_id}' closed (empty)")

        print(f"[WS] - {ws_id} disconnected  ({len(connections)} total)")


async def _broadcast(game_id: str, data: dict, exclude: str = ""):
    if game_id not in rooms:
        return
    payload = json.dumps(data, ensure_ascii=False)
    dead = []
    for pid in rooms[game_id].players:
        if pid == exclude:
            continue
        conn = connections.get(pid)
        if conn:
            try:
                await conn["ws"].send(payload)
            except Exception:
                dead.append(pid)
    for d in dead:
        rooms[game_id].remove_player(d)


async def _broadcast_carthage(cwg: CarthageWarGame, data: dict, exclude: str = ""):
    payload = json.dumps(data, ensure_ascii=False)
    dead = []
    for pid in cwg.players:
        if pid == exclude:
            continue
        conn = connections.get(pid)
        if conn:
            try:
                await conn["ws"].send(payload)
            except Exception:
                dead.append(pid)
    for d in dead:
        cwg.remove_player(d)


async def _handle_carthage_action(websocket, ws_id: str, msg: dict):
    game_id = "carthage"
    if game_id not in carthage_war_games:
        await websocket.send(json.dumps({"action": "carthage_error", "error": "Partie introuvable"}))
        return

    cwg = carthage_war_games[game_id]
    cmd = msg.get("cmd", "")

    result = None
    state_update = None

    if cmd == "get_state":
        await websocket.send(json.dumps({
            "action": "carthage_state",
            "state": cwg.to_player_state(ws_id),
        }))
        return

    elif cmd == "start_planning":
        if cwg.phase != "resolution" and cwg.turn > 1:
            await websocket.send(json.dumps({"action": "carthage_error", "error": "Deja en phase de planification"}))
            return
        cwg.start_planning()
        state_update = cwg.to_player_state(ws_id)
        _add_carthage_log(cwg, "Systeme", f"Tour {cwg.turn} — Phase de planification commencee")

    elif cmd == "move_army":
        result = cwg.move_army(ws_id, msg.get("from"), msg.get("to"), msg.get("amount", 0))

    elif cmd == "attack":
        result = cwg.attack(ws_id, msg.get("from"), msg.get("to"))

    elif cmd == "propose_alliance":
        result = cwg.propose_alliance(ws_id, msg.get("to"))

    elif cmd == "accept_alliance":
        result = cwg.accept_alliance(msg.get("from"), ws_id)

    elif cmd == "reject_alliance":
        result = cwg.reject_alliance(msg.get("from"), ws_id)

    elif cmd == "break_alliance":
        result = cwg.break_alliance(ws_id, msg.get("ally"))

    elif cmd == "fortify":
        result = cwg.fortify(ws_id, msg.get("tid"))

    elif cmd == "recruit":
        result = cwg.recruit(ws_id, msg.get("tid"), msg.get("amount", 5))

    elif cmd == "ready":
        result = cwg.set_ready(ws_id)

    elif cmd == "unready":
        result = cwg.set_unready(ws_id)

    elif cmd == "chat":
        cwg.add_log(ws_id, msg.get("text", ""))
        result = {"status": 200}

    else:
        result = {"error": f"Commande inconnue: {cmd}", "status": 400}

    if result and result.get("status") != 200:
        await websocket.send(json.dumps({
            "action": "carthage_error",
            "cmd": cmd,
            "error": result.get("error", "Erreur inconnue"),
        }))
        return

    if cmd == "attack" and result and "battle" in result:
        battle = result["battle"]
        await _broadcast_carthage(cwg, {
            "action": "carthage_battle",
            "battle": battle,
        })
        if not cwg.winner:
            _add_carthage_log(cwg, "Systeme", f"Bataille a {battle['territory']} !")

    if cmd in ("move_army", "fortify", "recruit", "ready", "unready", "propose_alliance",
               "accept_alliance", "reject_alliance", "break_alliance", "chat"):
        pass

    state_update = cwg.to_player_state(ws_id) if not state_update else state_update

    if state_update:
        await _broadcast_carthage(cwg, {
            "action": "carthage_state",
            "state": state_update,
        })

    if cwg.winner:
        await _broadcast_carthage(cwg, {
            "action": "carthage_game_over",
            "winner": cwg.winner,
            "winnerName": cwg.players[cwg.winner]["username"],
        })


def _add_carthage_log(cwg, sender: str, text: str):
    cwg.message_log.append({
        "sender": sender,
        "text": text,
        "turn": cwg.turn,
        "time": __import__("time").time(),
    })
    if len(cwg.message_log) > 100:
        cwg.message_log = cwg.message_log[-100:]


def _handle_ws_api(path: str, body: dict) -> dict:
    if path == "/auth/register":
        username = (body.get("username") or "").strip()
        password = body.get("password") or ""
        if not username or not password:
            return {"error": "Nom d'utilisateur et mot de passe requis.", "status": 400}
        if len(username) < 3 or len(password) < 4:
            return {"error": "Username >= 3 car, password >= 4 car.", "status": 400}
        pw_hash, salt = hash_password(password)
        try:
            with _db_lock:
                conn = _get_db()
                conn.execute("INSERT INTO operators (username, password_hash, salt) VALUES (?, ?, ?)",
                             (username, pw_hash, salt))
                conn.execute("INSERT INTO operator_wallets (username, balance) VALUES (?, 0.0)", (username,))
                conn.commit()
                conn.close()
            return {"message": "Operateur enregistre avec succes.", "status": 201}
        except sqlite3.IntegrityError:
            return {"error": "Cet operateur existe deja.", "status": 409}
        except Exception as e:
            return {"error": str(e), "status": 500}
    if path == "/auth/login":
        username = body.get("username", "")
        password = body.get("password", "")
        with _db_lock:
            conn = _get_db()
            row = conn.execute("SELECT * FROM operators WHERE username = ?", (username,)).fetchone()
            conn.close()
        if not row or not verify_password(password, row["password_hash"], row["salt"]):
            return {"error": "Identifiants invalides.", "status": 401}
        token = make_token(username)
        return {"token": token, "username": username, "status": 200}
    if path.startswith("/leaderboard/"):
        game_id = path.split("/")[-1]
        with _db_lock:
            conn = _get_db()
            rows = conn.execute(
                "SELECT username, score, relics, updated_at FROM game_scores WHERE game_id = ? ORDER BY score DESC LIMIT 10",
                (game_id,)
            ).fetchall()
            conn.close()
        return {"leaderboard": [dict(r) for r in rows], "status": 200}
    return {"error": "unknown ws_api endpoint", "status": 404}


# ═════════════════════════════════════════════════════════════════════════════
#  Main
# ═════════════════════════════════════════════════════════════════════════════

def start_http():
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT_HTTP), PixGameHTTPHandler)
    print(f"[HTTP] Serving on http://localhost:{PORT_HTTP}")
    httpd.serve_forever()

async def start_ws():
    async with serve(ws_handler, "0.0.0.0", PORT_WS):
        print(f"[WS]   Listening on ws://localhost:{PORT_WS}")
        await asyncio.Future()

def main():
    init_database()
    print()
    print("=" * 60)
    print("  PixGameHub Server — Pixel Software Design")
    print("=" * 60)

    if RAILWAY_MODE:
        print(f"  MODE:  Railway (single-port on {PORT_HTTP})")
        print(f"  Hub:   http://localhost:{PORT_HTTP}")
        print(f"  API:   http://localhost:{PORT_HTTP}/api/games")
        print(f"  WS:    ws://localhost:{PORT_HTTP} (upgraded)")
        print("=" * 60)
        print()
        try:
            asyncio.run(start_ws_single_port())
        except KeyboardInterrupt:
            print("\n[Server] Shutting down.")
    else:
        print(f"  Hub:        http://localhost:{PORT_HTTP}")
        print(f"  API:        http://localhost:{PORT_HTTP}/api/games")
        print(f"  Auth:       http://localhost:{PORT_HTTP}/api/auth/login")
        print(f"  WebSocket:  ws://localhost:{PORT_WS}")
        print()
        print(f"  Games ({len(GAMES)}):")
        for gid, g in GAMES.items():
            mp = " [MP]" if g["multiplayer"] else ""
            print(f"    {gid:20s} -> {g['name']:30s} ({g['genre']}){mp}")
        print("=" * 60)
        print()
        t = threading.Thread(target=start_http, daemon=True)
        t.start()
        try:
            asyncio.run(start_ws())
        except KeyboardInterrupt:
            print("\n[Server] Shutting down.")

def _handle_api_request(path: str, body_bytes: bytes = b"") -> tuple:
    handler = PixGameHTTPHandler.__new__(PixGameHTTPHandler)
    handler._api_result = None
    handler._api_code = 200

    if path == "/api/games":
        return json.dumps(GAMES, ensure_ascii=False, indent=2), 200, "application/json; charset=utf-8"
    if path == "/api/status":
        data = {
            "status": "online",
            "brand": "Pixel Software Design",
            "uptime": round(time.time() - _server_start_time, 1),
            "games": len(GAMES),
            "multiplayer_games": sum(1 for g in GAMES.values() if g["multiplayer"]),
            "active_rooms": len(rooms),
            "total_players": sum(len(r.players) for r in rooms.values()),
            "rooms": {gid: len(r.players) for gid, r in rooms.items()},
        }
        return json.dumps(data, ensure_ascii=False, indent=2), 200, "application/json; charset=utf-8"
    if path.startswith("/api/leaderboard/"):
        game_id = path.split("/")[-1]
        with _db_lock:
            conn = _get_db()
            rows = conn.execute(
                "SELECT username, score, relics, updated_at FROM game_scores WHERE game_id = ? ORDER BY score DESC LIMIT 10",
                (game_id,)
            ).fetchall()
            conn.close()
        return json.dumps({"leaderboard": [dict(r) for r in rows]}, ensure_ascii=False), 200, "application/json; charset=utf-8"
    if path.startswith("/api/pixsoftpay/wallet/"):
        username = path.split("/")[-1]
        with _db_lock:
            conn = _get_db()
            row = conn.execute("SELECT balance FROM operator_wallets WHERE username = ?", (username,)).fetchone()
            if not row:
                conn.execute("INSERT INTO operator_wallets (username, balance) VALUES (?, 0.0)", (username,))
                conn.commit()
                conn.close()
                return json.dumps({"balance": 0.0}), 200, "application/json; charset=utf-8"
            conn.close()
        return json.dumps({"balance": row["balance"]}), 200, "application/json; charset=utf-8"
    return None, 404, "text/plain"

def _handle_api_post(path: str, body_bytes: bytes = b"") -> tuple:
    try:
        body = json.loads(body_bytes) if body_bytes else {}
    except Exception:
        body = {}

    if path == "/api/auth/register":
        username = (body.get("username") or "").strip()
        password = body.get("password") or ""
        if not username or not password:
            return json.dumps({"error": "Nom d'utilisateur et mot de passe requis."}), 400, "application/json"
        if len(username) < 3 or len(password) < 4:
            return json.dumps({"error": "Username >= 3 car, password >= 4 car."}), 400, "application/json"
        pw_hash, salt = hash_password(password)
        try:
            with _db_lock:
                conn = _get_db()
                conn.execute("INSERT INTO operators (username, password_hash, salt) VALUES (?, ?, ?)",
                             (username, pw_hash, salt))
                conn.execute("INSERT INTO operator_wallets (username, balance) VALUES (?, 0.0)", (username,))
                conn.commit()
                conn.close()
            return json.dumps({"message": "Operateur enregistre avec succes."}), 201, "application/json"
        except sqlite3.IntegrityError:
            return json.dumps({"error": "Cet operateur existe deja."}), 409, "application/json"
        except Exception as e:
            return json.dumps({"error": str(e)}), 500, "application/json"
    if path == "/api/auth/login":
        username = body.get("username", "")
        password = body.get("password", "")
        with _db_lock:
            conn = _get_db()
            row = conn.execute("SELECT * FROM operators WHERE username = ?", (username,)).fetchone()
            conn.close()
        if not row or not verify_password(password, row["password_hash"], row["salt"]):
            return json.dumps({"error": "Identifiants invalides."}), 401, "application/json"
        token = make_token(username)
        return json.dumps({"token": token, "username": username}), 200, "application/json"
    if path == "/api/pixsoftpay/topup":
        username = body.get("username", "")
        amount = body.get("amount", 0)
        if not username or not amount or amount <= 0:
            return json.dumps({"error": "Parametres invalides."}), 400, "application/json"
        with _db_lock:
            conn = _get_db()
            conn.execute("""
                INSERT INTO operator_wallets (username, balance, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(username) DO UPDATE SET balance = balance + excluded.balance, updated_at = CURRENT_TIMESTAMP
            """, (username, amount))
            row = conn.execute("SELECT balance FROM operator_wallets WHERE username = ?", (username,)).fetchone()
            conn.commit()
            conn.close()
        return json.dumps({"message": "Rechargement effectue.", "newBalance": row["balance"]}), 200, "application/json"
    if path == "/api/pixsoftpay/buy":
        username = body.get("username", "")
        item_id = body.get("itemId", "")
        price = body.get("price", 0)
        if not username or not item_id or price <= 0:
            return json.dumps({"error": "Donnees d'achat invalides."}), 400, "application/json"
        with _db_lock:
            conn = _get_db()
            row = conn.execute("SELECT balance FROM operator_wallets WHERE username = ?", (username,)).fetchone()
            if not row or row["balance"] < price:
                conn.close()
                return json.dumps({"error": "Fonds insuffisants."}), 400, "application/json"
            conn.execute("UPDATE operator_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?",
                         (price, username))
            conn.execute("INSERT INTO market_transactions (username, item_id, amount) VALUES (?, ?, ?)",
                         (username, item_id, price))
            conn.commit()
            conn.close()
        return json.dumps({"message": f"Achat de [{item_id}] valide."}), 200, "application/json"
    return json.dumps({"error": "unknown endpoint"}), 404, "application/json"


async def start_ws_single_port():
    from websockets.http11 import Response as WSResponse
    from websockets.datastructures import Headers as WSHeaders

    async def process_request(connection, request):
        path = request.path or "/"
        hdrs = dict(request.headers)

        if hdrs.get("upgrade", "").lower() == "websocket":
            return None

        if path.startswith("/api/"):
            if path == "/api/games":
                body = json.dumps(GAMES, ensure_ascii=False, indent=2).encode()
            elif path == "/api/status":
                data = {
                    "status": "online", "brand": "Pixel Software Design",
                    "uptime": round(time.time() - _server_start_time, 1),
                    "games": len(GAMES),
                    "multiplayer_games": sum(1 for g in GAMES.values() if g["multiplayer"]),
                    "active_rooms": len(rooms),
                    "total_players": sum(len(r.players) for r in rooms.values()),
                }
                body = json.dumps(data, ensure_ascii=False).encode()
            elif path.startswith("/api/leaderboard/"):
                game_id = path.split("/")[-1]
                with _db_lock:
                    conn = _get_db()
                    rows = conn.execute(
                        "SELECT username, score, relics, updated_at FROM game_scores WHERE game_id = ? ORDER BY score DESC LIMIT 10",
                        (game_id,)
                    ).fetchall()
                    conn.close()
                body = json.dumps({"leaderboard": [dict(r) for r in rows]}).encode()
            elif path.startswith("/api/pixsoftpay/wallet/"):
                username = path.split("/")[-1]
                with _db_lock:
                    conn = _get_db()
                    row = conn.execute("SELECT balance FROM operator_wallets WHERE username = ?", (username,)).fetchone()
                    if not row:
                        conn.execute("INSERT INTO operator_wallets (username, balance) VALUES (?, 0.0)", (username,))
                        conn.commit(); conn.close()
                        body = json.dumps({"balance": 0.0}).encode()
                    else:
                        conn.close()
                        body = json.dumps({"balance": row["balance"]}).encode()
            else:
                body = json.dumps({"error": "unknown endpoint"}).encode()
                h = WSHeaders()
                h["Content-Type"] = "application/json; charset=utf-8"
                h["Content-Length"] = str(len(body))
                h["Access-Control-Allow-Origin"] = "*"
                return WSResponse(404, "Not Found", h, body)

            h = WSHeaders()
            h["Content-Type"] = "application/json; charset=utf-8"
            h["Content-Length"] = str(len(body))
            h["Access-Control-Allow-Origin"] = "*"
            return WSResponse(200, "OK", h, body)

        fp = ROOT / path.lstrip("/") if path != "/" else ROOT / "index.html"
        if not fp.is_file():
            fp = ROOT / "index.html"
        if fp.is_file():
            ext = fp.suffix.lower()
            ct = MIME_OVERRIDES.get(ext) or {
                ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
                ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif",
                ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".wav": "audio/wav",
            }.get(ext, "application/octet-stream")
            data = fp.read_bytes()
            h = WSHeaders()
            h["Content-Type"] = ct
            h["Content-Length"] = str(len(data))
            h["Access-Control-Allow-Origin"] = "*"
            h["Cache-Control"] = "no-cache"
            return WSResponse(200, "OK", h, data)

        b404 = b"404 Not Found"
        h = WSHeaders()
        h["Content-Type"] = "text/plain"
        h["Content-Length"] = str(len(b404))
        return WSResponse(404, "Not Found", h, b404)

    async with serve(ws_handler, "0.0.0.0", PORT_HTTP, process_request=process_request):
        print(f"[WS+HTTP] Unified server on port {PORT_HTTP}")
        await asyncio.Future()

if __name__ == "__main__":
    main()
