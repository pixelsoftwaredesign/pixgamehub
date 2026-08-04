#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PixGameHub — Moteur de stratégie générique piloté par config JSON.
Noyau réutilisable pour créer de nouveaux jeux de stratégie sans code :
la config décrit la carte, les empires, les unités, les terrains, les
bâtiments, l'économie, le combat et la condition de victoire.

Les algorithmes de base sont conservés (combat pierre-feuille-ciseaux,
siège des murs, terrains tactiques, économie par tour, génération
déterministe des plans de ville) mais entièrement paramétrés par la config.
"""

import asyncio
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIGS_DIR = Path(__file__).resolve().parent / 'configs'


# ════════════════════════════════════════════════════════════════════
#  Config helpers
# ════════════════════════════════════════════════════════════════════

def default_strat_config():
    """Config équivalente EXACTE au jeu Strat actuel (jeu de référence)."""
    from worldmap import EMPIRE_DATA, TERRITORIES
    return {
        "id": "strat",
        "name": "Strat",
        "icon": "🌍",
        "genre": "Strategie",
        "grid_size": 8,
        "start": {
            "base_soldiers": 100,      # × joueurs du même empire
            "soldier_mult": 1.2,       # +20%
            "gold": 100,
            "food": 100,
            "cap_pop": 5000,
            "home_pop": 1000,
        },
        "economy": {
            "gold_base": 20,
            "gold_per_terr": 5,
            "food_base": 10,
            "food_per_terr": 3,
            "growth_div": 200,         # croissance armée = pop/div (min 1)
        },
        "units": {
            "soldier":  {'name': 'Soldat',   'icon': '🗡️', 'a': 1.0, 'd': 1.0, 'cost': 1},
            "cavalry":  {'name': 'Cavalier', 'icon': '🐴', 'a': 2.5, 'd': 1.5, 'cost': 2},
            "elephant": {'name': 'Éléphant', 'icon': '🐘', 'a': 5.0, 'd': 4.0, 'cost': 5},
            "camel":    {'name': 'Chameau',  'icon': '🐫', 'a': 3.0, 'd': 2.5, 'cost': 3},
            "navy":     {'name': 'Navire',   'icon': '🚢', 'a': 2.0, 'd': 2.0, 'cost': 4},
        },
        "counters": {
            "soldier":  {'soldier': 1.0, 'cavalry': 1.0, 'elephant': 1.0, 'camel': 1.0, 'navy': 1.0},
            "cavalry":  {'soldier': 2.0, 'cavalry': 1.0, 'elephant': 0.5, 'camel': 1.0, 'navy': 1.0},
            "elephant": {'soldier': 1.0, 'cavalry': 2.0, 'elephant': 1.0, 'camel': 0.5, 'navy': 1.0},
            "camel":    {'soldier': 1.0, 'cavalry': 1.0, 'elephant': 2.0, 'camel': 1.0, 'navy': 1.0},
            "navy":     {'soldier': 1.0, 'cavalry': 1.0, 'elephant': 1.0, 'camel': 1.0, 'navy': 1.5},
        },
        "terrains": {
            "plain":   {'icon': '🟫', 'buildable': True,  'open': True},
            "water":   {'icon': '🌊', 'buildable': False, 'sea': True},
            "beach":   {'icon': '🏖️', 'buildable': True,  'open': True, 'beach': True},
            "hill":    {'icon': '⛰️', 'buildable': True,  'defense': 0.05},
            "forest":  {'icon': '🌲', 'buildable': False, 'defense': 0.05, 'forest': True},
            "fertile": {'icon': '🌾', 'buildable': True,  'open': True, 'fertile': True},
        },
        "terrain_gen": {
            "coastal_prob": 0.6,       # probabilité qu'une ville soit côtière
            "water_ratio": 0.55,       # remplissage de la mer côté côte
            "hills": 8,                # nb de cases colline (amas)
            "min_forest": 2, "max_forest": 4,
            "min_fertile": 2, "max_fertile": 3,
        },
        "buildings": {
            "house":    {'name': 'Maison',   'icon': '🏠', 'cost': {'gold': 30,  'wood': 20}, 'pop': 500},
            "farm":     {'name': 'Ferme',    'icon': '🌾', 'cost': {'gold': 20}, 'food': 15, 'fertile_bonus': 22},
            "wall":     {'name': 'Mur',      'icon': '🧱', 'cost': {'stone': 25}, 'fort': 1, 'fort_hill': True},
            "barracks": {'name': 'Caserne',  'icon': '⚔️', 'cost': {'gold': 80,  'wood': 40}, 'army_rate': 2},
            "temple":   {'name': 'Temple',   'icon': '☥', 'cost': {'gold': 60,  'stone': 30}, 'pop': 300},
            "port":     {'name': 'Port',     'icon': '⚓', 'cost': {'gold': 100, 'wood': 80}, 'requires_water': True},
        },
        "combat": {
            "fort_penalty": 0.1,         # -10% attaque non-éléphant par mur
            "fort_min": 0.3,             # plancher du malus de siège
            "elephant_bonus": 0.25,      # +25% par mur pour les éléphants
            "fort_hill_factor": 0.5,     # murs de colline comptent ×0.5 en défense
            "fort_defense": 0.2,         # +20% défense par mur
            "terrain_defense": 0.05,     # par case défensive (colline/forêt)
            "assist_pct": 0.2,           # aide des alliés (attaque et défense)
            "variance": 0.4,             # aléa d'attaque ±(0.4)
            "def_loss_pct": 0.3,         # pertes du défenseur perdant (×0.3)
        },
        "attack": {
            "navy_requires_beach": True, # navires interdits sans plage
            "cavalry_open_terrain": True, # charge cavalerie réduite en forêt/colline
        },
        "win": {
            "capitals": 3,               # capitales à conquérir pour gagner
        },
        "empires": EMPIRE_DATA,
        "territories": TERRITORIES,
    }


def configs_dir():
    return CONFIGS_DIR


def config_path(gid):
    return CONFIGS_DIR / f"{gid}.json"


def load_config(gid):
    """Charge la config d'un jeu depuis server/configs/{gid}.json.
    Retourne default_strat_config() si le fichier n'existe pas."""
    p = config_path(gid)
    if p.is_file():
        return json.loads(p.read_text(encoding='utf-8'))
    return default_strat_config()


