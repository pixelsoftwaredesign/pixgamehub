/* Charge dynamiquement les jeux créés dans le Studio (configs du moteur). */
(async function loadCreatorGames() {
  try {
    const r = await fetch('/api/studio/configs');
    if (!r.ok) throw new Error('API indisponible');
    const { games = [] } = await r.json();
    const mine = games.filter(g => g.id !== 'strat');
    const section = document.getElementById('creator-section');
    const wrap = document.getElementById('creator-games');
    if (!section || !wrap) return;
    if (!mine.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    wrap.innerHTML = mine.map(g => `
      <div class="game-card" style="cursor:pointer" onclick="location.href='games/creator/?gid=${encodeURIComponent(g.id)}'">
        <div class="game-preview" style="display:flex; align-items:center; justify-content:center; font-size:52px; background:radial-gradient(circle at 50% 40%, #20304a 0%, #141a2c 70%);">
          <span>${g.icon || '🎮'}</span>
        </div>
        <div class="game-info">
          <span class="game-genre">${g.genre || 'Stratégie'}</span>
          <h2>${g.name || g.id}</h2>
          <p style="color:#8a9a7a; font-size:12px;">Créé dans le Studio · moteur de stratégie configuré</p>
        </div>
        <div class="play-btn">JOUER</div>
      </div>
    `).join('');
  } catch (e) {
    /* API absente (déploiement statique) : on masque simplement la section */
    const section = document.getElementById('creator-section');
    if (section) section.style.display = 'none';
  }
})();
