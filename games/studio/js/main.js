/* Studio — point d'entrée. Charge les modules et expose sur window les
   fonctions appelées par les attributs onclick du HTML (scripts classiques
   → modules ES : les fonctions ne sont plus globales par défaut). */

import { init, newGame, loadSelected } from './modules/initialisation.js';
import { render, addUnit, delUnit, addBuilding, delBuilding } from './modules/conception.js';
import { createKey, listKeys, generateGame, saveGame } from './modules/creation.js';
import { downloadJson, bpAddNode, bpClear, bpCompile, bpEnable } from './modules/coding.js';

Object.assign(window, {
  newGame,
  loadSelected,
  addUnit,
  delUnit,
  addBuilding,
  delBuilding,
  saveGame,
  createKey,
  listKeys,
  generateGame,
  downloadJson,
  bpAddNode,
  bpClear,
  bpCompile,
  bpEnable,
});

init();
