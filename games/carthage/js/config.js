export const COLORS = ["#e74c3c","#3498db","#2ed573","#f39c12","#9b59b6","#1abc9c","#e67e22","#a4b0be"]

export function proj(lon, lat) {
  return { x: (lon + 100) * 36 + 20, y: (45 - lat) * 56 + 10 }
}

export const CITY_BUILDINGS = {
  wall:{name:'Mur',icon:'🧱',cost:30,defense:0.05},
  wall_2:{name:'Mur renf.',icon:'🧱',cost:60,defense:0.10},
  wall_3:{name:'Citadelle',icon:'🏰',cost:120,defense:0.20},
  barracks:{name:'Caserne',icon:'⚔️',cost:100,army:200},
  market:{name:'Marche',icon:'💰',cost:80,gold:15},
  house:{name:'Logement',icon:'🏠',cost:50,pop:500},
  street:{name:'Rue',icon:'🛤',cost:5,pop:50},
  plaza:{name:'Place',icon:'⛲',cost:40,moral:5,pop:200},
  hammam:{name:'Hammam',icon:'♨️',cost:60,moral:8,pop:300},
  temple_small:{name:'Temple',icon:'☥',cost:50,moral:10},
  tree:{name:'Arbre',icon:'🌲',cost:15,wood:2,pop:20},
  pine:{name:'Pin',icon:'🌲',cost:25,wood:4,pop:30},
  rocks:{name:'Rocher',icon:'⛰',cost:25,stone:2},
  mountain:{name:'Montagne',icon:'🗻',cost:45,stone:5,defense:0.03},
  garden:{name:'Jardin',icon:'🌺',cost:20,food:3,moral:3},
  fountain:{name:'Fontaine',icon:'⛲',cost:35,moral:6,pop:100},
}

export const TILE_COLORS = {
  wall:'#5a2d22',wall_2:'#7a3d2a',wall_3:'#9a5d3a',
  street:'#3a3a3a',plaza:'#2a4a6a',hammam:'#6a4a2a',
  temple_small:'#5a2a4a',garden:'#2a5a2a',fountain:'#2a4a7a',
  tree:'#1a4a2a',pine:'#0a3a1a',rocks:'#5a5a5a',mountain:'#3a3a3a',
  barracks:'#4a2a1a',market:'#6a5a1a',house:'#4a3a2a',
}
