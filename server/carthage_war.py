"""
Carthage: Bellum Punicum — Multiplayer War Engine
Pixel Software Design 2026
Server-side: territories, alliances, combat resolution
"""

import json
import random
import time
import math
from typing import Optional

# ─── Territory Data ───────────────────────────────────────────────────────────
TERRITORIES = [
    {"id":0,  "name":"Carthage",       "lon":10.2,  "lat":36.8, "type":"city",   "capital":True,  "adj":[1,3,4,14,9]},
    {"id":1,  "name":"Utique",         "lon":10.1,  "lat":37.1, "type":"port",   "capital":False, "adj":[0,2]},
    {"id":2,  "name":"Hippo Regius",   "lon":7.7,   "lat":36.9, "type":"port",   "capital":False, "adj":[1,13]},
    {"id":3,  "name":"Leptis Minor",   "lon":10.8,  "lat":34.2, "type":"city",   "capital":False, "adj":[0,4]},
    {"id":4,  "name":"Hadrumete",      "lon":10.6,  "lat":34.7, "type":"port",   "capital":False, "adj":[0,3,5]},
    {"id":5,  "name":"Syrte",          "lon":17.9,  "lat":31.2, "type":"temple", "capital":False, "adj":[4,14]},
    {"id":6,  "name":"Gades",          "lon":-6.3,  "lat":36.5, "type":"port",   "capital":False, "adj":[7]},
    {"id":7,  "name":"Ibiza",          "lon":1.4,   "lat":39.0, "type":"port",   "capital":False, "adj":[6]},
    {"id":8,  "name":"Sardaigne",      "lon":9.1,   "lat":39.2, "type":"fort",   "capital":False, "adj":[10]},
    {"id":9,  "name":"Sicile",         "lon":14.3,  "lat":37.6, "type":"city",   "capital":False, "adj":[0,11]},
    {"id":10, "name":"Corse",          "lon":9.0,   "lat":42.1, "type":"fort",   "capital":False, "adj":[8]},
    {"id":11, "name":"Malte",          "lon":14.4,  "lat":35.9, "type":"temple", "capital":False, "adj":[9]},
    {"id":12, "name":"Tripolitaine",   "lon":13.2,  "lat":32.9, "type":"city",   "capital":False, "adj":[0]},
    {"id":13, "name":"Numidie",        "lon":3.0,   "lat":36.8, "type":"fort",   "capital":False, "adj":[2]},
    {"id":14, "name":"Cyrene",         "lon":21.9,  "lat":32.8, "type":"temple", "capital":False, "adj":[0,5,15]},
    {"id":15, "name":"Alexandrie",     "lon":29.9,  "lat":31.2, "type":"city",   "capital":False, "adj":[14]},
]

TERRITORY_NAMES = {t["id"]: t["name"] for t in TERRITORIES}
TERRITORY_TYPES = {t["id"]: t["type"] for t in TERRITORIES}
ADJACENCY = {t["id"]: t["adj"] for t in TERRITORIES}

FORT_BONUS = {"city": 0, "port": 1, "fort": 2, "temple": 0}
TERRAIN_BONUS = {"city": 1.0, "port": 0.8, "fort": 1.3, "temple": 0.6}


