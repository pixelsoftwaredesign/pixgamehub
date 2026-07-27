// ═════════════════════════════════════════════════════════════════════════════
//  PixGameHub — Virtual Gamepad v3 (Mobile/Tablet Auto-Detect)
//  Pixel Software Design
//  Features: Joystick, multi-touch, haptic, scroll lock, shoulder buttons
// ═════════════════════════════════════════════════════════════════════════════
(function () {
'use strict';

var IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window && window.innerWidth <= 1024);
if (!IS_MOBILE) return;

var _held = {};
var VIBRATE_MS = 12;

function haptic() { try { navigator.vibrate(VIBRATE_MS); } catch (e) {} }

function keyEvent(type, key, code) {
    var t = document.activeElement || document.body;
    var c = KC(code);
    var o = { key: key, code: code, keyCode: c, which: c, charCode: 0, bubbles: true, cancelable: true, composed: true };
    try { t.dispatchEvent(new KeyboardEvent(type, o)); } catch (e) {}
    try { window.dispatchEvent(new KeyboardEvent(type, o)); } catch (e) {}
}

function KC(code) {
    var M = { ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39,KeyX:88,KeyZ:90,KeyS:83,KeyE:69,Space:32,Enter:13,Escape:27,ShiftLeft:16,ShiftRight:16,KeyA:65,KeyB:66,KeyC:67,KeyD:68,KeyW:87,KeyQ:81,KeyR:82,KeyF:70,KeyP:80,BracketLeft:219,BracketRight:221,Backspace:8 };
    return M[code] || 0;
}

function down(key, code) {
    if (_held[code]) return;
    _held[code] = true;
    haptic();
    keyEvent('keydown', key, code);
}

function up(key, code) {
    if (!_held[code]) return;
    delete _held[code];
    keyEvent('keyup', key, code);
}

function releaseAll() {
    for (var c in _held) { keyEvent('keyup', c, c); }
    _held = {};
}

function addTouch(el, key, code) {
    el.addEventListener('touchstart', function (e) {
        e.preventDefault(); e.stopPropagation();
        el.classList.add('on');
        down(key, code);
    }, { passive: false });
    el.addEventListener('touchend', function (e) {
        e.preventDefault(); e.stopPropagation();
        el.classList.remove('on');
        up(key, code);
    }, { passive: false });
    el.addEventListener('touchcancel', function () { el.classList.remove('on'); up(key, code); });
    el.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
}

// ─── Joystick ──────────────────────────────────────────────────────────────
function createJoystick(container, onMove) {
    var size = 120, stickR = 24;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.style.cssText = 'touch-action:none;pointer-events:auto;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.4))';
    container.appendChild(svg);

    var cx = size / 2, cy = size / 2;
    var baseR = size / 2 - 4;

    var baseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    baseCircle.setAttribute('cx', cx);
    baseCircle.setAttribute('cy', cy);
    baseCircle.setAttribute('r', baseR);
    baseCircle.setAttribute('fill', 'rgba(226,160,61,0.08)');
    baseCircle.setAttribute('stroke', 'rgba(226,160,61,0.3)');
    baseCircle.setAttribute('stroke-width', '1.5');
    svg.appendChild(baseCircle);

    var crossH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    crossH.setAttribute('x1', cx - baseR + 10); crossH.setAttribute('y1', cy);
    crossH.setAttribute('x2', cx + baseR - 10); crossH.setAttribute('y2', cy);
    crossH.setAttribute('stroke', 'rgba(226,160,61,0.1)'); crossH.setAttribute('stroke-width', '1');
    svg.appendChild(crossH);

    var crossV = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    crossV.setAttribute('x1', cx); crossV.setAttribute('y1', cy - baseR + 10);
    crossV.setAttribute('x2', cx); crossV.setAttribute('y2', cy + baseR - 10);
    crossV.setAttribute('stroke', 'rgba(226,160,61,0.1)'); crossV.setAttribute('stroke-width', '1');
    svg.appendChild(crossV);

    var stick = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    stick.setAttribute('cx', cx);
    stick.setAttribute('cy', cy);
    stick.setAttribute('r', stickR);
    stick.setAttribute('fill', 'rgba(226,160,61,0.25)');
    stick.setAttribute('stroke', 'rgba(226,160,61,0.6)');
    stick.setAttribute('stroke-width', '2');
    stick.style.cssText = 'transition:fill 0.1s,stroke 0.1s';
    svg.appendChild(stick);

    var deadzone = 0.25;
    var keys = { x: null, y: null };
    var keyMap = {
        '+x': { key: 'ArrowRight', code: 'ArrowRight' },
        '-x': { key: 'ArrowLeft', code: 'ArrowLeft' },
        '+y': { key: 'ArrowDown', code: 'ArrowDown' },
        '-y': { key: 'ArrowUp', code: 'ArrowUp' }
    };

    function updateKeys(dx, dy) {
        var nx = dx / (baseR - stickR);
        var ny = dy / (baseR - stickR);
        var ax = Math.abs(nx), ay = Math.abs(ny);

        var newKeyX = null, newKeyY = null;
        if (ax > deadzone) newKeyX = nx > 0 ? '+x' : '-x';
        if (ay > deadzone) newKeyY = ny > 0 ? '+y' : '-y';

        if (newKeyX !== keys.x) {
            if (keys.x) up(keyMap[keys.x].key, keyMap[keys.x].code);
            keys.x = newKeyX;
            if (keys.x) down(keyMap[keys.x].key, keyMap[keys.x].code);
        }
        if (newKeyY !== keys.y) {
            if (keys.y) up(keyMap[keys.y].key, keyMap[keys.y].code);
            keys.y = newKeyY;
            if (keys.y) down(keyMap[keys.y].key, keyMap[keys.y].code);
        }
    }

    function center() {
        stick.setAttribute('cx', cx);
        stick.setAttribute('cy', cy);
        stick.setAttribute('fill', 'rgba(226,160,61,0.25)');
        stick.setAttribute('stroke', 'rgba(226,160,61,0.6)');
        updateKeys(0, 0);
    }

    var tracking = -1;
    var origin = { x: 0, y: 0 };

    svg.addEventListener('touchstart', function (e) {
        e.preventDefault(); e.stopPropagation();
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (tracking === -1) {
                tracking = e.changedTouches[i].identifier;
                var rect = svg.getBoundingClientRect();
                origin.x = e.changedTouches[i].clientX - rect.left;
                origin.y = e.changedTouches[i].clientY - rect.top;
                stick.setAttribute('fill', 'rgba(226,160,61,0.4)');
                stick.setAttribute('stroke', '#e2a03d');
            }
        }
    }, { passive: false });

    svg.addEventListener('touchmove', function (e) {
        e.preventDefault(); e.stopPropagation();
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === tracking) {
                var rect = svg.getBoundingClientRect();
                var tx = e.changedTouches[i].clientX - rect.left;
                var ty = e.changedTouches[i].clientY - rect.top;
                var dx = tx - origin.x, dy = ty - origin.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var maxDist = baseR - stickR;
                if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }
                stick.setAttribute('cx', cx + dx);
                stick.setAttribute('cy', cy + dy);
                updateKeys(dx, dy);
                return;
            }
        }
    }, { passive: false });

    function endTouch(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === tracking) {
                tracking = -1;
                center();
                return;
            }
        }
    }
    svg.addEventListener('touchend', function (e) { e.preventDefault(); endTouch(e); }, { passive: false });
    svg.addEventListener('touchcancel', endTouch);
    svg.addEventListener('touchstart', function () {}, { passive: false });
}

