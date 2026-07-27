// ═════════════════════════════════════════════════════════════════════════════
//  PixGameHub — Virtual Gamepad (Mobile/Tablet Auto-Detect)
//  Pixel Software Design
// ═════════════════════════════════════════════════════════════════════════════
(function() {
'use strict';

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth <= 1024);

if (!isMobile) return;

function pressKey(key, code) {
    const opts = { key, code, bubbles: true, cancelable: true };
    document.activeElement && document.activeElement.dispatchEvent(new KeyboardEvent('keydown', opts));
    window.dispatchEvent(new KeyboardEvent('keydown', opts));
}

function releaseKey(key, code) {
    const opts = { key, code, bubbles: true, cancelable: true };
    document.activeElement && document.activeElement.dispatchEvent(new KeyboardEvent('keyup', opts));
    window.dispatchEvent(new KeyboardEvent('keyup', opts));
}

function createBtn(label, keyCode, keyVal, cssExtra) {
    const btn = document.createElement('div');
    btn.className = 'gp-btn';
    btn.innerHTML = label;
    if (cssExtra) btn.style.cssText = cssExtra;
    btn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('active');
        pressKey(keyVal, keyCode);
    }, { passive: false });
    btn.addEventListener('touchend', function(e) {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('active');
        releaseKey(keyVal, keyCode);
    }, { passive: false });
    btn.addEventListener('touchcancel', function(e) {
        btn.classList.remove('active');
        releaseKey(keyVal, keyCode);
    });
    return btn;
}

function initGamepad() {
    if (document.getElementById('pix-gamepad')) return;

    const pad = document.createElement('div');
    pad.id = 'pix-gamepad';
    pad.innerHTML = `
        <style>
            #pix-gamepad{position:fixed;bottom:0;left:0;right:0;z-index:99998;pointer-events:none;font-family:monospace}
            #pix-gamepad .gp-row{display:flex;justify-content:space-between;align-items:flex-end;padding:8px 12px 20px;pointer-events:auto}
            #pix-gamepad .gp-dpad{position:relative;width:120px;height:120px}
            #pix-gamepad .gp-btn{width:52px;height:52px;background:rgba(141,54,41,0.6);border:2px solid rgba(226,160,61,0.5);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#e2a03d;font-size:14px;font-weight:bold;user-select:none;-webkit-user-select:none;touch-action:none;transition:background 0.1s}
            #pix-gamepad .gp-btn.active{background:rgba(226,160,61,0.8);color:#1a0a08}
            #pix-gamepad .gp-btn.action{width:56px;height:56px;border-radius:50%;font-size:11px}
            #pix-gamepad .gp-btn.action-a{background:rgba(46,204,113,0.5);border-color:rgba(46,204,113,0.7)}
            #pix-gamepad .gp-btn.action-a.active{background:rgba(46,204,113,0.9);color:#000}
            #pix-gamepad .gp-btn.action-b{background:rgba(231,76,60,0.5);border-color:rgba(231,76,60,0.7)}
            #pix-gamepad .gp-btn.action-b.active{background:rgba(231,76,60,0.9);color:#fff}
            #pix-gamepad .gp-btn.action-c{background:rgba(52,152,219,0.5);border-color:rgba(52,152,219,0.7)}
            #pix-gamepad .gp-btn.action-c.active{background:rgba(52,152,219,0.9);color:#fff}
            #pix-gamepad .gp-actions{display:flex;gap:10px;align-items:center}
            #pix-gamepad .gp-label{color:#8c757d;font-size:9px;text-align:center;margin-bottom:4px;letter-spacing:1px}
            #pix-gamepad .dpad-grid{display:grid;grid-template-columns:repeat(3,40px);grid-template-rows:repeat(3,40px);gap:0}
            #pix-gamepad .dpad-center{width:40px;height:40px}
            #pix-gamepad .gp-toggle{position:fixed;bottom:20px;right:20px;z-index:99999;width:48px;height:48px;background:rgba(141,54,41,0.8);border:2px solid #e2a03d;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;pointer-events:auto;transition:all 0.2s}
            #pix-gamepad .gp-toggle:active{transform:scale(0.9)}
            #pix-gamepad.hidden .gp-row{display:none}
        </style>
        <div class="gp-toggle" id="gp-toggle">🎮</div>
        <div class="gp-row" id="gp-controls" style="display:none">
            <div class="gp-dpad">
                <div class="dpad-grid">
                    <div></div>
                    ${createBtnHTML('▲', 'ArrowUp', 'ArrowUp', 'grid-column:2')}
                    <div></div>
                    ${createBtnHTML('◀', 'ArrowLeft', 'ArrowLeft', 'grid-column:1;grid-row:2')}
                    <div class="dpad-center"></div>
                    ${createBtnHTML('▶', 'ArrowRight', 'ArrowRight', 'grid-column:3;grid-row:2')}
                    <div></div>
                    ${createBtnHTML('▼', 'ArrowDown', 'ArrowDown', 'grid-column:2;grid-row:3')}
                    <div></div>
                </div>
            </div>
            <div class="gp-actions">
                <div>
                    <div class="gp-label">ACTIONS</div>
                    <div style="display:flex;gap:8px">
                        ${createBtnHTML('X', 'KeyX', 'x', 'border-radius:50%;width:56px;height:56px;background:rgba(46,204,113,0.5);border-color:rgba(46,204,113,0.7)')}
                        ${createBtnHTML('Z', 'KeyZ', 'z', 'border-radius:50%;width:56px;height:56px;background:rgba(231,76,60,0.5);border-color:rgba(231,76,60,0.7)')}
                    </div>
                </div>
                <div>
                    <div class="gp-label">AUX</div>
                    <div style="display:flex;gap:8px">
                        ${createBtnHTML('S', 'KeyS', 's', 'border-radius:50%;width:44px;height:44px;font-size:11px;background:rgba(52,152,219,0.5);border-color:rgba(52,152,219,0.7)')}
                        ${createBtnHTML('E', 'KeyE', 'e', 'border-radius:50%;width:44px;height:44px;font-size:11px;background:rgba(155,89,182,0.5);border-color:rgba(155,89,182,0.7)')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(pad);

    const toggle = document.getElementById('gp-toggle');
    const controls = document.getElementById('gp-controls');
    let visible = false;

    toggle.addEventListener('click', function() {
        visible = !visible;
        controls.style.display = visible ? 'flex' : 'none';
        toggle.textContent = visible ? '✕' : '🎮';
    });

    pad.querySelectorAll('.gp-btn[data-key]').forEach(function(btn) {
        const keyVal = btn.getAttribute('data-key');
        const keyCode = btn.getAttribute('data-code');

        btn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.add('active');
            pressKey(keyVal, keyCode);
        }, { passive: false });

        btn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.remove('active');
            releaseKey(keyVal, keyCode);
        }, { passive: false });

        btn.addEventListener('touchcancel', function() {
            btn.classList.remove('active');
            releaseKey(keyVal, keyCode);
        });
    });
}

function createBtnHTML(label, code, key, css) {
    return `<div class="gp-btn" data-code="${code}" data-key="${key}" style="${css}">${label}</div>`;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGamepad);
} else {
    initGamepad();
}

})();