class CarthageWarGame:
    def __init__(self, game_id: str):
        self.game_id = game_id
        self.players: dict[str, dict] = {}   # ws_id -> player state
        self.territories: list[dict] = []     # per-instance territory states
        self.phase: str = "planning"          # "planning" | "resolution"
        self.turn: int = 1
        self.alliances: list[set] = []        # list of {ws_id1, ws_id2}
        self.pending_alliances: list[dict] = []
        self.message_log: list[dict] = []
        self.phase_deadline: float = 0
        self.created_at: float = time.time()
        self.winner: Optional[str] = None

        self._init_territories()

    def _init_territories(self):
        self.territories = []
        for t in TERRITORIES:
            self.territories.append({
                "id": t["id"],
                "name": t["name"],
                "type": t["type"],
                "capital": t["capital"],
                "adj": t["adj"],
                "owner": None,
                "army": 5,
                "fortLevel": FORT_BONUS.get(t["type"], 0),
                "goldIncome": 5 + (3 if t["type"] == "city" else 0) + (2 if t["type"] == "port" else 0),
            })

    # ── Player Management ──────────────────────────────────────────────────

    def add_player(self, ws_id: str, username: str):
        if ws_id in self.players:
            return

        self.players[ws_id] = {
            "username": username,
            "gold": 100,
            "moral": 80,
            "totalArmy": 0,
            "territories": [],
            "joined_at": time.time(),
            "ready": False,
        }

        if len(self.players) == 1:
            neutral_tids = list(range(16))
            random.shuffle(neutral_tids)
            p1_tids = neutral_tids[:4]
            p1_ally_tid = 0
            remaining = [t for t in neutral_tids if t not in p1_tids]
        else:
            p1_tids = list(self.players.values())[0]["territories"]
            p1_ally_tid = p1_tids[0]
            remaining = [t["id"] for t in self.territories if t["id"] not in p1_tids]

        assigned = []
        for tid in sorted(remaining):
            if len(assigned) >= 3:
                break
            t = self._get_territory(tid)
            if t and t["owner"] is None:
                if self._is_adjacent_to_player(tid, p1_tids) or len(assigned) == 0:
                    t["owner"] = ws_id
                    t["army"] = 15 + random.randint(0, 10)
                    assigned.append(tid)
                    self.players[ws_id]["territories"].append(tid)

        if not assigned:
            tid = remaining[0] if remaining else 0
            t = self._get_territory(tid)
            t["owner"] = ws_id
            t["army"] = 15
            assigned.append(tid)
            self.players[ws_id]["territories"].append(tid)

        self.players[ws_id]["totalArmy"] = sum(
            self._get_territory(tid)["army"] for tid in assigned
        )

    def remove_player(self, ws_id: str):
        if ws_id not in self.players:
            return

        for tid in self.players[ws_id]["territories"]:
            t = self._get_territory(tid)
            if t:
                t["owner"] = None
                t["army"] = 5

        self.alliances = [a for a in self.alliances if ws_id not in a]
        self.pending_alliances = [p for p in self.pending_alliances if ws_id not in (p["from"], p["to"])]

        del self.players[ws_id]

        if len(self.players) <= 1 and self.turn > 1:
            remaining = list(self.players.keys())
            if remaining:
                self.winner = remaining[0]

    # ── Territory Queries ─────────────────────────────────────────────────

    def _get_territory(self, tid: int) -> Optional[dict]:
        for t in self.territories:
            if t["id"] == tid:
                return t
        return None

    def _is_adjacent_to_player(self, tid: int, player_tids: list) -> bool:
        adj = ADJACENCY.get(tid, [])
        return any(a in player_tids for a in adj)

    def get_player_territories(self, ws_id: str) -> list[dict]:
        return [t for t in self.territories if t["owner"] == ws_id]

    def are_allied(self, a: str, b: str) -> bool:
        return any(ws in (a, b) for ws in [a, b]) and any(a in al and b in al for al in self.alliances)

    # ── Game Actions ──────────────────────────────────────────────────────

    def move_army(self, ws_id: str, from_tid: int, to_tid: int, amount: int) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}

        src = self._get_territory(from_tid)
        dst = self._get_territory(to_tid)
        if not src or not dst:
            return {"error": "Territoire invalide", "status": 400}
        if src["owner"] != ws_id:
            return {"error": "Ce n'est pas votre territoire", "status": 400}
        if dst["owner"] != ws_id:
            return {"error": "Destination non possedee", "status": 400}
        if to_tid not in ADJACENCY.get(from_tid, []):
            return {"error": "Territoires non adjacents", "status": 400}
        if amount <= 0 or src["army"] - amount < 1:
            return {"error": "Armee insuffisante (gardez au moins 1)", "status": 400}

        src["army"] -= amount
        dst["army"] += amount

        self.add_log(ws_id, f"Armee de {amount} de {src['name']} → {dst['name']}")
        return {"status": 200}

    def attack(self, ws_id: str, from_tid: int, to_tid: int) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}

        src = self._get_territory(from_tid)
        dst = self._get_territory(to_tid)
        if not src or not dst:
            return {"error": "Territoire invalide", "status": 400}
        if src["owner"] != ws_id:
            return {"error": "Ce n'est pas votre territoire", "status": 400}
        if dst["owner"] == ws_id:
            return {"error": "Vous possedez deja ce territoire", "status": 400}
        if to_tid not in ADJACENCY.get(from_tid, []):
            return {"error": "Territoires non adjacents", "status": 400}
        if dst["owner"] is not None and self.are_allied(ws_id, dst["owner"]):
            return {"error": "Vous etes allies avec ce joueur", "status": 400}
        if src["army"] < 2:
            return {"error": "Armee insuffisante (minimum 2)", "status": 400}

        return {"status": 200,
                "battle": self._resolve_battle(ws_id, from_tid, to_tid)}

    def _resolve_battle(self, attacker_id: str, from_tid: int, to_tid: int) -> dict:
        src = self._get_territory(from_tid)
        dst = self._get_territory(to_tid)
        defender_id = dst["owner"]

        atk_army = src["army"]
        def_army = dst["army"]

        atk_power = atk_army * 1.0
        def_power = def_army * 1.2

        def_power += dst["fortLevel"] * 8

        terrain_mult = TERRAIN_BONUS.get(dst["type"], 1.0)
        def_power *= terrain_mult

        if defender_id and self.players.get(defender_id):
            def_moral = self.players[defender_id]["moral"] / 100.0
            def_power *= (0.8 + 0.4 * def_moral)

        for ally_id in self.players:
            if ally_id == attacker_id or ally_id == defender_id:
                continue
            if self.are_allied(defender_id, ally_id):
                for ally_t in self.get_player_territories(ally_id):
                    if to_tid in ADJACENCY.get(ally_t["id"], []):
                        def_power += ally_t["army"] * 0.3

        total = atk_power + def_power
        atk_roll = random.uniform(0, atk_power)
        def_roll = random.uniform(0, def_power * 1.1)

        attacker_wins = atk_roll > def_roll

        atk_losses = int(atk_army * (0.3 + 0.3 * (def_roll / max(def_power, 1))))
        def_losses = int(def_army * (0.2 + 0.2 * (atk_roll / max(atk_power, 1))))
        atk_losses = max(1, min(atk_losses, atk_army - 1))
        def_losses = max(1, min(def_losses, def_army))

        result = {
            "attacker": attacker_id,
            "defender": defender_id,
            "territory": dst["name"],
            "attackers": atk_army,
            "defenders": def_army,
            "atkLosses": atk_losses,
            "defLosses": def_losses,
            "attackerWins": attacker_wins,
            "defenderWins": not attacker_wins,
        }

        src["army"] -= atk_losses
        dst["army"] -= def_losses

        if attacker_wins:
            src["army"] -= 1
            remaining = dst["army"]
            dst["owner"] = attacker_id
            dst["army"] = max(1, remaining)
            dst["fortLevel"] = max(0, dst["fortLevel"] - 1)

            if attacker_id in self.players:
                self.players[attacker_id]["territories"].append(to_tid)
            if defender_id in self.players:
                self.players[defender_id]["territories"] = [
                    t["id"] for t in self.territories
                    if t["owner"] == defender_id
                ]
                if len(self.players[defender_id]["territories"]) == 0:
                    self.winner = attacker_id

            self.add_log(attacker_id, f"Victoire ! {dst['name']} conquis")
            self.add_log(defender_id, f"Defaite ! {dst['name']} perdu")
        else:
            if defender_id and self.players.get(defender_id):
                self.players[defender_id]["moral"] = min(100,
                    self.players[defender_id]["moral"] + 5)
            self.add_log(attacker_id, f"Attaque repoussee a {dst['name']}")
            self.add_log(defender_id, f"{dst['name']} defendue avec succes")

        return result

    def propose_alliance(self, from_id: str, to_id: str) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}
        if from_id == to_id:
            return {"error": "Vous ne pouvez pas vous allier a vous-meme", "status": 400}
        if to_id not in self.players:
            return {"error": "Joueur introuvable", "status": 404}
        if self.are_allied(from_id, to_id):
            return {"error": "Deja allies", "status": 400}

        for p in self.pending_alliances:
            if p["from"] == from_id and p["to"] == to_id:
                return {"error": "Proposition deja envoyee", "status": 400}

        self.pending_alliances.append({
            "from": from_id,
            "to": to_id,
            "time": time.time(),
        })

        from_name = self.players[from_id]["username"]
        to_name = self.players[to_id]["username"]
        self.add_log(from_id, f"Proposition d'alliance envoyee a {to_name}")
        self.add_log(to_id, f"{from_name} propose une alliance")

        return {"status": 200}

    def accept_alliance(self, from_id: str, to_id: str) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}

        found = None
        for i, p in enumerate(self.pending_alliances):
            if p["from"] == from_id and p["to"] == to_id:
                found = i
                break

        if found is None:
            return {"error": "Aucune proposition en attente", "status": 404}

        self.pending_alliances.pop(found)
        self.alliances.append({from_id, to_id})

        from_name = self.players[from_id]["username"]
        to_name = self.players[to_id]["username"]
        self.add_log(from_id, f"Alliance acceptee avec {to_name}")
        self.add_log(to_id, f"Alliance acceptee avec {from_name}")

        return {"status": 200}

    def reject_alliance(self, from_id: str, to_id: str) -> dict:
        found = None
        for i, p in enumerate(self.pending_alliances):
            if p["from"] == from_id and p["to"] == to_id:
                found = i
                break

        if found is None:
            return {"error": "Aucune proposition en attente", "status": 404}

        self.pending_alliances.pop(found)
        from_name = self.players[from_id]["username"]
        self.add_log(to_id, f"Proposition d'alliance de {from_name} refusee")

        return {"status": 200}

    def break_alliance(self, ws_id: str, ally_id: str) -> dict:
        found = None
        for i, a in enumerate(self.alliances):
            if ws_id in a and ally_id in a:
                found = i
                break

        if found is None:
            return {"error": "Pas d'alliance avec ce joueur", "status": 400}

        self.alliances.pop(found)
        from_name = self.players[ws_id]["username"]
        to_name = self.players[ally_id]["username"]
        self.add_log(ws_id, f"Alliance brisee avec {to_name} (TRAHISON !)")
        self.add_log(ally_id, f"{from_name} a brise l'alliance !")

        if ws_id in self.players:
            self.players[ws_id]["moral"] = max(20, self.players[ws_id]["moral"] - 20)
        if ally_id in self.players:
            self.players[ally_id]["moral"] = max(20, self.players[ally_id]["moral"] - 10)

        return {"status": 200}

    def fortify(self, ws_id: str, tid: int) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}

        t = self._get_territory(tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Territoire invalide", "status": 400}

        cost = 20 + t["fortLevel"] * 15
        if self.players[ws_id]["gold"] < cost:
            return {"error": f"Or insuffisant ({cost} requis)", "status": 400}

        if t["fortLevel"] >= 5:
            return {"error": "Fortification au maximum", "status": 400}

        self.players[ws_id]["gold"] -= cost
        t["fortLevel"] += 1

        self.add_log(ws_id, f"Fortifications renforcees a {t['name']} (niveau {t['fortLevel']})")
        return {"status": 200}

    def recruit(self, ws_id: str, tid: int, amount: int) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}

        t = self._get_territory(tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Territoire invalide", "status": 400}

        cost = amount * 3
        if self.players[ws_id]["gold"] < cost:
            return {"error": f"Or insuffisant ({cost} requis)", "status": 400}

        self.players[ws_id]["gold"] -= cost
        t["army"] += amount

        self.add_log(ws_id, f"{amount} soldats recrutes a {t['name']}")
        return {"status": 200}

    def set_ready(self, ws_id: str) -> dict:
        if self.phase != "planning":
            return {"error": "Ce n'est pas la phase de planification", "status": 400}

        self.players[ws_id]["ready"] = True

        if all(p["ready"] for p in self.players.values()):
            self._resolve_phase()

        return {"status": 200}

    def set_unready(self, ws_id: str) -> dict:
        self.players[ws_id]["ready"] = False
        return {"status": 200}

    # ── Phase Resolution ──────────────────────────────────────────────────

    def _resolve_phase(self):
        self.phase = "resolution"

        for ws_id in self.players:
            self.players[ws_id]["ready"] = False

        self.turn += 1
        self.phase = "planning"

    def start_planning(self):
        self.phase = "planning"
        self.phase_deadline = time.time() + 120

        for ws_id in self.players:
            p = self.players[ws_id]
            income = sum(
                self._get_territory(tid)["goldIncome"]
                for tid in p["territories"]
            )
            p["gold"] += income
            p["moral"] = min(100, p["moral"] + 3)
            p["ready"] = False

            for tid in p["territories"]:
                t = self._get_territory(tid)
                if t:
                    t["army"] += 1

            p["totalArmy"] = sum(
                self._get_territory(tid)["army"] for tid in p["territories"]
            )

            if len(p["territories"]) == 0:
                self.winner = list(self.players.keys())[0]

    def to_full_state(self) -> dict:
        return {
            "gameId": self.game_id,
            "turn": self.turn,
            "phase": self.phase,
            "players": {pid: {
                "username": p["username"],
                "gold": p["gold"],
                "moral": p["moral"],
                "totalArmy": p["totalArmy"],
                "territoryCount": len(p["territories"]),
                "ready": p["ready"],
            } for pid, p in self.players.items()},
            "territories": [{
                "id": t["id"],
                "name": t["name"],
                "type": t["type"],
                "capital": t["capital"],
                "owner": t["owner"],
                "army": t["army"],
                "fortLevel": t["fortLevel"],
            } for t in self.territories],
            "alliances": [
                [list(a)[0], list(a)[1]] for a in self.alliances
            ],
            "pendingAlliances": [
                {"from": p["from"], "to": p["to"]} for p in self.pending_alliances
            ],
            "log": self.message_log[-20:],
            "winner": self.winner,
        }

    def to_player_state(self, ws_id: str) -> dict:
        state = self.to_full_state()
        state["you"] = ws_id
        state["allied_with"] = [
            list(a)[0] if list(a)[1] == ws_id else list(a)[1]
            for a in self.alliances
            if ws_id in a
        ]
        return state

    def add_log(self, ws_id: Optional[str], text: str):
        username = self.players[ws_id]["username"] if ws_id and ws_id in self.players else "Systeme"
        self.message_log.append({
            "sender": username,
            "text": text,
            "turn": self.turn,
            "time": time.time(),
        })
        if len(self.message_log) > 100:
            self.message_log = self.message_log[-100:]
