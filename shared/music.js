/**
 * shared-music.js — Musique de fond pour tous les jeux
 * Charge et joue Sables d'Opale.mp3 en boucle avec fade-in
 */
(function() {
    function initGameMusic() {
        try {
            const audio = new Audio();
            audio.src = '../../shared/audio/Sables d\'Opale.mp3';
            audio.loop = true;
            audio.volume = 0;
            audio.preload = 'auto';

            let started = false;

            function startMusic() {
                if (started) return;
                started = true;
                audio.play().then(() => {
                    let vol = 0;
                    const fadeIn = setInterval(() => {
                        vol += 0.02;
                        if (vol >= 0.35) { vol = 0.35; clearInterval(fadeIn); }
                        audio.volume = vol;
                    }, 50);
                }).catch(() => {});
            }

            document.addEventListener('keydown', startMusic, { once: false });
            document.addEventListener('click', startMusic, { once: false });
            document.addEventListener('touchstart', startMusic, { once: false });

            window.gameMusic = audio;
        } catch(e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGameMusic);
    } else {
        initGameMusic();
    }
})();
