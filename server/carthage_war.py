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
from hex_map import generate_hex_grid, generate_punic_name, haversine

# ─── Territory Data ───────────────────────────────────────────────────────────
TERRITORIES = generate_hex_grid(land_only=True)
ADJACENCY = {t["id"]: t["adj"] for t in TERRITORIES}

FORT_BONUS = {"city": 0, "port": 1, "fort": 2, "temple": 0}
TERRAIN_BONUS = {"city": 1.0, "port": 0.8, "fort": 1.3, "temple": 0.6}

# ─── PixSoftPay Market Items ────────────────────────────────────────────────
MARKET_ITEMS = {
    "ephee_hannibal": {
        "name": "Ephee Legendaire d'Hannibal",
        "desc": "Forgee dans le bronze du sanctuaire de Melqart, cette arme porte la foudre de Baal.",
        "icon": "🗡",
        "cost_gold": 300,
        "cost_lw": 0,
        "effect": {"weapons": 5, "attack_bonus": 0.10},
        "rarity": "legendaire",
    },
    "armure_doree": {
        "name": "Armure Punique Doree",
        "desc": "Cuirasse a ecailles dorees des generaux victorieux. Inspire la crainte.",
        "icon": "🛡",
        "cost_gold": 200,
        "cost_lw": 0,
        "effect": {"moral": 10, "defense_bonus": 0.05},
        "rarity": "rare",
    },
    "vip_pass_senat": {
        "name": "Pass VIP du Senat",
        "desc": "Siege permanent aux assemblees. Votre voix porte sur toutes les motions.",
        "icon": "🏛",
        "cost_gold": 0,
        "cost_lw": 50,
        "effect": {"moral_income": 2, "gold_income": 3},
        "rarity": "rare",
    },
    "relique_tanit": {
        "name": "Relique de Tanit",
        "desc": "Statuette sacree de la deesse mere. Les moissons sont abondantes.",
        "icon": "🔮",
        "cost_gold": 150,
        "cost_lw": 0,
        "effect": {"food_income": 5, "marble_income": 1},
        "rarity": "rare",
    },
    "trirème_sacree": {
        "name": "Trirème Sacree",
        "desc": "Navire ceremoniel consacre a Eshmoun. Sa voile pourpre terrifie les ennemis.",
        "icon": "⛵",
        "cost_gold": 100,
        "cost_lw": 0,
        "effect": {"ships": 2, "ship_income": 1},
        "cost_wood": 30,
        "rarity": "commun",
    },
    "bouclier_elohim": {
        "name": "Bouclier des Elohim",
        "desc": "Targe ronde ornee du disque aile. Protege des fleches comme des trahisons.",
        "icon": "🛡",
        "cost_gold": 250,
        "cost_lw": 0,
        "effect": {"stone_income": 3, "defense_bonus": 0.08},
        "rarity": "epique",
    },
    "parchemin_sages": {
        "name": "Parchemin des Sages",
        "desc": "Savoir ancestral sur l'architecture navale. Les chantiers produisent plus vite.",
        "icon": "📜",
        "cost_gold": 0,
        "cost_lw": 30,
        "effect": {"lwPoints": 20, "ship_income": 2},
        "rarity": "commun",
    },
    "idole_melqart": {
        "name": "Idole de Melqart",
        "desc": "Le dieu tutelaire de Tyr benit vos armees. La victoire est assuree.",
        "icon": "🔥",
        "cost_gold": 500,
        "cost_lw": 100,
        "effect": {"attack_bonus": 0.15, "moral": 20, "gold_income": 5},
        "rarity": "mythique",
    },
}

# ─── Character Definitions ──────────────────────────────────────────────────
CHARACTERS = {
    "hannibal": {
        "name": "Hannibal Barca",
        "title": "Stratège",
        "desc": "+25% puissance d'attaque, +1 armée/tour",
        "portrait": "🐘",
        "color": "#8B0000",
        "bonus": {"attack_power": 0.25, "army_growth": 1},
    },
    "massinissa": {
        "name": "Massinissa",
        "title": "Cavalier Numide",
        "desc": "+15% déplacement, +2 nourriture/tour",
        "portrait": "🐴",
        "color": "#CD853F",
        "bonus": {"move_bonus": 0.15, "food_income": 2},
    },
    "hasdrubal": {
        "name": "Hasdrubal Barca",
        "title": "Défenseur",
        "desc": "+20% défense, -15% coût fortification",
        "portrait": "🛡️",
        "color": "#4682B4",
        "bonus": {"defense_power": 0.20, "fortify_discount": 0.15},
    },
    "jugurtha": {
        "name": "Jugurtha",
        "title": "Guerrier",
        "desc": "+15% attaque hors capitale, +1 moral/tour",
        "portrait": "⚔️",
        "color": "#DAA520",
        "bonus": {"guerilla_bonus": 0.15, "moral_regen": 1},
    },
    "himilco": {
        "name": "Himilco",
        "title": "Navigateur",
        "desc": "+1 navire/tour, +2 or/tour",
        "portrait": "⛵",
        "color": "#2E8B57",
        "bonus": {"ship_income": 1, "gold_income": 2},
    },
    "hanno": {
        "name": "Hanno",
        "title": "Marchand",
        "desc": "+3 or/tour, -10% coût bâtiments",
        "portrait": "💰",
        "color": "#B8860B",
        "bonus": {"gold_extra": 3, "build_discount": 0.10},
    },
}

