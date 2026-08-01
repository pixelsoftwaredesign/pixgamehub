const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#95a5a6']

function proj(lon, lat) {
  return { x: (lon + 6) * 70 + 400, y: (48 - lat) * 70 + 100 }
}

const TERRITORIES = [
  {id:0, name:'Carthage', lon:10.3, lat:36.85, capital:true, adj:[1,2,35]},
  {id:1, name:'Utique', lon:10.1, lat:37.05, adj:[0,2]},
  {id:2, name:'Hadrumète', lon:10.8, lat:34.2, adj:[0,1,3]},
  {id:3, name:'Thapsus', lon:10.6, lat:34.7, adj:[2,4]},
  {id:4, name:'Lepcis Magna', lon:14.3, lat:32.7, adj:[3,5]},
  {id:5, name:'Cyrène', lon:17.9, lat:31.2, adj:[4]},
  {id:6, name:'Rome', lon:12.5, lat:41.9, capital:true, adj:[7,8,35]},
  {id:7, name:'Neapolis', lon:14.3, lat:40.8, adj:[6,8,9]},
  {id:8, name:'Capoue', lon:14.3, lat:41.1, adj:[6,7]},
  {id:9, name:'Tarente', lon:17.3, lat:40.5, adj:[7,10]},
  {id:10, name:'Brindisi', lon:17.9, lat:40.6, adj:[9]},
  {id:11, name:'Syracuse', lon:15.1, lat:37.1, adj:[12,35]},
  {id:12, name:'Agrigente', lon:13.6, lat:37.3, adj:[11]},
  {id:13, name:'Massilia', lon:5.4, lat:43.3, adj:[14,19]},
  {id:14, name:'Narbo', lon:3.0, lat:43.2, adj:[13,15]},
  {id:15, name:'Tarraco', lon:1.3, lat:41.1, adj:[14,16]},
  {id:16, name:'Sagonte', lon:-0.2, lat:39.7, adj:[15,17]},
  {id:17, name:'Corduba', lon:-4.8, lat:37.9, adj:[16,18]},
  {id:18, name:'Gadès', lon:-6.3, lat:36.5, adj:[17]},
  {id:19, name:'Alexandrie', lon:31.2, lat:30.0, capital:true, adj:[20,21]},
  {id:20, name:'Memphis', lon:31.1, lat:29.5, adj:[19,21]},
  {id:21, name:'Thèbes', lon:32.7, lat:25.7, adj:[19,20]},
  {id:22, name:'Athènes', lon:23.7, lat:38.0, capital:true, adj:[23,24,25]},
  {id:23, name:'Sparte', lon:22.4, lat:37.1, adj:[22,24]},
  {id:24, name:'Corinthe', lon:22.9, lat:37.9, adj:[22,23,25]},
  {id:25, name:'Thessalonique', lon:22.9, lat:40.6, adj:[22,24,26]},
  {id:26, name:'Byzance', lon:28.9, lat:41.0, capital:true, adj:[25,27]},
  {id:27, name:'Nicomédie', lon:29.9, lat:40.8, adj:[26,28]},
  {id:28, name:'Antioche', lon:36.2, lat:36.2, adj:[26,27]},
  {id:29, name:'Jerusalem', lon:35.2, lat:31.8, adj:[19]},
  {id:30, name:'Palmyre', lon:38.3, lat:34.6, adj:[28,29]},
  {id:31, name:'Césarée', lon:3.0, lat:36.8, adj:[0,13]},
  {id:32, name:'Cirta', lon:7.9, lat:36.6, adj:[0,31]},
  {id:33, name:'Hippone', lon:7.7, lat:36.9, adj:[31,32]},
  {id:34, name:'Lilybée', lon:12.6, lat:37.8, adj:[11,35]},
  {id:35, name:'Mer Tyrrhénienne', lon:11.5, lat:39.0, adj:[0,6,11,34]},
]

// Compute pixel positions
for (let t of TERRITORIES) {
  let p = proj(t.lon, t.lat)
  t._px = p.x; t._py = p.y
}

const BUILDINGS = {
  house:{name:'Maison',icon:'🏠',cost:{gold:30,wood:20},pop:500},
  farm:{name:'Ferme',icon:'🌾',cost:{gold:20},food:15},
  wall:{name:'Mur',icon:'🧱',cost:{stone:25},defense:0.1},
  barracks:{name:'Caserne',icon:'⚔️',cost:{gold:80,wood:40},army:2},
  market:{name:'Marché',icon:'💰',cost:{gold:50,wood:30},gold:10},
  temple:{name:'Temple',icon:'☥',cost:{gold:60,stone:30},mood:5},
  port:{name:'Port',icon:'⚓',cost:{gold:100,wood:80},trade:15},
}