def save_config(gid, cfg):
    CONFIGS_DIR.mkdir(parents=True, exist_ok=True)
    p = config_path(gid)
    p.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding='utf-8')

def _mini_map(names=None):
    """Mini-carte 4×3 = 12 territoires, 4 empires (utilisée par la génération agentic)."""
    names = (names or ['Rouges', 'Bleus', 'Verts', 'Dorés'])
    colors = ['#e5484d', '#3a86ff', '#38b26a', '#f2b623']
    icons = ['🔴', '🔵', '🟢', '🟡']
    W, H = 4, 3
    t_names = ['Avalon', 'Baronie', 'Cygne', 'Drake', 'Eder', 'Falcon',
               'Garn', 'Havre', 'Iris', 'Jade', 'Kron', 'Lume']
    territories = []
    for y in range(H):
        for x in range(W):
            t_id = x + y * W
            territories.append({'id': t_id, 'name': t_names[t_id] if t_id < len(t_names) else f'T{t_id + 1}',
                                'lon': -170 + x * 90, 'lat': 65 - y * 45, 'cap': False, 'home': None, 'adj': []})
    for y in range(H):
        for x in range(W):
            t_id = x + y * W
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H:
                    territories[t_id]['adj'].append(nx + ny * W)
    empires = {}
    cap_of = {}
    for i in range(4):
        eid = ['red', 'blue', 'green', 'gold'][i]
        empires[eid] = {'name': names[i % len(names)], 'color': colors[i], 'icon': icons[i], 'capital': None}
        cap_of[eid] = None
    for i, t in enumerate(territories):
        eid = ['red', 'blue', 'green', 'gold'][i % 4]
        t['home'] = eid
        if cap_of[eid] is None:
            cap_of[eid] = t['id']
            t['cap'] = True
            empires[eid]['capital'] = t['id']
    return {'territories': territories, 'empires': empires}
    return str(p)


# ════════════════════════════════════════════════════════════════════
#  Moteur générique
# ════════════════════════════════════════════════════════════════════