# ─── Building Definitions ──────────────────────────────────────────────────────
BUILDINGS = {
    "temple":   {"name":"Temple",         "icon":"☥", "cost":30, "gold":0,  "moral":5,  "defense":0.5, "fort":0, "food":1,  "ship":0, "stone":0, "weapon":0},
    "walls":    {"name":"Remparts",       "icon":"🏰","cost":40, "gold":0,  "moral":0,  "defense":0,   "fort":2, "food":0,  "ship":0, "stone":0, "weapon":0},
    "wheat":    {"name":"Champs de ble",  "icon":"🌾","cost":15, "gold":0,  "moral":0,  "defense":0,   "fort":0, "food":5,  "ship":0, "stone":0, "weapon":0},
    "olive":    {"name":"Oliviers",       "icon":"🫒","cost":20, "gold":1,  "moral":1,  "defense":0,   "fort":0, "food":3,  "ship":0, "stone":0, "weapon":0},
    "resin":    {"name":"Atelier resine", "icon":"🌲","cost":25, "gold":2,  "moral":0,  "defense":0,   "fort":0, "food":1,  "ship":1, "stone":0, "weapon":0},
    "vineyard": {"name":"Vignobles",      "icon":"🍇","cost":20, "gold":1,  "moral":2,  "defense":0,   "fort":0, "food":2,  "ship":0, "stone":0, "weapon":0},
    "market":   {"name":"Marche",         "icon":"🏪","cost":35, "gold":5,  "moral":1,  "defense":0,   "fort":0, "food":0,  "ship":0, "stone":0, "weapon":0},
    "dock":     {"name":"Quai",           "icon":"⚓","cost":25, "gold":2,  "moral":0,  "defense":0,   "fort":0, "food":0,  "ship":2, "stone":0, "weapon":0},
    "granary":  {"name":"Grenier",        "icon":"🏪","cost":25, "gold":0,  "moral":0,  "defense":0,   "fort":0, "food":6,  "ship":0, "stone":0, "weapon":0},
    "shipyard": {"name":"Chantier naval", "icon":"⛵","cost":35, "gold":0,  "moral":0,  "defense":0,   "fort":0, "food":0,  "ship":4, "stone":0, "weapon":0},
    "quarry":   {"name":"Carriere",       "icon":"⛏","cost":30, "gold":0,  "moral":0,  "defense":0,   "fort":0, "food":0,  "ship":0, "stone":4, "weapon":0},
    "forge":    {"name":"Forge",          "icon":"⚒","cost":40, "gold":0,  "moral":0,  "defense":0,   "fort":0, "food":0,  "ship":0, "stone":0, "weapon":3},
    "fortress": {"name":"Forteresse",     "icon":"🏯","cost":70, "gold":0,  "moral":3,  "defense":2.0,  "fort":3, "food":0,  "ship":0, "stone":0, "weapon":0},
    # ─── Batiments Mayas ───────────────────────────────────────────────────
    "pyramid":  {"name":"Pyramide",       "icon":"🗿","cost":80, "gold":3,  "moral":8,  "defense":1.5, "fort":1, "food":0,  "ship":0, "stone":0, "weapon":0},
    "observatory":{"name":"Observatoire", "icon":"🔭","cost":45, "gold":2,  "moral":3,  "defense":0,   "fort":0, "food":1,  "ship":0, "stone":0, "weapon":0},
    "ballcourt":{"name":"Terrains de pelote","icon":"⚽","cost":30, "gold":0,  "moral":6,  "defense":0,   "fort":0, "food":0,  "ship":0, "stone":0, "weapon":0},
    "chinampa": {"name":"Chinampa",       "icon":"🌿","cost":20, "gold":1,  "moral":0,  "defense":0,   "fort":0, "food":8,  "ship":0, "stone":0, "weapon":0},
    "sacbe":    {"name":"Sacbe (route)",  "icon":"🛤","cost":25, "gold":0,  "moral":0,  "defense":0.5, "fort":0, "food":0,  "ship":0, "stone":0, "weapon":0},
    "codex":    {"name":"Codex royal",    "icon":"📜","cost":35, "gold":1,  "moral":4,  "defense":0,   "fort":0, "food":0,  "ship":0, "stone":1, "weapon":0},
}
BUILDING_ORDER = ["wheat","olive","resin","vineyard","granary","quarry","shipyard","forge","temple","walls","market","dock","pyramid","observatory","ballcourt","chinampa","sacbe","codex"]


