"""280 historic cities for the Carthage world map"""

import math
import random

random.seed(42)

def haversine(lon1, lat1, lon2, lat2):
    R = 6371
    dlon = math.radians(lon2 - lon1)
    dlat = math.radians(lat2 - lat1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


# fmt: off
CITY_DATA = [
    ("Memphis (Égypte antique)", 31.2550, 29.8450),
    ("Thèbes / Louxor (Égypte)", 32.6396, 25.6872),
    ("Alexandrie (Égypte)", 29.9187, 31.2001),
    ("Gizeh (Égypte)", 31.1342, 29.9792),
    ("Assouan (Égypte)", 32.8998, 24.0889),
    ("Pi-Ramsès (Égypte)", 31.9160, 30.8030),
    ("Abydos (Égypte)", 31.9180, 26.1850),
    ("Amarna (Égypte)", 30.9000, 27.6500),
    ("Cyrène (Libye)", 21.8569, 32.8225),
    ("Leptis Magna (Libye)", 14.2933, 32.6358),
    ("Sabratha (Libye)", 12.4844, 32.8039),
    ("Carthage (Tunisie)", 10.3236, 36.8528),
    ("Kairouan (Tunisie)", 10.1003, 35.6781),
    ("Tunis (Tunisie)", 10.1815, 36.8065),
    ("Sousse (Tunisie)", 10.6369, 35.8256),
    ("Sfax (Tunisie)", 10.7603, 34.7406),
    ("Dougga (Tunisie)", 9.2211, 36.4222),
    ("El Jem (Tunisie)", 10.7072, 35.2975),
    ("Gabès (Tunisie)", 10.1033, 33.8833),
    ("Djerba (Tunisie)", 10.8500, 33.7800),
    ("Malte", 14.3750, 35.9375),
    ("Alger (Algérie)", 3.0588, 36.7538),
    ("Tlemcen (Algérie)", -1.3150, 34.8783),
    ("Constantine (Algérie)", 6.6147, 36.3650),
    ("Timgad (Algérie)", 6.4683, 35.4844),
    ("Djemila (Algérie)", 5.7417, 36.3197),
    ("Marrakech (Maroc)", -7.9811, 31.6295),
    ("Fès (Maroc)", -5.0078, 34.0181),
    ("Rabat (Maroc)", -6.8416, 34.0209),
    ("Meknès (Maroc)", -5.5547, 33.8935),
    ("Volubilis (Maroc)", -5.5550, 34.0728),
    ("Tombouctou (Mali)", -3.0094, 16.7758),
    ("Djenné (Mali)", -4.5533, 13.9061),
    ("Gao (Mali)", -0.0447, 16.2716),
    ("Aksoum (Éthiopie)", 38.7247, 14.1319),
    ("Lalibela (Éthiopie)", 39.0469, 12.0319),
    ("Gondar (Éthiopie)", 37.4697, 12.6034),
    ("Harar (Éthiopie)", 42.1197, 9.3106),
    ("Le Grand Zimbabwe (Zimbabwe)", 30.9336, -20.2675),
    ("Kilwa Kisiwani (Tanzanie)", 39.5083, -8.9583),
    ("Zanzibar (Tanzanie)", 39.2026, -6.1659),
    ("Mombasa (Kenya)", 39.6682, -4.0435),
    ("Benin City (Nigeria)", 5.6037, 6.3350),
    ("Babylone (Irak)", 44.4211, 32.5422),
    ("Ur (Irak)", 46.1031, 30.9625),
    ("Uruk (Irak)", 45.6361, 31.3222),
    ("Ninive (Irak)", 43.1583, 36.3575),
    ("Assur (Irak)", 43.2575, 35.4561),
    ("Bagdad (Irak)", 44.3661, 33.3152),
    ("Samarra (Irak)", 43.8742, 34.1983),
    ("Ctésiphon (Irak)", 44.5800, 33.0900),
    ("Jérusalem (Israël / Palestine)", 35.2137, 31.7683),
    ("Jéricho (Palestine)", 35.4500, 31.8700),
    ("Bethléem (Palestine)", 35.2024, 31.7054),
    ("Hébron (Palestine)", 35.0998, 31.5326),
    ("Saint-Jean-d'Acre / Akko (Israël)", 35.0839, 32.9275),
    ("Jaffa (Israël)", 34.7525, 32.0536),
    ("Césarée (Israël)", 34.8931, 32.5028),
    ("Damas (Syrie)", 36.2765, 33.5138),
    ("Alep (Syrie)", 37.1343, 36.2021),
    ("Palmyre (Syrie)", 38.2731, 34.5544),
    ("Bosra (Syrie)", 36.4864, 32.5175),
    ("Apamée (Syrie)", 36.3981, 35.4194),
    ("Tyr (Liban)", 35.1939, 33.2733),
    ("Sidon (Liban)", 35.3781, 33.5561),
    ("Byblos (Liban)", 35.6483, 34.1208),
    ("Baalbek (Liban)", 36.2114, 34.0058),
    ("Beyrouth (Liban)", 35.5018, 33.8938),
    ("Amman / Philadelphia (Jordanie)", 35.9284, 31.9454),
    ("Petra (Jordanie)", 35.4444, 30.3285),
    ("Jerash / Gerasa (Jordanie)", 35.8953, 32.2783),
    ("Istanbul / Constantinople / Byzance (Turquie)", 28.9784, 41.0082),
    ("Éphèse (Turquie)", 27.3678, 37.9411),
    ("Troie (Turquie)", 26.2389, 39.9575),
    ("Milet (Turquie)", 27.2764, 37.5303),
    ("Antioche (Turquie)", 36.1600, 36.2025),
    ("Sardes (Turquie)", 28.0406, 38.4875),
    ("Pergame (Turquie)", 27.1822, 39.1325),
    ("Halicarnasse (Turquie)", 27.4264, 37.0389),
    ("Konya (Turquie)", 32.4833, 37.8667),
    ("Bursa (Turquie)", 29.0665, 40.1828),
    ("Nicomédie / İzmit (Turquie)", 29.9403, 40.7656),
    ("Trébizonde / Trabzon (Turquie)", 39.7178, 41.0015),
    ("Persépolis (Iran)", 52.8917, 29.9350),
    ("Suse (Iran)", 48.2536, 32.1906),
    ("Ispahan (Iran)", 51.6680, 32.6546),
    ("Chiraz (Iran)", 52.5836, 29.5918),
    ("Tabriz (Iran)", 46.2919, 38.0800),
    ("Pasargades (Iran)", 53.1678, 30.1983),
    ("Ecbatane / Hamadan (Iran)", 48.5150, 34.7989),
    ("Nishapur (Iran)", 58.7958, 36.2133),
    ("Sanaa (Yémen)", 44.1910, 15.3694),
    ("Shibam (Yémen)", 48.6264, 15.9261),
    ("Athènes (Grèce)", 23.7275, 37.9838),
    ("Sparte (Grèce)", 22.4286, 37.0781),
    ("Delphes (Grèce)", 22.5010, 38.4824),
    ("Olympie (Grèce)", 21.6300, 37.6386),
    ("Corinthe (Grèce)", 22.9575, 37.9400),
    ("Mycènes (Grèce)", 22.7561, 37.7308),
    ("Thèbes (Grèce)", 23.3175, 38.3242),
    ("Rhodes (Grèce)", 28.2269, 36.4434),
    ("Knossos / Cnossos (Grèce)", 25.1631, 35.2981),
    ("Thessalonique (Grèce)", 22.9444, 40.6401),
    ("Rome (Italie)", 12.4964, 41.9028),
    ("Pompéi (Italie)", 14.4850, 40.7516),
    ("Venise (Italie)", 12.3155, 45.4408),
    ("Florence (Italie)", 11.2558, 43.7696),
    ("Milan (Italie)", 9.1900, 45.4642),
    ("Naples (Italie)", 14.2681, 40.8518),
    ("Pise (Italie)", 10.4017, 43.7228),
    ("Sienne (Italie)", 11.3308, 43.3188),
    ("Bologne (Italie)", 11.3426, 44.4949),
    ("Gênes (Italie)", 8.9463, 44.4056),
    ("Vérone (Italie)", 10.9916, 45.4384),
    ("Ravenne (Italie)", 12.2015, 44.4184),
    ("Syracuse (Italie)", 15.2866, 37.0755),
    ("Palerme (Italie)", 13.3615, 38.1157),
    ("Aquilée (Italie)", 13.3686, 45.7686),
    ("Paris (France)", 2.3522, 48.8566),
    ("Lyon / Lugdunum (France)", 4.8357, 45.7640),
    ("Marseille / Massalia (France)", 5.3698, 43.2965),
    ("Bordeaux / Burdigala (France)", -0.5792, 44.8378),
    ("Strasbourg (France)", 7.7521, 48.5734),
    ("Rouen (France)", 1.0999, 49.4432),
    ("Reims (France)", 4.0317, 49.2583),
    ("Toulouse (France)", 1.4442, 43.6047),
    ("Arles (France)", 4.6278, 43.6767),
    ("Nîmes (France)", 4.3601, 43.8367),
    ("Carcassonne (France)", 2.3538, 43.2122),
    ("Avignon (France)", 4.8055, 43.9493),
    ("Nantes (France)", -1.5536, 47.2184),
    ("Lille (France)", 3.0573, 50.6292),
    ("Tours (France)", 0.6848, 47.3941),
    ("Londres / Londinium (Royaume-Uni)", -0.1278, 51.5074),
    ("York / Eboracum (Royaume-Uni)", -1.0815, 53.9591),
    ("Édimbourg (Royaume-Uni)", -3.1883, 55.9533),
    ("Bath / Aquae Sulis (Royaume-Uni)", -2.3599, 51.3814),
    ("Canterbury (Royaume-Uni)", 1.0789, 51.2802),
    ("Oxford (Royaume-Uni)", -1.2577, 51.7520),
    ("Cambridge (Royaume-Uni)", 0.1218, 52.2053),
    ("Madrid (Espagne)", -3.7038, 40.4168),
    ("Tolède (Espagne)", -4.0273, 39.8628),
    ("Séville (Espagne)", -5.9845, 37.3891),
    ("Cordoue (Espagne)", -4.7794, 37.8882),
    ("Grenade (Espagne)", -3.5986, 37.1773),
    ("Valence (Espagne)", -0.3763, 39.4699),
    ("Saragosse (Espagne)", -0.8891, 41.6488),
    ("Barcelone (Espagne)", 2.1734, 41.3851),
    ("Salamanque (Espagne)", -5.6635, 40.9701),
    ("Lisbonne (Portugal)", -9.1393, 38.7223),
    ("Coimbra (Portugal)", -8.4103, 40.2033),
    ("Porto (Portugal)", -8.6291, 41.1579),
    ("Évora (Portugal)", -7.9090, 38.5714),
    ("Berlin (Allemagne)", 13.4050, 52.5200),
    ("Munich (Allemagne)", 11.5820, 48.1351),
    ("Cologne / Colonia Agrippina (Allemagne)", 6.9603, 50.9375),
    ("Francfort-sur-le-Main (Allemagne)", 8.6821, 50.1109),
    ("Nuremberg (Allemagne)", 11.0767, 49.4521),
    ("Hambourg (Allemagne)", 9.9937, 53.5511),
    ("Brême (Allemagne)", 8.8017, 53.0793),
    ("Lübeck (Allemagne)", 10.6866, 53.8655),
    ("Aix-la-Chapelle / Aachen (Allemagne)", 6.0839, 50.7753),
    ("Trèves / Augusta Treverorum (Allemagne)", 6.6394, 49.7556),
    ("Vienne (Autriche)", 16.3738, 48.2082),
    ("Salzbourg (Autriche)", 13.0550, 47.8095),
    ("Innsbruck (Autriche)", 11.4041, 47.2692),
    ("Prague (République tchèque)", 14.4378, 50.0755),
    ("Budapest (Hongrie)", 19.0402, 47.4979),
    ("Varsovie (Pologne)", 21.0122, 52.2297),
    ("Cracovie (Pologne)", 19.9450, 50.0647),
    ("Gdansk (Pologne)", 18.6466, 54.3520),
    ("Moscou (Russie)", 37.6173, 55.7558),
    ("Saint-Pétersbourg (Russie)", 30.3351, 59.9343),
    ("Novgorod (Russie)", 31.2755, 58.5213),
    ("Vladimir (Russie)", 40.4066, 56.1290),
    ("Kiev (Ukraine)", 30.5234, 50.4501),
    ("Lviv (Ukraine)", 24.0297, 49.8397),
    ("Odessa (Ukraine)", 30.7233, 46.4825),
    ("Minsk (Biélorussie)", 27.5590, 53.9006),
    ("Vilnius (Lituanie)", 25.2797, 54.6872),
    ("Riga (Lettonie)", 24.1052, 56.9496),
    ("Tallinn (Estonie)", 24.7536, 59.4370),
    ("Stockholm (Suède)", 18.0686, 59.3293),
    ("Copenhague (Danemark)", 12.5683, 55.6761),
    ("Oslo (Norvège)", 10.7522, 59.9139),
    ("Reykjavik (Islande)", -21.9426, 64.1466),
    ("Amsterdam (Pays-Bas)", 4.9041, 52.3676),
    ("Rotterdam (Pays-Bas)", 4.4777, 51.9244),
    ("Utrecht (Pays-Bas)", 5.1214, 52.0907),
    ("Bruxelles (Belgique)", 4.3517, 50.8503),
    ("Bruges (Belgique)", 3.2247, 51.2093),
    ("Anvers (Belgique)", 4.4025, 51.2194),
    ("Gand (Belgique)", 3.7174, 51.0543),
    ("Xi'an (Chine)", 108.9398, 34.3416),
    ("Pékin (Chine)", 116.4074, 39.9042),
    ("Nanjing (Chine)", 118.7969, 32.0603),
    ("Luoyang (Chine)", 112.4540, 34.6180),
    ("Hangzhou (Chine)", 120.1551, 30.2741),
    ("Kaifeng (Chine)", 114.3072, 34.7972),
    ("Chengdu (Chine)", 104.0668, 30.5728),
    ("Guangzhou (Chine)", 113.2644, 23.1291),
    ("Suzhou (Chine)", 120.5853, 31.2989),
    ("Pingyao (Chine)", 112.1819, 37.2056),
    ("Kyoto (Japon)", 135.7681, 35.0116),
    ("Nara (Japon)", 135.8048, 34.6851),
    ("Tokyo / Edo (Japon)", 139.6503, 35.6762),
    ("Kamakura (Japon)", 139.5467, 35.3192),
    ("Osaka (Japon)", 135.5022, 34.6937),
    ("Hiroshima (Japon)", 132.4553, 34.3853),
    ("Séoul (Corée du Sud)", 126.9780, 37.5665),
    ("Gyeongju (Corée du Sud)", 129.2115, 35.8562),
    ("Pyongyang (Corée du Nord)", 125.7625, 39.0392),
    ("Delhi (Inde)", 77.2090, 28.6139),
    ("Agra (Inde)", 78.0081, 27.1767),
    ("Varanasi / Bénarès (Inde)", 82.9739, 25.3176),
    ("Mumbai / Bombay (Inde)", 72.8777, 19.0760),
    ("Jaipur (Inde)", 75.7873, 26.9124),
    ("Udaipur (Inde)", 73.7125, 24.5854),
    ("Madurai (Inde)", 78.1198, 9.9252),
    ("Hampi (Inde)", 76.4600, 15.3350),
    ("Calcutta / Kolkata (Inde)", 88.3639, 22.5726),
    ("Chennai / Madras (Inde)", 80.2707, 13.0827),
    ("Lahore (Pakistan)", 74.3436, 31.5497),
    ("Karachi (Pakistan)", 67.0011, 24.8607),
    ("Taxila (Pakistan)", 72.7839, 33.7460),
    ("Harappa (Pakistan)", 72.8642, 30.6280),
    ("Mohenjo-daro (Pakistan)", 68.1381, 27.3294),
    ("Kaboul (Afghanistan)", 69.2075, 34.5553),
    ("Hérat (Afghanistan)", 62.2023, 34.3420),
    ("Samarcande (Ouzbékistan)", 66.9597, 39.6542),
    ("Boukhara (Ouzbékistan)", 64.4286, 39.7747),
    ("Khiva (Ouzbékistan)", 60.3639, 41.3783),
    ("Tachkent (Ouzbékistan)", 69.2401, 41.2995),
    ("Astana / Nur-Sultan (Kazakhstan)", 71.4491, 51.1694),
    ("Almaty (Kazakhstan)", 76.8512, 43.2220),
    ("Katmandou (Népal)", 85.3240, 27.7172),
    ("Patan (Népal)", 85.3240, 27.6744),
    ("Bhaktapur (Népal)", 85.4298, 27.6710),
    ("Lhassa (Tibet / Chine)", 91.1724, 29.6528),
    ("Bangkok (Thaïlande)", 100.5018, 13.7563),
    ("Ayutthaya (Thaïlande)", 100.5684, 14.3532),
    ("Sukhothai (Thaïlande)", 99.7029, 17.0177),
    ("Chiang Mai (Thaïlande)", 98.9853, 18.7883),
    ("Hanoï (Vietnam)", 105.8542, 21.0285),
    ("Hué (Vietnam)", 107.5909, 16.4637),
    ("Hô-Chi-Minh-Ville / Saigon (Vietnam)", 106.6297, 10.8231),
    ("Phnom Penh (Cambodge)", 104.9282, 11.5564),
    ("Angkor / Siem Reap (Cambodge)", 103.8667, 13.4125),
    ("Pagan / Bagan (Myanmar)", 94.8586, 21.1717),
    ("Rangoun / Yangon (Myanmar)", 96.1951, 16.8661),
    ("Kuala Lumpur (Malaisie)", 101.6869, 3.1390),
    ("Malacca (Malaisie)", 102.2501, 2.1896),
    ("Singapour (Singapour)", 103.8198, 1.3521),
    ("Teotihuacan (Mexique)", -98.8439, 19.6925),
    ("Tenochtitlan / Mexico (Mexique)", -99.1332, 19.4326),
    ("Chichén Itzá (Mexique)", -88.5678, 20.6843),
    ("Palenque (Mexique)", -92.0461, 17.4844),
    ("Monte Albán (Mexique)", -96.7675, 17.0439),
    ("Uxmal (Mexique)", -89.7719, 20.3597),
    ("Tikal (Guatemala)", -89.6230, 17.2220),
    ("Copán (Honduras)", -89.1411, 14.8422),
    ("Cuzco (Pérou)", -71.9675, -13.5319),
    ("Machu Picchu (Pérou)", -72.5450, -13.1631),
    ("Chan Chan (Pérou)", -79.0750, -8.1097),
    ("Lima (Pérou)", -77.0428, -12.0464),
    ("Bogota (Colombie)", -74.0721, 4.7110),
    ("Carthagène des Indes (Colombie)", -75.4794, 10.3910),
    ("Quito (Équateur)", -78.4678, -0.1807),
    ("Santiago (Chili)", -70.6693, -33.4489),
    ("Buenos Aires (Argentine)", -58.3816, -34.6037),
    ("Córdoba (Argentine)", -64.1888, -31.4201),
    ("Rio de Janeiro (Brésil)", -43.1729, -22.9068),
    ("Salvador de Bahia (Brésil)", -38.5014, -12.9714),
    ("La Havane (Cuba)", -82.3666, 23.1136),
    ("Saint-Domingue (République dominicaine)", -69.9312, 18.4861),
    ("Québec (Canada)", -71.2080, 46.8139),
    ("Montréal (Canada)", -73.5673, 45.5017),
    ("Boston (États-Unis)", -71.0589, 42.3601),
    ("New York / New Amsterdam (États-Unis)", -74.0060, 40.7128),
    ("Philadelphie (États-Unis)", -75.1652, 39.9526),
    ("La Nouvelle-Orléans (États-Unis)", -90.0715, 29.9511),
    ("San Francisco (États-Unis)", -122.4194, 37.7749),
    ("Sydney (Australie)", 151.2093, -33.8688),
]
# fmt: on


def generate_hex_grid(land_only=True):
    """Build territory list from CITY_DATA with adjacency"""
    rng = random.Random(42)
    territories = []
    for i, (name, lon, lat) in enumerate(CITY_DATA):
        # Assign type based on name patterns
        nlow = name.lower()
        if "port" in nlow or "mare" in nlow or "harbour" in nlow or any(k in name for k in ("Carthag", "Alexandrie", "Marseille", "Barcelone", "Gênes", "Venise", "Pise", "Naples", "Hambourg", "Gdansk", "Odessa", "Mombasa", "Zanzibar", "Kilwa", "Syracuse", "Palerme", "Ravenne", "Bruges", "Anvers", "Rotterdam", "Malacca", "Singapour", "Kuala Lumpur", "Guangzhou", "Lima", "Carthagène")):
            tf = "port"
        elif "fort" in nlow or "fortress" in nlow or any(k in name for k in ("Timgad", "Djemila", "Ninive", "Assur", "Samarra", "Carcassonne", "Avignon", "Aquilée", "York", "Tolède", "Salamanque", "Nuremberg", "Lübeck", "Trèves", "Innsbruck")):
            tf = "fort"
        elif "temple" in nlow or "church" in nlow or any(k in name for k in ("Delphes", "Olympie", "Baalbek", "Jerash", "Sanaa", "Volubilis", "Dougga", "El Jem", "Bhaktapur", "Patan")):
            tf = "temple"
        else:
            tf = "city"
        territories.append({
            "id": i,
            "name": name,
            "lon": round(lon, 4),
            "lat": round(lat, 4),
            "type": tf,
            "capital": False,
            "land": True,
            "adj": [],
            "army": rng.randint(2, 8),
            "population": rng.randint(500, 5000),
        })

    # Compute adjacency via nearest neighbors
    n = len(territories)
    for i in range(n):
        dists = []
        for j in range(n):
            if i != j:
                d = haversine(territories[i]["lon"], territories[i]["lat"], territories[j]["lon"], territories[j]["lat"])
                dists.append((d, j))
        dists.sort(key=lambda x: x[0])
        threshold = min(len(dists), 6)
        for k in range(min(threshold, 6)):
            if dists[k][0] < 2000:
                territories[i]["adj"].append(dists[k][1])
                if dists[k][1] not in territories[dists[k][1]]["adj"]:
                    territories[dists[k][1]]["adj"].append(i)

    for i, t in enumerate(territories):
        if not t["adj"]:
            dists = []
            for j in range(n):
                if i != j:
                    d = haversine(t["lon"], t["lat"], territories[j]["lon"], territories[j]["lat"])
                    dists.append((d, j))
            dists.sort(key=lambda x: x[0])
            nearest = dists[0][1]
            t["adj"].append(nearest)
            if i not in territories[nearest]["adj"]:
                territories[nearest]["adj"].append(i)

    capital_names = {"Carthage", "Rome", "Athenes", "Athènes", "Jérusalem", "Jerusalem", "Babylone",
                     "Istanbul", "Constantinople", "Byzance", "Pékin", "Pekin", "Tenochtitlan", "Mexico",
                     "Delhi", "Memphis", "Paris", "Londres", "Londinium"}
    for t in territories:
        for cn in capital_names:
            if cn.lower() in t["name"].lower():
                t["capital"] = True
                t["army"] += 10
                t["population"] += 5000
                break

    return territories


def generate_punic_name():
    """Generate a random Punic/Carthaginian city name for new settlements"""
    prefixes = ["Hanno", "Mago", "Hamil", "Hasdr", "Bomil", "Carth", "Utic", "Lept", "Hippo", "Thaps", "Rus", "Ting", "Siga", "Malc", "Sufet", "Adrum", "Theve", "Cirta", "Rusic", "Sald"]
    suffixes = ["baal", "melk", "naba", "thar", "gigas", "polis", "sir", "dur", "sada", "tica", "nium", "ma", "lis", "ra", "ca", "la", "na", "ar", "on", "is"]
    p = random.choice(prefixes)
    s = random.choice(suffixes)
    return p + s