class StrategyEngine:
    def __init__(self, config=None):
        self.config = config or default_strat_config()
        self._cfg = self.config
        self.players = {}       # pid -> {name, gold, food, wood, stone, ready, conn}
        self.turn = 0
        self.wars = {}          # empire -> set(empires) — guerre permanente, symétrique
        self.phase = 'waiting'  # waiting | playing | done
        self.last_human = 0     # timestamp du dernier joueur humain (gestion bots seuls)
        self.territories = {}   # tid -> état du territoire (dont données carte)
        for t in self._cfg['territories']:
            self.territories[t['id']] = {
                'name': t['name'], 'lon': t['lon'], 'lat': t['lat'],
                'cap': t.get('cap', False), 'adj': t['adj'], 'home': t.get('home'),
                'owner': None, 'army': 0, 'units': {}, 'pop': 0, 'grid': None,
                'fort': 0, 'fort_hill': 0, 'buildings': [],
            }

    # ─── Helpers config ──────────────────────────────────────────
    @property
    def units(self): return self._cfg['units']
    @property
    def counters(self): return self._cfg['counters']
    @property
    def terrains(self): return self._cfg['terrains']
    @property
    def buildings(self): return self._cfg['buildings']

    def _terrain_flag(self, ter, flag, default=False):
        t = self.terrains.get(ter, {})
        return t.get(flag, default)

    # ─── Sérialisation ───────────────────────────────────────────
    def to_dict(self, pid=None):
        d = {
            'turn': self.turn, 'phase': self.phase,
            'players': {k: {kk: vv for kk, vv in v.items() if kk != 'conn'}
                        for k, v in self.players.items()},
            'territories': {k: dict({'id': k}, **{kk: vv for kk, vv in v.items() if kk != 'home'})
                            for k, v in self.territories.items()},
            'empires': self._empires_dict(),
            'config': self._client_config(),
        }
        if pid:
            me = self.players.get(pid, {})
            d['you'] = pid
            d['your_empire'] = me.get('empire', list(self._cfg['empires'].keys())[0])
            d['your_turn'] = (self.phase == 'playing' and
                              list(self.players.keys()).index(pid) == self.turn % max(1, len(self.players)))
        return d

    def _client_config(self):
        """Sous-ensemble de la config envoyé au client (unités, contres,
        terrains, bâtiments, économie, combat — sans la carte ni les empires).
        Le client générique en a besoin pour afficher/calculer le jeu."""
        c = self._cfg
        return {
            'id': c.get('id'), 'name': c.get('name'), 'icon': c.get('icon'),
            'grid_size': c.get('grid_size', 8),
            'start': c.get('start', {}), 'economy': c.get('economy', {}),
            'units': c.get('units', {}), 'counters': c.get('counters', {}),
            'terrains': c.get('terrains', {}), 'buildings': c.get('buildings', {}),
            'combat': c.get('combat', {}), 'attack': c.get('attack', {}),
            'win': c.get('win', {}), 'blueprint': c.get('blueprint', {'enabled': False, 'code': ''}),
        }

    # ─── Empire helpers ──────────────────────────────────────────
    def _empire_of(self, pid):
        return self.players.get(pid, {}).get('empire', list(self._cfg['empires'].keys())[0])

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

    def _empire_power(self, empire):
        return sum(self._player_power(pid) for pid in self._empire_pids(empire))

    def _at_war(self, a, b):
        return b in self.wars.get(a, set())

    def _declare_war(self, a, b):
        if a == b:
            return
        self.wars.setdefault(a, set()).add(b)
        self.wars.setdefault(b, set()).add(a)

    def _empires_dict(self):
        out = {}
        for eid, info in self._cfg['empires'].items():
            pids = self._empire_pids(eid)
            if pids:
                out[eid] = {
                    'name': info['name'], 'capital': info['capital'],
                    'color': info['color'], 'icon': info['icon'],
                    'players': pids,
                    'wars': sorted(self.wars.get(eid, set())),
                    'pop': self._empire_pop(eid),
                    'army': self._empire_power(eid),
                }
        return out

    # ─── Armée / unités ──────────────────────────────────────────
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

    def _t_units(self, t):
        return t.setdefault('units', {})

    def _t_atk(self, t):
        return t['army'] + sum(n * self.units[u]['a'] for u, n in self._t_units(t).items())

    def _t_def(self, t):
        return t['army'] + sum(n * self.units[u]['d'] for u, n in self._t_units(t).items())

    def _player_power(self, pid):
        return sum(self._t_atk(t) for t in self.territories.values() if t['owner'] == pid)

    # ─── Combat ──────────────────────────────────────────────────
    def _atk_type_mult(self, utype, to_t):
        """Bonus pierre-feuille-ciseaux (vs composition défense) + terrain + siège."""
        cmb = self._cfg['combat']
        total = self._t_def(to_t)
        prof = self._terrain_profile(to_t)
        mult = 1.0
        if total > 0:
            for d_type in self.units:
                d_count = to_t['army'] if d_type == 'soldier' else self._t_units(to_t).get(d_type, 0)
                if d_count > 0:
                    w = (d_count * self.units[d_type]['d']) / total
                    if utype == 'cavalry' and d_type == 'soldier' and self._cfg['attack'].get('cavalry_open_terrain', True):
                        w *= prof['plain_ratio']   # la charge ne marche pas en forêt/colline
                    mult += (self.counters[utype][d_type] - 1) * w
        fort = to_t.get('fort', 0)
        fort_hill = to_t.get('fort_hill', 0)
        if utype == 'elephant':
            mult += cmb.get('elephant_bonus', 0.25) * (fort + fort_hill)   # perce les murs
        else:
            mult *= max(cmb.get('fort_min', 0.3), 1 - cmb.get('fort_penalty', 0.1) * fort)
        return mult

    # ─── Génération des plans de ville ───────────────────────────
    def _make_grid(self, tid=None):
        """Grille unique générée de façon déterministe (seed = tid).
        Cellule: {'t': terrain, 'b': bâtiment ou None}"""
        rnd = random.Random(tid) if tid is not None else random.Random()
        GS = self._cfg.get('grid_size', 8)
        tg = self._cfg['terrain_gen']
        water_name = next((k for k, v in self.terrains.items() if v.get('sea')), 'water')
        beach_name = next((k for k, v in self.terrains.items() if v.get('beach')), 'beach')
        hill_name = next((k for k, v in self.terrains.items() if k == 'hill'), 'hill')
        fertile_name = next((k for k, v in self.terrains.items() if v.get('fertile')), 'fertile')

        grid = [[{'t': 'plain', 'b': None} for _ in range(GS)] for _ in range(GS)]
        coastal = rnd.random() < tg.get('coastal_prob', 0.6)
        edge = (tid or 0) % 4
        if coastal:
            depth = rnd.randint(1, 2)
            for row in range(GS):
                for c in range(GS):
                    if edge == 0: d = row
                    elif edge == 1: d = c
                    elif edge == 2: d = GS - 1 - row
                    else: d = GS - 1 - c
                    if d == 0:
                        grid[row][c]['t'] = water_name
                    elif d < depth and rnd.random() < tg.get('water_ratio', 0.55):
                        grid[row][c]['t'] = water_name
        else:
            lx, ly = rnd.randint(2, GS - 3), rnd.randint(2, GS - 3)
            for _ in range(rnd.randint(1, 2)):
                wx = min(GS - 1, max(0, lx + rnd.randint(-1, 1)))
                wy = min(GS - 1, max(0, ly + rnd.randint(-1, 1)))
                grid[wy][wx]['t'] = water_name
        # Plages : terre adjacente à la mer (eau touchant le bord)
        def is_sea(r, c):
            return grid[r][c]['t'] == water_name and (r == 0 or r == GS - 1 or c == 0 or c == GS - 1)
        for row in range(GS):
            for c in range(GS):
                if grid[row][c]['t'] != water_name and any(
                    row + dr in range(GS) and c + dc in range(GS) and is_sea(row + dr, c + dc)
                    for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0))
                ):
                    grid[row][c]['t'] = beach_name
        # Collines (amas)
        hx, hy = rnd.randint(1, GS - 2), rnd.randint(1, GS - 2)
        for _ in range(tg.get('hills', 8)):
            px = min(GS - 1, max(0, hx + rnd.randint(-1, 1)))
            py = min(GS - 1, max(0, hy + rnd.randint(-1, 1)))
            if grid[py][px]['t'] == 'plain':
                grid[py][px]['t'] = hill_name
        # Forêts et terres fertiles sur des cases plain restantes
        plain_cells = [(r, c) for r in range(GS) for c in range(GS) if grid[r][c]['t'] == 'plain']
        rnd.shuffle(plain_cells)
        n_forest = rnd.randint(tg.get('min_forest', 2), tg.get('max_forest', 4))
        n_fertile = rnd.randint(tg.get('min_fertile', 2), tg.get('max_fertile', 3))
        forest_name = next((k for k, v in self.terrains.items() if v.get('forest')), 'forest')
        for idx, (r, c) in enumerate(plain_cells):
            if idx < n_forest:
                grid[r][c]['t'] = forest_name
            elif idx < n_forest + n_fertile:
                grid[r][c]['t'] = fertile_name
        return grid

    def _terrain_profile(self, t):
        """Profil tactique du terrain d'un territoire."""
        g = t.get('grid')
        if not g:
            return {'plain_ratio': 1.0, 'hills': 0, 'forests': 0, 'defense': 0.0, 'beach': False}
        counts = {}
        defense = 0.0
        plain = beach = 0
        for row in g:
            for cell in row:
                if isinstance(cell, str) or cell is None:
                    ter = 'plain'
                else:
                    ter = cell.get('t', 'plain') if isinstance(cell, dict) else 'plain'
                counts[ter] = counts.get(ter, 0) + 1
                defense += self.terrains.get(ter, {}).get('defense', 0.0)
                if self._terrain_flag(ter, 'open'):
                    plain += 1
                if self._terrain_flag(ter, 'beach'):
                    beach += 1
        land = sum(counts.values()) or 1
        return {
            'plain_ratio': (plain + beach) / land,
            'hills': counts.get('hill', 0),
            'forests': counts.get('forest', 0),
            'defense': defense,
            'beach': beach > 0,
        }

    # ─── Mise en place des empires ───────────────────────────────
    def _empire_setup(self, eid, pids):
        info = self._cfg['empires'].get(eid)
        if not info or not pids:
            return
        st = self._cfg['start']
        base_army = int(st.get('base_soldiers', 100) * max(1, len(pids)) * st.get('soldier_mult', 1.2))
        cap_tid = info['capital']
        cap_t = self.territories[cap_tid]
        cap_t['owner'] = pids[0]
        cap_t['army'] = base_army
        cap_t['units'] = {}
        cap_t['pop'] = st.get('cap_pop', 5000)
        cap_t['grid'] = self._make_grid(cap_tid)
        cap_t['home'] = eid
        home_tids = [tid for tid, t in self.territories.items() if t.get('home') == eid]
        rest = [tid for tid in home_tids if tid != cap_tid]
        for i, tid in enumerate(rest):
            t = self.territories[tid]
            t['owner'] = pids[i % len(pids)]
            t['army'] = base_army
            t['units'] = {}
            t['pop'] = st.get('home_pop', 1000)
            t['grid'] = self._make_grid(tid)

    def distribute(self):
        """Give starting territories per empire, split round-robin among members"""
        self.wars.clear()
        groups = {}
        for pid, p in self.players.items():
            groups.setdefault(p.get('empire', list(self._cfg['empires'].keys())[0]), []).append(pid)

        for eid, pids in groups.items():
            self._empire_setup(eid, pids)

        # Give all players starting gold/food
        st = self._cfg['start']
        for p in self.players.values():
            p['gold'] = st.get('gold', 100)
            p['food'] = st.get('food', 100)
        self.phase = 'playing'

    def admit(self, pid):
        """Late join: re-split the empire's home territories among its members"""
        p = self.players.get(pid)
        if not p:
            return
        owns_any = any(t['owner'] == pid for t in self.territories.values())
        if not owns_any:
            st = self._cfg['start']
            p['gold'] = st.get('gold', 100)
            p['food'] = st.get('food', 100)
        empire = p.get('empire', list(self._cfg['empires'].keys())[0])
        members = self._empire_pids(empire)
        if len(members) < 2:
            return
        owns_home = any(t['owner'] in members for t in self.territories.values()
                        if t.get('home') == empire)
        if not owns_home:
            self._empire_setup(empire, members)
        else:
            cap = self._cfg['empires'].get(empire, {}).get('capital')
            home_owned = [tid for tid, t in self.territories.items()
                          if t.get('home') == empire and t['owner'] in members]
            rest = [tid for tid in home_owned if tid != cap]
            for i, tid in enumerate(rest):
                self.territories[tid]['owner'] = members[i % len(members)]
            if cap is not None and self.territories[cap].get('home') == empire:
                self.territories[cap]['owner'] = members[0]
        # Soldats de départ recalculés pour le nouveau nombre de joueurs de l'empire
        if self.turn <= 1:
            st = self._cfg['start']
            base = int(st.get('base_soldiers', 100) * max(1, len(members)) * st.get('soldier_mult', 1.0))
            for t in self.territories.values():
                if t['owner'] in members and t.get('home') == empire:
                    t['army'] = base
                    t['units'] = {}

    # ─── Commandes ───────────────────────────────────────────────
    def process(self, pid, cmd, data):
        if cmd == 'state':
            return self.to_dict(pid)
        if cmd == 'ready' and self.phase == 'playing':
            p = self.players.get(pid)
            if p:
                p['ready'] = True
            if all(p.get('ready') for p in self.players.values()):
                self._next_turn()
                return None  # _next_turn already broadcast
            return self.to_dict(pid)
        return self._action(pid, cmd, data)

    def _action(self, pid, cmd, data):
        try:
            tid = int(data.get('tid'))
        except (TypeError, ValueError):
            return {'error': 'Territoire inconnu'}
        t = self.territories.get(tid)
        if not t or t['owner'] != pid:
            return {'error': 'Pas votre territoire'}
        me = self.players[pid]
        my_empire = me.get('empire', list(self._cfg['empires'].keys())[0])

        if cmd == 'recruit':
            amt = data.get('amount', 50)
            cost = amt // 4
            if (me['gold'] or 0) < cost:
                return {'error': 'Or insuffisant'}
            me['gold'] = me.get('gold', 0) - cost
            t['army'] = t.get('army', 0) + amt
            return {'ok': True, **self.to_dict(pid)}

        if cmd == 'convert':
            unit = data.get('unit')
            st = self.units.get(unit)
            if not st:
                return {'error': 'Unité inconnue'}
            try:
                amount = max(1, int(data.get('amount', 1)))
            except (TypeError, ValueError):
                return {'error': 'Montant invalide'}
            need = st['cost'] * amount
            if t['army'] < need:
                return {'error': f'Pas assez de soldats ({need} requis)'}
            t['army'] -= need
            self._t_units(t)[unit] = self._t_units(t).get(unit, 0) + amount
            return {'ok': True, **self.to_dict(pid)}

        if cmd == 'attack':
            try:
                to_tid = int(data.get('to'))
            except (TypeError, ValueError):
                return {'error': 'Territoire inconnu'}
            to_t = self.territories.get(to_tid)
            if not to_t:
                return {'error': 'Territoire inconnu'}
            if to_t['owner'] and self._empire_of(to_t['owner']) == my_empire:
                return {'error': 'Territoire allié (même empire)'}
            # Déclaration de guerre automatique (guerre permanente)
            if to_t['owner']:
                def_empire = self._empire_of(to_t['owner'])
                if def_empire != my_empire and not self._at_war(my_empire, def_empire):
                    self._declare_war(my_empire, def_empire)
                    self._broadcast({'action': 'war', 'war': {
                        'declared': my_empire, 'target': def_empire}})

            utype = data.get('type') or 'soldier'
            sent = {}
            if isinstance(data.get('units'), dict):
                for u in self.units:
                    try:
                        n = max(0, int(data['units'].get(u, 0)))
                    except (TypeError, ValueError):
                        n = 0
                    if n > 0:
                        pool = t['army'] if u == 'soldier' else self._t_units(t).get(u, 0)
                        n = min(n, pool)
                        if n > 0:
                            sent[u] = n
                if not sent:
                    return {'error': 'Aucune unité envoyée'}
            else:
                if utype not in self.units:
                    return {'error': 'Unité inconnue'}
                pool = t['army'] if utype == 'soldier' else self._t_units(t).get(utype, 0)
                if pool < 1:
                    return {'error': 'Pas assez de cette unité'}
                amt = data.get('amount')
                if amt is None:
                    atk = int(t['army'] * 0.7) if utype == 'soldier' else pool
                else:
                    try:
                        atk = max(1, min(int(amt), pool))
                    except (TypeError, ValueError):
                        return {'error': 'Montant invalide'}
                sent[utype] = atk

            for u, n in sent.items():
                if u == 'soldier':
                    t['army'] -= n
                else:
                    self._t_units(t)[u] = max(0, self._t_units(t).get(u, 0) - n)
            total_sent = sum(sent.values())

            cmb = self._cfg['combat']
            atk_assist = 0
            for ally_pid in self._empire_pids_except(my_empire, pid):
                take = int(self._player_power(ally_pid) * cmb.get('assist_pct', 0.2))
                if take > 0:
                    self._take_army(ally_pid, take)
                    atk_assist += take

            prof = self._terrain_profile(to_t)
            if 'navy' in sent and self._cfg['attack'].get('navy_requires_beach', True) and not prof['beach']:
                return {'error': 'Pas de plage pour débarquer (navires)'}
            def_power = self._t_def(to_t) * (1 + (to_t.get('fort', 0) + cmb.get('fort_hill_factor', 0.5) * to_t.get('fort_hill', 0)) * cmb.get('fort_defense', 0.2)) * (1 + prof['defense'])
            def_assist = 0
            if to_t['owner'] and to_t['owner'] in self.players:
                for ally_pid in self._empire_pids_except(self._empire_of(to_t['owner']), to_t['owner']):
                    take = int(self._player_power(ally_pid) * cmb.get('assist_pct', 0.2))
                    if take > 0:
                        self._take_army(ally_pid, take)
                        def_assist += take
            def_power += def_assist

            atk_power = 0
            for u, n in sent.items():
                atk_power += n * self.units[u]['a'] * self._atk_type_mult(u, to_t)
            atk_power *= (0.8 + cmb.get('variance', 0.4) * random.random())
            atk_power += atk_assist
            dominant = max(sent, key=lambda u: sent[u])

            if atk_power > def_power:
                old_owner = to_t['owner']
                raw_def = to_t['army'] + sum(self._t_units(to_t).values())
                survivors = max(1, total_sent - raw_def)
                new_units = {}
                rem = survivors
                for u, n in sent.items():
                    q = int(n / total_sent * survivors)
                    new_units[u] = q
                    rem -= q
                if rem > 0:
                    new_units[dominant] = new_units.get(dominant, 0) + rem
                to_t['owner'] = pid
                to_t['army'] = new_units.pop('soldier', 0)
                to_t['units'] = new_units
                if not to_t['grid']:
                    to_t['grid'] = self._make_grid(to_tid)
                self._broadcast({'action': 'battle', 'battle': {
                    'territory': to_t['name'], 'attackerWins': True,
                    'attacker': pid, 'defender': old_owner,
                    'fromTid': tid, 'toTid': to_tid,
                    'unit': dominant, 'units': sent, 'amount': total_sent,
                    'atkLosses': total_sent - survivors, 'defLosses': raw_def,
                    'atkAssist': atk_assist, 'defAssist': def_assist
                }})
            else:
                self._broadcast({'action': 'battle', 'battle': {
                    'territory': to_t['name'], 'attackerWins': False,
                    'attacker': pid, 'defender': to_t['owner'],
                    'fromTid': tid, 'toTid': to_tid,
                    'unit': dominant, 'units': sent, 'amount': total_sent,
                    'atkLosses': total_sent, 'defLosses': int(def_power * cmb.get('def_loss_pct', 0.3)),
                    'atkAssist': atk_assist, 'defAssist': def_assist
                }})
            asyncio.create_task(self._send_personalized())
            return {'ok': True, **self.to_dict(pid)}

        if cmd == 'build':
            bid = data.get('building')
            gx, gy = data.get('gx', 0), data.get('gy', 0)
            grid = t['grid']
            GS = self._cfg.get('grid_size', 8)
            if not grid or gx < 0 or gy < 0 or gx >= GS or gy >= GS:
                return {'error': 'Position invalide'}
            cell = grid[gy][gx]
            if not isinstance(cell, dict):
                return {'error': 'Terrain non constructible'}
            ter = cell.get('t', 'plain')
            if not self._terrain_flag(ter, 'buildable', True):
                return {'error': 'Terrain non constructible'}
            if cell.get('b'):
                return {'error': 'Case occupée'}
            bcfg = self.buildings.get(bid)
            if not bcfg:
                return {'error': 'Bâtiment inconnu'}
            if bcfg.get('requires_water'):
                adj_water = any(
                    gy + dr in range(GS) and gx + dc in range(GS)
                    and isinstance(grid[gy + dr][gx + dc], dict)
                    and self._terrain_flag(grid[gy + dr][gx + dc].get('t', ''), 'sea')
                    for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0))
                )
                if not adj_water:
                    return {'error': 'Le port doit être au bord de l\'eau'}
            for res, amt in bcfg.get('cost', {}).items():
                if me.get(res, 0) < amt:
                    return {'error': f'{res} insuffisant'}
            for res, amt in bcfg.get('cost', {}).items():
                me[res] = me.get(res, 0) - amt
            cell['b'] = bid
            if 'pop' in bcfg:
                t['pop'] = (t.get('pop', 0) or 0) + bcfg['pop']
            if bid == 'farm':
                bonus = bcfg.get('fertile_bonus', bcfg.get('food', 0)) if self._terrain_flag(ter, 'fertile') else bcfg.get('food', 0)
                me['food'] = me.get('food', 0) + bonus
            if 'fort' in bcfg:
                t['fort'] = t.get('fort', 0) + bcfg['fort']
                if bcfg.get('fort_hill') and ter == 'hill':
                    t['fort_hill'] = t.get('fort_hill', 0) + bcfg['fort']   # mur sur colline = défense +50%
            if 'army_rate' in bcfg:
                me['army_rate'] = me.get('army_rate', 0) + bcfg['army_rate']
            return {'ok': True, **self.to_dict(pid)}

        if cmd == 'move':
            try:
                to_tid = int(data.get('to'))
            except (TypeError, ValueError):
                return {'error': 'Territoire inconnu'}
            to_t = self.territories.get(to_tid)
            if not to_t or not to_t['owner'] or self._empire_of(to_t['owner']) != my_empire:
                return {'error': 'Territoire non possédé'}
            if to_tid == tid:
                return {'error': 'Même territoire'}
            amt = data.get('amount', 50)
            if t['army'] < amt:
                return {'error': 'Pas assez de soldats'}
            t['army'] -= amt
            to_t['army'] = to_t.get('army', 0) + amt
            self._broadcast({'action': 'move', 'move': {
                'fromTid': tid, 'toTid': to_tid, 'amount': amt}})
            asyncio.create_task(self._send_personalized())
            return {'ok': True, **self.to_dict(pid)}

        return {'error': 'Commande inconnue'}

    # ─── Bots IA (empires sans joueur humain) ─────────────────────
    def _bot_pids(self, empire=None):
        return [pid for pid, p in self.players.items()
                if p.get('ai') and (empire is None or p.get('empire') == empire)]

    def _human_pids(self):
        return [pid for pid, p in self.players.items() if not p.get('ai')]

    def ensure_bots(self):
        """Remplit d'un bot IA chaque empire sans joueur humain.
        Le bot prend la défense du territoire jusqu'à l'arrivée d'un humain."""
        if self.phase != 'playing' and not self._human_pids():
            return False
        human_empires = {p.get('empire') for p in self.players.values() if not p.get('ai')}
        added = False
        for eid, info in self._cfg['empires'].items():
            if eid in human_empires:
                continue
            pid = 'ai_' + eid
            if pid in self.players:
                continue
            self.players[pid] = {'name': '🤖 ' + info.get('name', eid), '_pid': pid,
                                 'conn': None, 'empire': eid, 'ai': True,
                                 'gold': 0, 'food': 0, 'wood': 0, 'stone': 0, 'ready': False}
            if self.phase == 'playing':
                st = self._cfg['start']
                self.players[pid]['gold'] = st.get('gold', 100)
                self.players[pid]['food'] = st.get('food', 100)
                self._empire_setup(eid, [pid])
            added = True
        return added

    def take_over(self, human_pid, empire):
        """Un humain prend le contrôle de son empire : le bot cède le territoire."""
        bots = self._bot_pids(empire)
        if not bots:
            return False
        bot = bots[0]
        me = self.players.get(human_pid)
        bp = self.players[bot]
        if me:
            for k in ('gold', 'food', 'wood', 'stone'):
                me[k] = (me.get(k) or 0) + (bp.get(k) or 0)
        for t in self.territories.values():
            if t['owner'] == bot:
                t['owner'] = human_pid
        del self.players[bot]
        return True

    def _bot_talk(self, pid, msg):
        info = self._cfg['empires'].get(self.players[pid].get('empire'), {})
        self._broadcast({'action': 'bot', 'bot': {'empire': info.get('name', ''),
                                                  'icon': info.get('icon', '🤖'), 'msg': msg}})

    def bot_act(self, pid):
        """Décisions d'un tour pour un bot : recruter, construire, renforcer,
        attaquer. Passe par les commandes normales (broadcast + état partagé)."""
        p = self.players.get(pid)
        if not p or not p.get('ai') or self.phase != 'playing':
            return
        my = [(tid, t) for tid, t in self.territories.items() if t['owner'] == pid]
        if not my:
            return
        emp = p['empire']
        cap_tid = self._cfg['empires'].get(emp, {}).get('capital')
        cap = self.territories.get(cap_tid) if cap_tid is not None else None

        # 1. Recrute à la capitale (ou au territoire le plus fort)
        gold = p.get('gold') or 0
        if gold > 40 and random.random() < 0.85:
            if cap and cap['owner'] == pid:
                target_tid, target = cap_tid, cap
            else:
                target_tid, target = max(my, key=lambda kv: kv[1].get('army', 0))
            amt = min(int(gold * 1.8), 140)
            if amt >= 20:
                self.process(pid, 'recruit', {'tid': target_tid, 'amount': amt})

        # 2. Convertit quelques soldats en unités fortes à la capitale
        if cap and cap['owner'] == pid and cap.get('army', 0) >= 80 and random.random() < 0.5:
            u = 'elephant' if 'elephant' in self.units else next(
                (k for k in self.units if k != 'soldier'), None)
            if u:
                amt = max(1, int(cap['army'] / (self.units[u]['cost'] * 2)))
                if amt:
                    self.process(pid, 'convert', {'tid': cap_tid, 'unit': u, 'amount': amt})

        # 3. Construit dans la capitale
        if cap and cap['owner'] == pid:
            self._bot_build(pid, cap_tid)

        # 4. Renforce les frontières
        self._bot_move(pid, my)

        # 5. Attaque le voisin le plus faible
        self._bot_attack(pid, my)

    def _bot_build(self, pid, tid):
        t = self.territories.get(tid)
        if not t:
            return
        grid = t.get('grid')
        if not grid:
            return
        GS = self._cfg.get('grid_size', 8)
        built = {cell.get('b') for row in grid for cell in row
                 if isinstance(cell, dict) and cell.get('b')}
        want = []
        if 'wall' in self.buildings and 'wall' not in built and not t.get('fort'):
            want.append((1, 'wall'))
        for bid, prio in (('barracks', 2), ('farm', 3), ('house', 4), ('temple', 5)):
            if bid in self.buildings and bid not in built:
                want.append((prio, bid))
        want.sort()
        for _, bid in want:
            bcfg = self.buildings.get(bid)
            if not bcfg:
                continue
            res_ok = all((self.players.get(pid, {}).get(res, 0) >= amt)
                         for res, amt in bcfg.get('cost', {}).items())
            if not res_ok:
                continue
            for gy in range(GS):
                for gx in range(GS):
                    cell = grid[gy][gx]
                    if not isinstance(cell, dict) or cell.get('b'):
                        continue
                    if not self._terrain_flag(cell.get('t', 'plain'), 'buildable', True):
                        continue
                    if bid == 'port' and not any(
                        gy + dr in range(GS) and gx + dc in range(GS)
                        and isinstance(grid[gy + dr][gx + dc], dict)
                        and self._terrain_flag(grid[gy + dr][gx + dc].get('t', ''), 'sea')
                        for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0))
                    ):
                        continue
                    res = self.process(pid, 'build', {'tid': tid, 'building': bid, 'gx': gx, 'gy': gy})
                    if isinstance(res, dict) and 'error' in res:
                        continue
                    self._bot_talk(pid, f'construit {bcfg.get("name", bid)}')
                    return

    def _bot_move(self, pid, my):
        emp = self.players[pid]['empire']
        border = [kv for kv in my if any(
            (a := self.territories.get(n)) and (not a['owner'] or self._empire_of(a['owner']) != emp)
            for n in kv[1].get('adj', []))]
        sources = [kv for kv in my if kv[1].get('army', 0) >= 150]
        if not border or not sources or random.random() < 0.3:
            return
        source_tid, source = max(sources, key=lambda kv: kv[1]['army'])
        dest_tid, dest = min(border, key=lambda kv: kv[1]['army'])
        if dest_tid == source_tid or dest.get('army', 0) > source['army'] * 0.6:
            return
        amt = int(source['army'] * 0.4)
        if amt >= 40:
            res = self.process(pid, 'move', {'tid': source_tid, 'to': dest_tid, 'amount': amt})
            if isinstance(res, dict) and 'error' not in res:
                self._bot_talk(pid, 'renforce ses frontières')

    def _bot_attack(self, pid, my):
        emp = self.players[pid]['empire']
        attacks = 0
        for tid, t in my:
            if attacks >= 2:
                break
            for nid in t.get('adj', []):
                a = self.territories.get(nid)
                if not a:
                    continue
                if a['owner'] and self._empire_of(a['owner']) == emp:
                    continue
                pool = t.get('army', 0) + sum(self._t_units(t).values())
                if pool < 70:
                    break
                def_p = self._t_def(a)
                send = int(t['army'] * 0.7) if t['army'] >= 30 else 0
                units = {u: max(0, int(n * 0.7)) for u, n in self._t_units(t).items() if n > 0}
                if send <= 0 and not units:
                    break
                atk_p = (send or 0) + sum(n * self.units[u]['a'] for u, n in units.items())
                if atk_p > def_p * 1.15 and random.random() < 0.55:
                    res = self.process(pid, 'attack', {
                        'tid': tid, 'to': nid,
                        'units': {**({'soldier': send} if send else {}), **units}})
                    if isinstance(res, dict) and 'error' in res:
                        continue
                    attacks += 1
                    break

    # ─── Tour / économie / victoire ──────────────────────────────
    def _next_turn(self):
        eco = self._cfg['economy']
        self.turn += 1
        for p in self.players.values():
            p['ready'] = False
            n_terr = sum(1 for t in self.territories.values() if t['owner'] == p.get('_pid'))
            p['gold'] = p.get('gold', 0) + eco.get('gold_base', 20) + n_terr * eco.get('gold_per_terr', 5)
            p['food'] = p.get('food', 0) + eco.get('food_base', 10) + n_terr * eco.get('food_per_terr', 3)
        for t in self.territories.values():
            if t['owner']:
                growth = max(1, int(t.get('pop', 0) / eco.get('growth_div', 200)))
                t['army'] = t.get('army', 0) + growth
        # Check win
        win_n = self._cfg['win'].get('capitals', 3)
        pids = list(self.players.keys())
        for pid in pids:
            owns_cap = [tid for tid, t in self.territories.items()
                        if t['owner'] == pid and t.get('cap')]
            if len(owns_cap) >= win_n:
                self._broadcast({'action': 'game_over', 'winner': pid,
                                 'winnerName': self.players[pid].get('name', '?')})
        asyncio.create_task(self._send_personalized())

    # ─── Envoi / diffusion ───────────────────────────────────────
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
                msg = json.dumps({'action': 'state', 'state': self.to_dict(p_id)})
                await self._safe_send(c, msg)

    async def _safe_send(self, conn, msg):
        try:
            await conn.send(msg)
        except Exception as e:
            print(f'ws error: {e}', flush=True)