class CarthageWarGame:
    def __init__(self, game_id: str):
        self.game_id = game_id
        self.players: dict[str, dict] = {}   # ws_id -> player state
        self.territories: list[dict] = []     # per-instance territory states
        self.phase: str = "setup"             # "setup" | "planning" | "resolution"
        self.turn: int = 1
        self.year: int = 218                  # av. J.-C.
        self.season: int = 0                  # 0=Printemps, 1=Été, 2=Automne, 3=Hiver
        self.alliances: list[set] = []        # list of {ws_id1, ws_id2}
        self.pending_alliances: list[dict] = []
        self.message_log: list[dict] = []
        self.phase_deadline: float = 0
        self.created_at: float = time.time()
        self.winner: Optional[str] = None
        self.chronicles: list[dict] = []
        self.chronicle_id: int = 0

        self._init_territories()

    def _init_territories(self):
        self.territories = []
        for t in TERRITORIES:
            self.territories.append(dict(t))
        # Reset owners and armies for fresh game
        for t in self.territories:
            t["owner"] = None
            t["buildings"] = []
            t["placements"] = []
            t["fortLevel"] = 0
            t["level"] = 1
            t["income_distributed"] = False
            t["city_grid"] = [""] * 9
            # Interior city: 12x12 geometric octagon with walls on perimeter
            GS = 12
            ig = [[None]*GS for _ in range(GS)]
            octagon = lambda r,c: (
                (r == 0 or r == GS-1) and 4 <= c <= 7 or
                (r == 1 or r == GS-2) and 3 <= c <= 8 or
                (r == 2 or r == GS-3) and 2 <= c <= 9 or
                (r == 3 or r == GS-4) and 1 <= c <= 10 or
                4 <= r <= 7 and 0 <= c <= GS-1
            )
            for r in range(GS):
                for c in range(GS):
                    if octagon(r, c):
                        if not octagon(r-1, c) or not octagon(r+1, c) or not octagon(r, c-1) or not octagon(r, c+1):
                            ig[r][c] = "wall"
            ig[5][5] = ig[6][6] = "center"
            t["interior_grid"] = ig

    # ── Player Management ──────────────────────────────────────────────────

    def add_player(self, ws_id: str, username: str):
        if ws_id in self.players:
            return

        # Assign starting territories — 5 land territories per player
        unowned_land = [t for t in self.territories if t["owner"] is None and t["land"]]
        random.Random(ws_id).shuffle(unowned_land)
        assigned = unowned_land[:5] if len(unowned_land) >= 5 else unowned_land

        terr_ids = []
        for t in assigned:
            t["owner"] = ws_id
            t["population"] = 40000
            t["army"] = 4000
            terr_ids.append(t["id"])

        self.players[ws_id] = {
            "username": username,
            "character": None,
            "civilization": "carthage",
            "gold": 0,
            "food": 0,
            "ships": 0,
            "stone": 0,
            "weapons": 0,
            "wood": 0,
            "marble": 0,
            "lwPoints": 0,
            "moral": 80,
            "totalArmy": 20000,
            "territories": terr_ids,
            "joined_at": time.time(),
            "ready": True,
            "setupDone": True,
        }

        # Auto-start game once at least 2 players joined and all are done
        if len(self.players) >= 2 and all(p.get("setupDone") for p in self.players.values()):
            self._start_game()

        # Opening chronicle on first player
        if len(self.players) == 1:
            self.add_chronicle("evenement",
                "Fondation de la nouvelle Carthage. Les suffetes convoquent le Senat. "
                "La guerre contre Rome commence sous les auspices de Baal Hammon.",
                "𐤒𐤓𐤕𐤟 𐤇𐤃𐤔𐤕 𐤕𐤌𐤃 𐤋𐤏𐤋𐤌𐤟")
        else:
            username = self.players[ws_id]["username"]
            self.add_chronicle("evenement",
                f"{username} rejoint la cause carthaginoise. Ses navires accostent dans le Cothon.",
                "𐤁𐤏𐤋 𐤇𐤍𐤁𐤏𐤋")

    def choose_character(self, ws_id: str, char_id: str) -> dict:
        if char_id not in CHARACTERS:
            return {"error": "Personnage inconnu", "status": 400}
        if ws_id not in self.players:
            return {"error": "Joueur introuvable", "status": 404}
        if self.turn > 1:
            return {"error": "Personnage deja choisi", "status": 400}
        self.players[ws_id]["character"] = char_id
        self.add_log(ws_id, f"a choisi {CHARACTERS[char_id]['name']}")
        c = CHARACTERS[char_id]
        username = self.players[ws_id]["username"]
        self.add_chronicle("evenement",
            f"Le general {c['name']} ({c['title']}) rejoint la cause de {username}.",
            "𐤁𐤏𐤋 𐤇𐤍𐤁𐤏𐤋")
        return {"status": 200, "character": char_id}

    def choose_civilization(self, ws_id: str, civ_id: str) -> dict:
        valid = ("carthage", "maya", "azteque", "rome", "hellen")
        if civ_id not in valid:
            return {"error": "Civilisation inconnue", "status": 400}
        if ws_id not in self.players:
            return {"error": "Joueur introuvable", "status": 404}
        self.players[ws_id]["civilization"] = civ_id
        civ_name = {"carthage":"Carthage","maya":"Maya","azteque":"Aztèque","rome":"Rome","hellen":"Hellénistique"}.get(civ_id, civ_id)
        self.add_log(ws_id, f"a choisi la civilisation {civ_name}")
        if civ_id == "maya":
            self.players[ws_id]["wood"] += 20
            self.players[ws_id]["stone"] += 15
        elif civ_id == "azteque":
            self.players[ws_id]["gold"] += 30
            self.players[ws_id]["moral"] = min(100, self.players[ws_id]["moral"] + 10)
        elif civ_id == "rome":
            self.players[ws_id]["gold"] += 25
            self.players[ws_id]["weapons"] += 10
        elif civ_id == "hellen":
            self.players[ws_id]["food"] += 30
            self.players[ws_id]["stone"] += 20
        return {"status": 200, "civilization": civ_id}

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

    def attack(self, ws_id: str, from_tid: int, to_tid: int,
               bombard: bool = False, ram: bool = False, catapult: bool = False,
               naval: bool = False) -> dict:
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

        # ── Siege preparation ──
        siege_bonus = {"power": 0, "breach": 0}
        naval_used = False
        p = self.players.get(ws_id)

        # ── Naval attack ──
        if naval and p and p.get("ships", 0) >= 1:
            src_is_coastal = src.get("type") in ("port", "city", "capital")
            if src_is_coastal:
                ships_used = min(p["ships"], 3)
                p["ships"] -= ships_used
                siege_bonus["power"] += 0.2 * ships_used
                siege_bonus["breach"] += 0.1 * ships_used
                naval_used = True
                self.add_log(ws_id, f"⚓ Attaque navale ! {ships_used} navires engagent la flotte ennemie.")

        if dst["fortLevel"] > 0:
            if bombard and p and p.get("gold", 0) >= 40:
                p["gold"] -= 40
                breach = random.random() < 0.5 + (0.2 if catapult else 0)
                if breach:
                    dst["fortLevel"] = max(0, dst["fortLevel"] - 1)
                    self.add_log(ws_id, f"Bombardement ! Les remparts de {dst['name']} cedent !")
                else:
                    self.add_log(ws_id, f"Bombardement sur {dst['name']}, mais les remparts tiennent bon.")
            if ram and p and p.get("wood", 0) >= 25:
                p["wood"] -= 25
                siege_bonus["power"] += 0.25
                self.add_log(ws_id, "Belier de siege en position !")
            if catapult and p and p.get("gold", 0) >= 60:
                p["gold"] -= 60
                siege_bonus["breach"] += 0.3
                siege_bonus["power"] += 0.15
                self.add_log(ws_id, "Catapulte deployee ! Les projectiles frappent les remparts.")

        return {"status": 200,
                "battle": self._resolve_battle(ws_id, from_tid, to_tid, siege_bonus, naval=naval_used)}

    def _resolve_battle(self, attacker_id: str, from_tid: int, to_tid: int,
                        siege_bonus: Optional[dict] = None,
                        naval: bool = False) -> dict:
        if siege_bonus is None:
            siege_bonus = {"power": 0, "breach": 0}
        src = self._get_territory(from_tid)
        dst = self._get_territory(to_tid)
        defender_id = dst["owner"]

        atk_army = src["army"]
        def_army = dst["army"]

        atk_power = atk_army * (1.0 + siege_bonus.get("power", 0))
        def_power = def_army * 1.2

        # Fort level contributes less if siege weapons breached the walls
        fort_penalty = 1.0 - min(0.5, siege_bonus.get("breach", 0))
        def_power += dst["fortLevel"] * 8 * fort_penalty

        terrain_mult = TERRAIN_BONUS.get(dst["type"], 1.0)
        def_power *= terrain_mult

        # Weapons bonus
        if attacker_id in self.players:
            atk_power += self.players[attacker_id]["weapons"] * 0.5
        if defender_id in self.players:
            def_power += self.players[defender_id]["weapons"] * 0.5

        # Building defense bonus
        for bk in dst.get("buildings", []):
            bdef = BUILDINGS.get(bk)
            if bdef:
                def_power += bdef.get("defense", 0) * 5

        # Interior wall defense
        wall_def = self.get_wall_defense(to_tid)
        def_power += wall_def * def_army

        if defender_id and self.players.get(defender_id):
            def_moral = self.players[defender_id]["moral"] / 100.0
            def_power *= (0.8 + 0.4 * def_moral)

        # ── Character bonuses ──
        atk_char = self.players[attacker_id].get("character") if attacker_id in self.players else None
        def_char = self.players[defender_id].get("character") if defender_id and defender_id in self.players else None
        if atk_char and atk_char in CHARACTERS:
            cb = CHARACTERS[atk_char]["bonus"]
            atk_power *= (1.0 + cb.get("attack_power", 0))
            if cb.get("guerilla_bonus") and not dst["capital"]:
                atk_power *= (1.0 + cb["guerilla_bonus"])
        if def_char and def_char in CHARACTERS:
            cb = CHARACTERS[def_char]["bonus"]
            def_power *= (1.0 + cb.get("defense_power", 0))

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
            "fortLevel": dst["fortLevel"],
            "siegePower": siege_bonus.get("power", 0),
            "siegeBreach": siege_bonus.get("breach", 0),
            "naval": naval,
        }
        if attacker_wins:
            lw_reward = 30 + dst["fortLevel"] * 5 + (10 if dst["capital"] else 0)
            result["lwReward"] = lw_reward

        src["army"] -= atk_losses
        dst["army"] -= def_losses

        if attacker_wins:
            src["army"] -= 1
            remaining = dst["army"]
            dst["owner"] = attacker_id
            dst["army"] = max(1, remaining)
            dst["fortLevel"] = max(0, dst["fortLevel"] - 1)

            # LW Points for victory (base 30 + bonus for fort level + territory value)
            lw_reward = 30 + dst["fortLevel"] * 5 + (10 if dst["capital"] else 0)
            if attacker_id in self.players:
                self.players[attacker_id]["lwPoints"] += lw_reward

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
            atk_name = self.players[attacker_id]["username"] if attacker_id in self.players else "Inconnu"
            def_name = self.players[defender_id]["username"] if defender_id and defender_id in self.players else "Inconnu"
            self.add_chronicle("bataille",
                f"Bataille de {dst['name']} : {atk_name} remporte une eclatante victoire sur {def_name} ! "
                f"{atk_losses} guerriers puniques tombes, {def_losses} ennemis aneantis.",
                "𐤁𐤏𐤋 𐤇𐤍𐤁𐤏𐤋")
        else:
            if defender_id and self.players.get(defender_id):
                self.players[defender_id]["moral"] = min(100,
                    self.players[defender_id]["moral"] + 5)
            self.add_log(attacker_id, f"Attaque repoussee a {dst['name']}")
            self.add_log(defender_id, f"{dst['name']} defendue avec succes")
            atk_name = self.players[attacker_id]["username"] if attacker_id in self.players else "Inconnu"
            def_name = self.players[defender_id]["username"] if defender_id and defender_id in self.players else "Inconnu"
            self.add_chronicle("bataille",
                f"Assaut repousse a {dst['name']} : les legions de {atk_name} ont ete brisees par les remparts de {def_name}.",
                "𐤒𐤓𐤕𐤟 𐤄𐤍𐤁𐤏𐤋")

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
        self.add_chronicle("diplomatie",
            f"Traite d'alliance signe entre {from_name} et {to_name} : les deux cites unissent leurs forces.",
            "𐤃𐤁𐤓𐤌 𐤒𐤓𐤕𐤟")

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
        self.add_chronicle("diplomatie",
            f"TRAHISON ! {from_name} a rompu le pacte sacre qui le liait a {to_name}. Les dieux se detournent de Carthage.",
            "𐤀𐤋𐤍𐤉 𐤒𐤓𐤕𐤟")

        if ws_id in self.players:
            self.players[ws_id]["moral"] = max(20, self.players[ws_id]["moral"] - 20)
        if ally_id in self.players:
            self.players[ally_id]["moral"] = max(20, self.players[ally_id]["moral"] - 10)

        return {"status": 200}

    def fortify(self, ws_id: str, tid: int, use_stone: bool = False) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}

        t = self._get_territory(tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Territoire invalide", "status": 400}

        if t["fortLevel"] >= 5:
            return {"error": "Fortification au maximum", "status": 400}

        char_id = self.players[ws_id].get("character")
        discount = 1.0
        if char_id and char_id in CHARACTERS:
            discount = 1.0 - CHARACTERS[char_id]["bonus"].get("fortify_discount", 0)

        stone_cost = max(1, int(8 * discount))
        gold_cost = max(1, int((20 + t["fortLevel"] * 15) * discount))

        if use_stone and self.players[ws_id]["stone"] >= stone_cost:
            self.players[ws_id]["stone"] -= stone_cost
            self.add_log(ws_id, f"Fortifications renforcees a {t['name']} (pierre)")
        elif self.players[ws_id]["gold"] >= gold_cost:
            self.players[ws_id]["gold"] -= gold_cost
            self.add_log(ws_id, f"Fortifications renforcees a {t['name']} (or)")
        else:
            return {"error": f"Or insuffisant ({gold_cost} requis) ou pierre ({stone_cost} requis)", "status": 400}

        t["fortLevel"] += 1
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

    def construct(self, ws_id: str, tid: int, building_key: str, slot: int = -1) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}
        if building_key not in BUILDINGS:
            return {"error": "Batiment inconnu", "status": 400}

        t = self._get_territory(tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Territoire invalide", "status": 400}

        bdef = BUILDINGS[building_key]
        if building_key in t["buildings"]:
            return {"error": f"{bdef['name']} deja construit ici", "status": 400}

        # Type restrictions
        type_restrictions = {
            "temple": ("city", "capital"),
            "walls": ("city", "capital"),
            "fortress": ("city", "capital"),
            "shipyard": ("port", "city", "capital"),
            "quarry": ("fort", "city", "capital"),
            "forge": ("city", "capital"),
        }
        if building_key in type_restrictions:
            allowed = type_restrictions[building_key]
            if t["type"] not in allowed:
                return {"error": f"{bdef['name']} requis: {', '.join(allowed)}", "status": 400}

        cost = bdef["cost"]
        char_id = self.players[ws_id].get("character")
        if char_id and char_id in CHARACTERS:
            discount = CHARACTERS[char_id]["bonus"].get("build_discount", 0)
            cost = max(1, int(cost * (1.0 - discount)))

        if self.players[ws_id]["gold"] < cost:
            return {"error": f"Or insuffisant ({cost} requis)", "status": 400}

        self.players[ws_id]["gold"] -= cost
        t["buildings"].append(building_key)

        # Place in city grid
        cg = t.get("city_grid", [])
        if cg:
            if 0 <= slot < len(cg) and not cg[slot]:
                cg[slot] = building_key
            else:
                first_empty = next((i for i, v in enumerate(cg) if not v), -1)
                if first_empty >= 0:
                    cg[first_empty] = building_key

        # City evolution: each building increases city level
        t["level"] = min(10, t["level"] + 1)
        t["population"] += random.randint(100, 500)

        # Level milestone bonuses
        if t["level"] == 3:
            t["population"] += 1000
            self.add_log(ws_id, f"{t['name']} atteint le niveau 3 — Ville en plein essor !")
        elif t["level"] == 5:
            t["population"] += 2000
            t["fortLevel"] = min(5, t["fortLevel"] + 1)
            self.add_log(ws_id, f"{t['name']} atteint le niveau 5 — Metropole prospere !")
        elif t["level"] == 8:
            t["population"] += 5000
            self.add_log(ws_id, f"{t['name']} atteint le niveau 8 — Megapole carthaginoise !")

        # Apply immediate effects
        if bdef["fort"]:
            t["fortLevel"] = min(5, t["fortLevel"] + bdef["fort"])
        if bdef["moral"]:
            self.players[ws_id]["moral"] = min(100, self.players[ws_id]["moral"] + bdef["moral"])
        if bdef["defense"]:
            pass  # applied dynamically in combat resolution

        self.add_log(ws_id, f"{bdef['name']} construit a {t['name']} (Niv.{t['level']})")
        username = self.players[ws_id]["username"]
        if bdef['name'] in ("Temple de Tanit", "Sanctuaire"):
            self.add_chronicle("construction",
                f"Un nouveau temple s'eleve a {t['name']}. Les pretres de Baal Hammon benissent la cite.",
                "𐤀𐤋𐤍𐤉 𐤒𐤓𐤕𐤟")
        elif bdef['name'] in ("Chantier naval", "Port de guerre"):
            self.add_chronicle("construction",
                f"{username} agrandit le port de {t['name']}. De nouvelles trirèmes prennent la mer.",
                "𐤁𐤏𐤋 𐤇𐤍𐤁𐤏𐤋")
        else:
            self.add_chronicle("construction",
                f"{bdef['name']} erige a {t['name']} par les soins de {username}. La cite s'embellit.",
                "𐤃𐤁𐤓𐤌 𐤒𐤓𐤕𐤟")
        return {"status": 200}

    # ── Upgrade city center ─────────────────────────────────

    def upgrade_city(self, ws_id: str, tid: int) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification requise", "status": 400}
        if ws_id not in self.players:
            return {"error": "Joueur introuvable", "status": 404}
        t = self._get_territory(tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Territoire invalide", "status": 400}
        if t["level"] >= 10:
            return {"error": "Niveau maximum atteint", "status": 400}
        cost = t["level"] * 100
        if self.players[ws_id]["gold"] < cost:
            return {"error": f"Or insuffisant ({cost} requis)", "status": 400}
        self.players[ws_id]["gold"] -= cost
        t["level"] += 1
        t["population"] += 200 * t["level"]
        self.add_log(ws_id, f"{t['name']} passe au niveau {t['level']}")
        self.add_chronicle("construction",
            f"Le centre-ville de {t['name']} est developpe (niveau {t['level']}).",
            "𐤒𐤓𐤕 𐤓𐤁")
        return {"status": 200}

    # ── Interior city building ──────────────────────────────────

    INTERIOR_BUILDINGS = {
        "wall":    {"name": "Mur",        "icon": "🧱", "cost": 30, "defense": 0.05},
        "wall_2":  {"name": "Mur renf.",  "icon": "🧱", "cost": 60, "defense": 0.10},
        "wall_3":  {"name": "Citadelle",  "icon": "🏰", "cost": 120, "defense": 0.20},
        "barracks":{"name": "Caserne",    "icon": "⚔️", "cost": 100, "army": 200},
        "market":  {"name": "Marche",     "icon": "💰", "cost": 80, "gold": 15},
        "house":   {"name": "Logement",   "icon": "🏠", "cost": 50, "pop": 500},
        "street":  {"name": "Rue",        "icon": "🛤", "cost": 5,  "pop": 50},
        "plaza":   {"name": "Place",      "icon": "⛲", "cost": 40, "moral": 5, "pop": 200},
        "hammam":  {"name": "Hammam",     "icon": "♨️", "cost": 60, "moral": 8, "pop": 300},
        "temple_small":{"name":"Temple",  "icon": "☥", "cost": 50, "moral": 10},
        "tree":    {"name": "Arbre",      "icon": "🌲", "cost": 15, "wood": 2, "pop": 20},
        "pine":    {"name": "Pin",        "icon": "🌲", "cost": 25, "wood": 4, "pop": 30},
        "rocks":   {"name": "Rocher",     "icon": "⛰", "cost": 25, "stone": 2},
        "mountain":{"name": "Montagne",   "icon": "🗻", "cost": 45, "stone": 5, "defense": 0.03},
        "garden":  {"name": "Jardin",     "icon": "🌺", "cost": 20, "food": 3, "moral": 3},
        "fountain":{"name": "Fontaine",   "icon": "⛲", "cost": 35, "moral": 6, "pop": 100},
    }

    WALL_UPGRADE_PATH = {"wall": "wall_2", "wall_2": "wall_3"}

    def build_interior(self, ws_id: str, tid: int, building: str, gx: int, gy: int) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification requise", "status": 400}
        if ws_id not in self.players:
            return {"error": "Joueur introuvable", "status": 404}
        t = self._get_territory(tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Territoire invalide", "status": 400}
        bdef = self.INTERIOR_BUILDINGS.get(building)
        if not bdef:
            return {"error": "Batiment inconnu", "status": 400}
        ig = t.get("interior_grid", [])
        if not ig or not (0 <= gy < len(ig) and 0 <= gx < len(ig[0])):
            return {"error": "Position invalide", "status": 400}
        current = ig[gy][gx]
        # Wall upgrade
        if current and current.startswith("wall") and building.startswith("wall"):
            next_wall = self.WALL_UPGRADE_PATH.get(current)
            if next_wall != building:
                return {"error": f"Ameliore d'abord en {next_wall}", "status": 400}
        elif current is not None:
            return {"error": "Case deja occupee", "status": 400}
        cost = bdef["cost"]
        if self.players[ws_id]["gold"] < cost:
            return {"error": f"Or insuffisant ({cost} requis)", "status": 400}
        self.players[ws_id]["gold"] -= cost
        ig[gy][gx] = building
        # Apply effects
        if bdef.get("army"):
            t["army"] += bdef["army"]
        if bdef.get("pop"):
            t["population"] += bdef["pop"]
        if bdef.get("moral"):
            self.players[ws_id]["moral"] = min(100, self.players[ws_id]["moral"] + bdef["moral"])
        self.add_log(ws_id, f"{bdef['name']} construit dans {t['name']}")
        return {"status": 200}

    def get_wall_defense(self, tid: int) -> float:
        t = self._get_territory(tid)
        if not t:
            return 0
        ig = t.get("interior_grid", [])
        total = 0
        for row in ig:
            for cell in row:
                if cell and cell.startswith("wall"):
                    bdef = self.INTERIOR_BUILDINGS.get(cell, {})
                    total += bdef.get("defense", 0.05)
        return total

    PLACEABLE_ITEMS = {
        "wheat_field": {"name": "Champ de ble", "icon": "🌾", "cost": 5, "category": "agriculture"},
        "olive_tree": {"name": "Olivier", "icon": "🫒", "cost": 8, "category": "agriculture"},
        "vineyard": {"name": "Vignoble", "icon": "🍇", "cost": 10, "category": "agriculture"},
        "resin_tree": {"name": "Arbre a resine", "icon": "🌲", "cost": 5, "category": "forestry"},
        "wood_tree": {"name": "Arbre a bois", "icon": "🌳", "cost": 6, "category": "forestry"},
        "stone_pile": {"name": "Rocher", "icon": "⛰", "cost": 15, "category": "resource"},
    }

    def place_item(self, ws_id: str, tid: int, item_type: str, px: float, py: float) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}
        if item_type not in self.PLACEABLE_ITEMS:
            return {"error": "Element inconnu", "status": 400}
        t = self._get_territory(tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Territoire invalide", "status": 400}

        p = self.players.get(ws_id)
        if not p:
            return {"error": "Joueur introuvable", "status": 404}

        item = self.PLACEABLE_ITEMS[item_type]
        cost = item["cost"]
        if p["gold"] < cost:
            return {"error": f"Or insuffisant ({cost} requis)", "status": 400}

        p["gold"] -= cost
        t["placements"].append({
            "type": item_type,
            "x": max(0.05, min(0.95, px)),
            "y": max(0.05, min(0.95, py)),
            "time": time.time(),
        })

        self.add_log(ws_id, f"{item['name']} place a {t['name']}")
        return {"status": 200}

    # ── LW Points Construction ──────────────────────────────────────────

    LW_COSTS = {
        "ship":    {"name": "Navire de guerre", "lw": 50},
        "weapons": {"name": "Lot d'armes",      "lw": 30},
        "factory": {"name": "Usine d'armes",    "lw": 80},
    }

    def build_lw(self, ws_id: str, item: str) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}
        if item not in self.LW_COSTS:
            return {"error": "Objet inconnu", "status": 400}
        p = self.players.get(ws_id)
        if not p:
            return {"error": "Joueur introuvable", "status": 404}
        cost = self.LW_COSTS[item]["lw"]
        if p["lwPoints"] < cost:
            return {"error": f"Points LW insuffisants ({cost} requis)", "status": 400}

        p["lwPoints"] -= cost
        name = self.LW_COSTS[item]["name"]

        if item == "ship":
            p["ships"] += 1
        elif item == "weapons":
            p["weapons"] += 10
        elif item == "factory":
            p["lw_factories"] = p.get("lw_factories", 0) + 1

        self.add_log(ws_id, f"{name} construit ({cost} LW)")
        self.add_chronicle("construction",
            f"Production de guerre : {name} acheve dans les ateliers de Carthage ({cost} LW).",
            "𐤁𐤏𐤋 𐤇𐤍𐤁𐤏𐤋")
        return {"status": 200, "lwPoints": p["lwPoints"]}

    def buy_item(self, ws_id: str, item_id: str) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}
        if item_id not in MARKET_ITEMS:
            return {"error": "Objet inconnu au marche", "status": 400}
        p = self.players.get(ws_id)
        if not p:
            return {"error": "Joueur introuvable", "status": 404}

        item = MARKET_ITEMS[item_id]
        if item["cost_gold"] > 0 and p.get("gold", 0) < item["cost_gold"]:
            return {"error": f"Or insuffisant ({item['cost_gold']} requis)", "status": 400}
        if item["cost_lw"] > 0 and p.get("lwPoints", 0) < item["cost_lw"]:
            return {"error": f"Points LW insuffisants ({item['cost_lw']} requis)", "status": 400}

        wood_needed = item.get("cost_wood", 0)
        if wood_needed > 0 and p.get("wood", 0) < wood_needed:
            return {"error": f"Bois insuffisant ({wood_needed} requis)", "status": 400}

        p["gold"] -= item["cost_gold"]
        p["lwPoints"] -= item["cost_lw"]
        if wood_needed:
            p["wood"] -= wood_needed

        # Apply effects
        for eff_key, eff_val in item["effect"].items():
            if eff_key == "weapons":
                p["weapons"] = p.get("weapons", 0) + eff_val
            elif eff_key == "moral":
                p["moral"] = min(100, p.get("moral", 50) + eff_val)
            elif eff_key == "ships":
                p["ships"] = p.get("ships", 0) + eff_val
            elif eff_key == "lwPoints":
                p["lwPoints"] = p.get("lwPoints", 0) + eff_val
            elif eff_key in ("attack_bonus", "defense_bonus"):
                p[eff_key] = p.get(eff_key, 0.0) + eff_val
            elif eff_key in ("food_income", "gold_income", "marble_income", "moral_income", "ship_income", "stone_income"):
                p[eff_key] = p.get(eff_key, 0) + eff_val

        # Track inventory
        inv = p.setdefault("inventory", [])
        inv.append(item_id)

        self.add_log(ws_id, f"Achat au marche PixSoftPay : {item['name']}")
        username = p["username"]
        self.add_chronicle("evenement",
            f"Le marche PixSoftPay enregistre un achat de prestige : {item['name']} acquis par {username}.",
            "𐤃𐤁𐤓𐤌 𐤒𐤓𐤕𐤟")
        return {"status": 200, "gold": p["gold"], "lwPoints": p["lwPoints"], "inventory": inv}

    def set_ready(self, ws_id: str) -> dict:
        if self.phase == "setup":
            self.players[ws_id]["setupDone"] = True
            self.players[ws_id]["ready"] = True
            if all(p["setupDone"] for p in self.players.values()):
                self._start_game()
            return {"status": 200}

        if self.phase != "planning":
            return {"error": "Ce n'est pas la phase de planification", "status": 400}

        self.players[ws_id]["ready"] = True

        if all(p["ready"] for p in self.players.values()):
            self._resolve_phase()

        return {"status": 200}

    def mobilize(self, ws_id: str, tid: int = 0) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification terminee", "status": 400}
        p = self.players.get(ws_id)
        if not p:
            return {"error": "Joueur introuvable", "status": 404}

        # Target city: default capital (Carthage, id=0), or specified territory
        target_tid = tid if tid and self._get_territory(tid) and self._get_territory(tid)["owner"] == ws_id else 0
        t = self._get_territory(target_tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Territoire invalide", "status": 400}

        cost = 50 + t["level"] * 10
        if p["gold"] < cost:
            return {"error": f"Or insuffisant pour mobiliser ({cost} requis)", "status": 400}

        p["gold"] -= cost
        t["fortLevel"] = min(5, t["fortLevel"] + 2)
        t["army"] += 10
        p["moral"] = min(100, p["moral"] + 15)
        t["level"] = min(10, t["level"] + 1)

        self.add_log(None, f"⚠️ MOBILISATION GENERALE a {t['name']} ! Remparts +2, armee +10, moral +15")
        username = p["username"]
        self.add_chronicle("evenement",
            f"MOBILISATION GENERALE a {t['name']} decretee par {username} ! "
            f"Tous les citoyens valides sont appeles a defendre la cite.",
            "𐤒𐤓𐤕𐤟 𐤄𐤍𐤁𐤏𐤋")
        return {"status": 200, "territory": t["name"], "fortLevel": t["fortLevel"]}

    def set_unready(self, ws_id: str) -> dict:
        self.players[ws_id]["ready"] = False
        return {"status": 200}

    # ── Fondation de ville ─────────────────────────────────────

    def found_city(self, ws_id: str, lon: float, lat: float, name: str) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification requise", "status": 400}
        if ws_id not in self.players:
            return {"error": "Joueur introuvable", "status": 404}
        if lon is None or lat is None or not (-20 <= lon <= 50) or not (15 <= lat <= 60):
            return {"error": "Position invalide", "status": 400}
        p = self.players[ws_id]
        if not name or len(name.strip()) < 2:
            return {"error": "Nom de ville invalide (min 2 caracteres)", "status": 400}
        cost = 300
        if p["gold"] < cost:
            return {"error": f"Or insuffisant ({p['gold']}/{cost})", "status": 400}

        name = name.strip()[:40]
        new_id = max(t["id"] for t in self.territories) + 1

        new_t = {
            "id": new_id, "name": name, "lon": round(lon, 4), "lat": round(lat, 4),
            "type": "city", "capital": False, "land": True, "adj": [],
            "army": 100, "population": 500, "owner": ws_id,
            "buildings": [], "placements": [], "fortLevel": 0, "level": 1,
            "income_distributed": False,
            "foodIncome": 1, "shipIncome": 0, "stoneIncome": 0, "goldIncome": 1,
            "city_grid": [""] * 9,
            "interior_grid": None,
        }

        if new_t["interior_grid"] is None:
            GS = 12
            ig = [[None]*GS for _ in range(GS)]
            octagon = lambda r,c: (
                (r == 0 or r == GS-1) and 4 <= c <= 7 or
                (r == 1 or r == GS-2) and 3 <= c <= 8 or
                (r == 2 or r == GS-3) and 2 <= c <= 9 or
                (r == 3 or r == GS-4) and 1 <= c <= 10 or
                4 <= r <= 7 and 0 <= c <= GS-1
            )
            for r in range(GS):
                for c in range(GS):
                    if octagon(r, c):
                        if not octagon(r-1, c) or not octagon(r+1, c) or not octagon(r, c-1) or not octagon(r, c+1):
                            ig[r][c] = "wall"
            ig[5][5] = ig[6][6] = "center"
            new_t["interior_grid"] = ig

        # Compute adjacency: link to nearest territories within 1000 km
        dists = []
        for t in self.territories:
            if t["id"] != new_id:
                d = haversine(lon, lat, t["lon"], t["lat"])
                dists.append((d, t["id"]))
        dists.sort(key=lambda x: x[0])
        for k in range(min(6, len(dists))):
            if dists[k][0] < 1500:
                new_t["adj"].append(dists[k][1])
                other = self._get_territory(dists[k][1])
                if other and new_id not in other.get("adj", []):
                    other["adj"].append(new_id)

        self.territories.append(new_t)
        p["territories"].append(new_id)
        p["gold"] -= cost
        p["totalArmy"] = sum(
            (self._get_territory(tid) or {}).get("army", 0) for tid in p["territories"]
        )
        self.add_log(ws_id, f"Nouvelle ville fondee : {name}")
        self.add_chronicle("construction",
            f"La ville de {name} est fondee par {p['username']}.",
            "𐤒𐤓𐤕 𐤇𐤃𐤔𐤕")
        return {"status": 200, "tid": new_id}

    # ── Destruction de ville ────────────────────────────────────

    def destroy_city(self, ws_id: str, tid: int) -> dict:
        if self.phase != "planning":
            return {"error": "Phase de planification requise", "status": 400}
        if ws_id not in self.players:
            return {"error": "Joueur introuvable", "status": 404}
        t = self._get_territory(tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Vous ne possedez pas cette ville", "status": 400}
        if t.get("capital"):
            return {"error": "Impossible de detruire la capitale", "status": 400}
        p = self.players[ws_id]
        refund = 150
        p["gold"] += refund
        p["territories"] = [x for x in p["territories"] if x != tid]
        for other in self.territories:
            if tid in other.get("adj", []):
                other["adj"].remove(tid)
        self.territories = [x for x in self.territories if x["id"] != tid]
        p["totalArmy"] = sum(
            (self._get_territory(tid) or {}).get("army", 0) for tid in p["territories"]
        )
        self.add_log(ws_id, f"Ville detruite : {t['name']}")
        self.add_chronicle("destruction",
            f"La ville de {t['name']} est abandonnee par {p['username']}.",
            "𐤒𐤓𐤕 𐤇𐤓𐤁")
        return {"status": 200}

    # ── Setup Phase: Distribute Population & Soldiers ─────────────────────

    def distribute(self, ws_id: str, tid: int, population: int = 0, soldiers: int = 0) -> dict:
        if self.phase != "setup":
            return {"error": "Phase d'installation terminee", "status": 400}
        if ws_id not in self.players:
            return {"error": "Joueur introuvable", "status": 404}

        p = self.players[ws_id]
        if p["setupDone"]:
            return {"error": "Vous avez deja termine votre distribution", "status": 400}

        t = self._get_territory(tid)
        if not t or t["owner"] != ws_id:
            return {"error": "Territoire invalide", "status": 400}

        if population < 0 or soldiers < 0:
            return {"error": "Valeurs negatives interdites", "status": 400}
        if soldiers > population:
            return {"error": "Les soldats ne peuvent depasser la population", "status": 400}
        if population > p["availablePopulation"]:
            return {"error": f"Population insuffisante (reste: {p['availablePopulation']})", "status": 400}
        if soldiers > p["availableSoldiers"]:
            return {"error": f"Soldats insuffisants (reste: {p['availableSoldiers']})", "status": 400}

        p["availablePopulation"] -= population
        p["availableSoldiers"] -= soldiers
        t["population"] += population
        t["army"] += soldiers

        if p["availablePopulation"] == 0 and p["availableSoldiers"] == 0:
            p["setupDone"] = True
            p["ready"] = True
            p["totalArmy"] = sum(
                self._get_territory(tid)["army"] for tid in p["territories"]
            )
            self.add_log(ws_id, "Distribution terminee ! Pret pour la guerre.")

            # Check if all players done -> start game
            if all(pl["setupDone"] for pl in self.players.values()):
                self._start_game()

        return {"status": 200, "availablePopulation": p["availablePopulation"], "availableSoldiers": p["availableSoldiers"]}

    def _start_game(self):
        """Transition from setup to first planning phase"""
        self.phase = "planning"
        self.phase_deadline = time.time() + 120
        self.turn = 1

        # Give initial resources based on setup
        for ws_id in self.players:
            p = self.players[ws_id]
            # Resources based on territory count
            p["gold"] = 500
            p["food"] = 2000
            p["ships"] = 5
            p["stone"] = 100
            p["weapons"] = 50
            p["wood"] = 100
            p["marble"] = 50

            # Income distribution
            for tid in p["territories"]:
                t = self._get_territory(tid)
                if t:
                    if not t.get("income_distributed"):
                        base = {"city": (3,0,0,3), "port": (2,1,0,2), "fort": (1,0,2,2), "temple": (1,0,0,2), "capital": (4,1,1,3)}
                        f, sh, st, g = base.get(t["type"], (1,0,0,1))
                        if t["capital"]:
                            f, sh, st, g = 4, 1, 1, 3
                        t["goldIncome"] = g
                        t["foodIncome"] = f
                        t["shipIncome"] = sh
                        t["stoneIncome"] = st
                        t["income_distributed"] = True

        self.add_chronicle("evenement",
            "La guerre commence ! Les armees de Carthage se deploient a travers le monde connu.",
            "𐤒𐤓𐤕𐤟 𐤇𐤃𐤔𐤕 𐤕𐤌𐤃 𐤋𐤏𐤋𐤌𐤟")

    # ── Phase Resolution ──────────────────────────────────────────────────

    def _resolve_phase(self):
        self.phase = "resolution"

        for ws_id in self.players:
            self.players[ws_id]["ready"] = False

        # Advance calendar: each turn = 1 season
        self.season += 1
        if self.season > 3:
            self.season = 0
            self.year -= 1  # Going back in time (BC)
            self.add_log(None, f"Nouvelle annee ! Nous sommes en {abs(self.year)} av. J.-C.")
            self.add_chronicle("evenement",
                f"Nouvelle annee ! Nous sommes en {abs(self.year)} av. J.-C. "
                f"Les moissons d'automne sont rentrees, les armees se preparent pour les campagnes a venir.",
                "𐤒𐤓𐤕𐤟 𐤇𐤃𐤔𐤕 𐤕𐤌𐤃 𐤋𐤏𐤋𐤌𐤟")

        self.turn += 1
        self.start_planning()

    def start_planning(self):
        self.phase = "planning"
        self.phase_deadline = time.time() + 120

        for ws_id in self.players:
            p = self.players[ws_id]

            # Base resource income from territories
            gold_inc = 0
            food_inc = 0
            ship_inc = 0
            stone_inc = 0
            weap_inc = 0
            wood_inc = 0
            marble_inc = 0
            for tid in p["territories"]:
                t = self._get_territory(tid)
                if t:
                    gold_inc += t.get("goldIncome", 5)
                    food_inc += t.get("foodIncome", 1)
                    ship_inc += t.get("shipIncome", 0)
                    stone_inc += t.get("stoneIncome", 0)

            # Building income + city level bonus
            for tid in p["territories"]:
                t = self._get_territory(tid)
                if t:
                    level_bonus = t.get("level", 1) * 1.5
                    for bk in t["buildings"]:
                        bd = BUILDINGS.get(bk, {})
                        gold_inc += int(bd.get("gold", 0) * level_bonus)
                        food_inc += int(bd.get("food", 0) * level_bonus)
                        ship_inc += int(bd.get("ship", 0) * level_bonus)
                        stone_inc += int(bd.get("stone", 0) * level_bonus)
                        weap_inc += int(bd.get("weapon", 0) * level_bonus)
                        if bk == "resin":
                            wood_inc += int(2 * level_bonus)
                        if bk == "quarry":
                            marble_inc += int(1 * level_bonus)
                    # Base income scales with level
                    gold_inc += max(0, t.get("level", 1) - 1)
                    food_inc += max(0, t.get("level", 1) - 1)

                # Interior building resource income
                if t.get("interior_grid"):
                    for row in t["interior_grid"]:
                        for cell in row:
                            if cell and cell in self.INTERIOR_BUILDINGS:
                                ib = self.INTERIOR_BUILDINGS[cell]
                                gold_inc += ib.get("gold", 0)
                                food_inc += ib.get("food", 0)
                                wood_inc += ib.get("wood", 0)
                                stone_inc += ib.get("stone", 0)

            # Factory passive weapon production
            weap_inc += p.get("lw_factories", 0) * 2

            # Character bonuses
            char_id = p.get("character")
            if char_id and char_id in CHARACTERS:
                cb = CHARACTERS[char_id]["bonus"]
                food_inc += cb.get("food_income", 0)
                ship_inc += cb.get("ship_income", 0)
                gold_inc += cb.get("gold_income", 0)
                gold_inc += cb.get("gold_extra", 0)

            p["gold"] += gold_inc
            p["food"] += food_inc
            p["ships"] += ship_inc
            p["stone"] += stone_inc
            p["weapons"] += weap_inc
            p["wood"] = p.get("wood", 0) + wood_inc
            p["marble"] = p.get("marble", 0) + marble_inc

            # Risk-style reinforcements
            territories = len(p["territories"])
            if territories > 0:
                reinforcement = max(10, territories)
                per_territory = reinforcement // territories
                for tid in p["territories"]:
                    t = self._get_territory(tid)
                    if t and t["owner"] == ws_id:
                        t["army"] += per_territory
                remaining = reinforcement % territories
                if remaining:
                    t = self._get_territory(p["territories"][0])
                    if t:
                        t["army"] += remaining

                # Population growth (2% per turn)
                for tid in p["territories"]:
                    t = self._get_territory(tid)
                    if t and t["owner"] == ws_id:
                        growth = max(1, int(t["population"] * 0.02))
                        t["population"] += growth

            p["moral"] = min(100, p["moral"] + 3)
            p["ready"] = False

            p["totalArmy"] = sum(
                self._get_territory(tid)["army"] for tid in p["territories"]
            )

        if len(p["territories"]) == 0:
            self.winner = list(self.players.keys())[0]

    def to_full_state(self) -> dict:
        return {
            "gameId": self.game_id,
            "turn": self.turn,
            "year": self.year,
            "season": ["Printemps","Été","Automne","Hiver"][self.season],
            "seasonId": self.season,
            "phase": self.phase,
            "players": {pid: {
                "username": p["username"],
                "character": p.get("character"),
                "civilization": p.get("civilization", "carthage"),
                "gold": p["gold"],
                "food": p.get("food", 0),
                "ships": p.get("ships", 0),
                "stone": p.get("stone", 0),
                "weapons": p.get("weapons", 0),
                "wood": p.get("wood", 0),
                "marble": p.get("marble", 0),
                "lwPoints": p.get("lwPoints", 0),
                "lwFactories": p.get("lw_factories", 0),
                "moral": p["moral"],
                "totalArmy": p["totalArmy"],
                "territoryCount": len(p["territories"]),
                "ready": p["ready"],
                "inventory": p.get("inventory", []),
                "setupDone": p.get("setupDone", False),
                "availablePopulation": p.get("availablePopulation", 0),
                "availableSoldiers": p.get("availableSoldiers", 0),

            } for pid, p in self.players.items()},
            "territories": [{
                "id": t["id"],
                "name": t["name"],
                "type": t["type"],
                "capital": t["capital"],
                "lon": t.get("lon"),
                "lat": t.get("lat"),
                "land": t.get("land", True),
                "adj": t["adj"],
                "owner": t["owner"],
                "army": t["army"],
                "fortLevel": t["fortLevel"],
                "level": t.get("level", 1),
                "population": t.get("population", 0),
                "buildings": t["buildings"],
                "placements": t.get("placements", []),
                "foodIncome": t.get("foodIncome", 0),
                "shipIncome": t.get("shipIncome", 0),
                "stoneIncome": t.get("stoneIncome", 0),
                "goldIncome": t.get("goldIncome", 0),
                "city_grid": t.get("city_grid", []),
                "interior_grid": t.get("interior_grid", []),
            } for t in self.territories],
            "alliances": [
                [list(a)[0], list(a)[1]] for a in self.alliances
            ],
            "pendingAlliances": [
                {"from": p["from"], "to": p["to"]} for p in self.pending_alliances
            ],
            "log": self.message_log[-20:],
            "winner": self.winner,
            "characters": {
                k: {"name": v["name"], "title": v["title"], "desc": v["desc"],
                    "portrait": v["portrait"], "color": v["color"]}
                for k, v in CHARACTERS.items()
            },
            "marketItems": {
                k: {"id": k, "name": v["name"], "desc": v["desc"],
                    "icon": v["icon"], "cost_gold": v["cost_gold"],
                    "cost_lw": v["cost_lw"], "cost_wood": v.get("cost_wood", 0),
                    "rarity": v["rarity"]}
                for k, v in MARKET_ITEMS.items()
            },
            "chronicles": self.chronicles[-50:],
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

    def add_chronicle(self, category: str, text: str, punic_text: str = ""):
        self.chronicle_id += 1
        punic_phrases = [
            "𐤀𐤍𐤊 𐤒𐤓𐤕𐤟", "𐤃𐤁𐤓𐤌 𐤒𐤓𐤕𐤟", "𐤁𐤏𐤋 𐤇𐤍𐤁𐤏𐤋",
            "𐤌𐤋𐤒𐤓𐤕 𐤓𐤁", "𐤄𐤍𐤁𐤏𐤋 𐤒𐤓𐤕𐤟", "𐤀𐤋𐤍𐤉 𐤒𐤓𐤕𐤟",
        ]
        self.chronicles.append({
            "id": self.chronicle_id,
            "turn": self.turn,
            "year": self.year,
            "season": self.season,
            "category": category,
            "text": text,
            "punic": punic_text or random.choice(punic_phrases),
            "time": time.time(),
        })
        if len(self.chronicles) > 200:
            self.chronicles = self.chronicles[-200:]

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