// ─── Main Init ─────────────────────────────────────────────────────────────
function initGamepad() {
    if (document.getElementById('pix-gamepad')) return;

    document.addEventListener('touchstart', function (e) {
        if (!e.target.closest('#pix-gamepad')) e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('gesturechange', function (e) { e.preventDefault(); });

    var pad = document.createElement('div');
    pad.id = 'pix-gamepad';
    pad.innerHTML =
    '<style>' +
        '#pix-gamepad{position:fixed;bottom:0;left:0;right:0;height:200px;z-index:99998;pointer-events:none;font-family:"Courier New",monospace}' +
        '#pix-gamepad *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}' +

        '#pix-gamepad .gp-row{display:flex;justify-content:space-between;align-items:flex-end;padding:0 12px 12px;height:100%}' +
        '#pix-gamepad .gp-side{pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}' +

        '#pix-gamepad .gp-btn{' +
            'width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;' +
            'font-size:12px;font-weight:bold;letter-spacing:1px;touch-action:none;transition:all 0.06s;' +
        '}' +
        '#pix-gamepad .gp-btn:active,.gp-btn.on{transform:scale(1.1);filter:brightness(1.5)}' +

        '#pix-gamepad .gp-act{background:rgba(46,204,113,0.12);border:2px solid rgba(46,204,113,0.4);color:rgba(46,204,113,0.7)}' +
        '#pix-gamepad .gp-act.on{background:rgba(46,204,113,0.45);border-color:#2ecc71;color:#fff;box-shadow:0 0 14px rgba(46,204,113,0.35)}' +

        '#pix-gamepad .gp-brk{background:rgba(231,76,60,0.12);border:2px solid rgba(231,76,60,0.4);color:rgba(231,76,60,0.7)}' +
        '#pix-gamepad .gp-brk.on{background:rgba(231,76,60,0.45);border-color:#e74c3c;color:#fff;box-shadow:0 0 14px rgba(231,76,60,0.35)}' +

        '#pix-gamepad .gp-aux1{background:rgba(52,152,219,0.1);border:2px solid rgba(52,152,219,0.3);color:rgba(52,152,219,0.6);width:38px;height:38px;border-radius:50%;font-size:10px}' +
        '#pix-gamepad .gp-aux1.on{background:rgba(52,152,219,0.4);border-color:#3498db;color:#fff;box-shadow:0 0 10px rgba(52,152,219,0.3)}' +

        '#pix-gamepad .gp-aux2{background:rgba(155,89,182,0.1);border:2px solid rgba(155,89,182,0.3);color:rgba(155,89,182,0.6);width:38px;height:38px;border-radius:50%;font-size:10px}' +
        '#pix-gamepad .gp-aux2.on{background:rgba(155,89,182,0.4);border-color:#9b59b6;color:#fff;box-shadow:0 0 10px rgba(155,89,182,0.3)}' +

        '#pix-gamepad .gp-space{background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.35);width:64px;height:30px;border-radius:15px;font-size:8px;letter-spacing:2px}' +
        '#pix-gamepad .gp-space.on{background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.4);color:#fff}' +

        '#pix-gamepad .gp-shoulder{background:rgba(226,160,61,0.08);border:1.5px solid rgba(226,160,61,0.25);color:rgba(226,160,61,0.5);width:56px;height:26px;border-radius:6px;font-size:9px;letter-spacing:1px}' +
        '#pix-gamepad .gp-shoulder.on{background:rgba(226,160,61,0.35);border-color:#e2a03d;color:#fff;box-shadow:0 0 10px rgba(226,160,61,0.3)}' +

        '#pix-gamepad .gp-label{color:rgba(255,255,255,0.2);font-size:7px;letter-spacing:2px;margin-bottom:5px;text-transform:uppercase}' +
        '#pix-gamepad .gp-row-btns{display:flex;gap:8px;align-items:center}' +
        '#pix-gamepad .gp-row-sm{display:flex;gap:6px;margin-top:8px;align-items:center}' +

        '#pix-gamepad .gp-toggle{' +
            'position:fixed;bottom:10px;right:10px;z-index:99999;' +
            'width:40px;height:40px;border-radius:50%;' +
            'background:rgba(10,5,8,0.85);border:2px solid rgba(226,160,61,0.35);' +
            'display:flex;align-items:center;justify-content:center;' +
            'font-size:17px;cursor:pointer;pointer-events:auto;transition:all 0.15s;' +
            'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
        '}' +
        '#pix-gamepad .gp-toggle:active{transform:scale(0.85)}' +
        '#pix-gamepad .gp-toggle.open{border-color:#e2a03d;background:rgba(226,160,61,0.15)}' +
        '#pix-gamepad.collapsed .gp-row{display:none}' +
    '</style>' +
    '<div class="gp-toggle" id="gp-toggle">🎮</div>' +
    '<div class="gp-row" id="gp-controls" style="display:none">' +
        '<div class="gp-side">' +
            '<div class="gp-shoulder gp-btn" data-key="ShiftLeft">L1</div>' +
            '<div id="gp-joystick" style="margin-top:8px"></div>' +
        '</div>' +
        '<div class="gp-side" style="padding-bottom:4px">' +
            '<div class="gp-shoulder gp-btn" data-key="ShiftRight">R1</div>' +
            '<div class="gp-label" style="margin-top:8px">ACTIONS</div>' +
            '<div class="gp-row-btns">' +
                '<div class="gp-btn gp-act" data-key="KeyX">X</div>' +
                '<div class="gp-btn gp-brk" data-key="KeyZ">Z</div>' +
            '</div>' +
            '<div class="gp-row-sm">' +
                '<div class="gp-btn gp-aux1" data-key="KeyS">S</div>' +
                '<div class="gp-btn gp-space" data-key="Space">SPACE</div>' +
                '<div class="gp-btn gp-aux2" data-key="KeyE">E</div>' +
            '</div>' +
        '</div>' +
    '</div>';
    document.body.appendChild(pad);

    createJoystick(document.getElementById('gp-joystick'));

    var toggle = document.getElementById('gp-toggle');
    var controls = document.getElementById('gp-controls');
    var visible = false;

    toggle.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        visible = !visible;
        controls.style.display = visible ? 'flex' : 'none';
        toggle.textContent = visible ? '✕' : '🎮';
        toggle.classList.toggle('open', visible);
    });

    pad.querySelectorAll('[data-key]').forEach(function (el) {
        var keyVal = el.getAttribute('data-key');
        var key = keyVal.length === 1 ? keyVal.toLowerCase() : keyVal;
        addTouch(el, key, keyVal);
    });

    window.addEventListener('blur', releaseAll);
    window.addEventListener('pagehide', releaseAll);
    window.addEventListener('beforeunload', releaseAll);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGamepad);
} else {
    initGamepad();
}

})();
