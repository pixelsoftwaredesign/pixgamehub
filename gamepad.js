// ═════════════════════════════════════════════════════════════════════════════
//  PixGameHub — Virtual Gamepad v4 (Mobile/Tablet Auto-Detect)
//  Pixel Software Design
//  Toggle button always visible — separate from controls overlay
// ═════════════════════════════════════════════════════════════════════════════
(function () {
'use strict';

var IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window && window.innerWidth <= 1024);
if (!IS_MOBILE) return;

var _held = {};

function haptic() { try { navigator.vibrate(12); } catch (e) {} }

function KC(code) {
    var M = { ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39,KeyX:88,KeyZ:90,KeyS:83,KeyE:69,Space:32,Enter:13,Escape:27,ShiftLeft:16,ShiftRight:16 };
    return M[code] || 0;
}

function keyFire(type, key, code) {
    var c = KC(code);
    var o = { key: key, code: code, keyCode: c, which: c, charCode: 0, bubbles: true, cancelable: true, composed: true };
    try { (document.activeElement || document.body).dispatchEvent(new KeyboardEvent(type, o)); } catch (e) {}
    try { window.dispatchEvent(new KeyboardEvent(type, o)); } catch (e) {}
}

function down(key, code) {
    if (_held[code]) return;
    _held[code] = true;
    haptic();
    keyFire('keydown', key, code);
}

function up(key, code) {
    if (!_held[code]) return;
    delete _held[code];
    keyFire('keyup', key, code);
}

function releaseAll() {
    for (var c in _held) keyFire('keyup', c, c);
    _held = {};
}

function bindBtn(el) {
    var keyVal = el.getAttribute('data-key');
    var key = keyVal.length === 1 ? keyVal.toLowerCase() : keyVal;

    el.addEventListener('touchstart', function (e) {
        e.preventDefault(); e.stopPropagation();
        el.classList.add('on');
        down(key, keyVal);
    }, { passive: false });

    el.addEventListener('touchend', function (e) {
        e.preventDefault(); e.stopPropagation();
        el.classList.remove('on');
        up(key, keyVal);
    }, { passive: false });

    el.addEventListener('touchcancel', function () {
        el.classList.remove('on');
        up(key, keyVal);
    });

    el.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
}

// ─── Joystick SVG ──────────────────────────────────────────────────────────
function createJoystick(container) {
    var size = 130, stickR = 24;
    var cx = size / 2, cy = size / 2;
    var baseR = size / 2 - 6;
    var deadzone = 0.25;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.style.cssText = 'touch-action:none;pointer-events:auto;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))';
    container.appendChild(svg);

    function svgEl(tag, attrs) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (var k in attrs) el.setAttribute(k, attrs[k]);
        return el;
    }

    svg.appendChild(svgEl('circle', { cx:cx, cy:cy, r:baseR, fill:'rgba(226,160,61,0.06)', stroke:'rgba(226,160,61,0.25)', 'stroke-width':'1.5' }));
    svg.appendChild(svgEl('line', { x1:cx-baseR+12, y1:cy, x2:cx+baseR-12, y2:cy, stroke:'rgba(226,160,61,0.08)', 'stroke-width':'1' }));
    svg.appendChild(svgEl('line', { x1:cx, y1:cy-baseR+12, x2:cx, y2:cy+baseR-12, stroke:'rgba(226,160,61,0.08)', 'stroke-width':'1' }));
    svg.appendChild(svgEl('circle', { cx:cx, cy:cy, r:'4', fill:'rgba(226,160,61,0.15)' }));

    var stick = svgEl('circle', { cx:cx, cy:cy, r:stickR, fill:'rgba(226,160,61,0.2)', stroke:'rgba(226,160,61,0.5)', 'stroke-width':'2' });
    stick.style.cssText = 'transition:fill 0.08s,stroke 0.08s';
    svg.appendChild(stick);

    var keyMap = { '+x':{key:'ArrowRight',code:'ArrowRight'}, '-x':{key:'ArrowLeft',code:'ArrowLeft'}, '+y':{key:'ArrowDown',code:'ArrowDown'}, '-y':{key:'ArrowUp',code:'ArrowUp'} };
    var heldDir = { x: null, y: null };

    function updateDirs(dx, dy) {
        var maxD = baseR - stickR;
        var nx = dx / maxD, ny = dy / maxD;
        var newKeyX = Math.abs(nx) > deadzone ? (nx > 0 ? '+x' : '-x') : null;
        var newKeyY = Math.abs(ny) > deadzone ? (ny > 0 ? '+y' : '-y') : null;

        if (newKeyX !== heldDir.x) {
            if (heldDir.x) up(keyMap[heldDir.x].key, keyMap[heldDir.x].code);
            heldDir.x = newKeyX;
            if (heldDir.x) down(keyMap[heldDir.x].key, keyMap[heldDir.x].code);
        }
        if (newKeyY !== heldDir.y) {
            if (heldDir.y) up(keyMap[heldDir.y].key, keyMap[heldDir.y].code);
            heldDir.y = newKeyY;
            if (heldDir.y) down(keyMap[heldDir.y].key, keyMap[heldDir.y].code);
        }
    }

    function center() {
        stick.setAttribute('cx', cx); stick.setAttribute('cy', cy);
        stick.setAttribute('fill', 'rgba(226,160,61,0.2)');
        stick.setAttribute('stroke', 'rgba(226,160,61,0.5)');
        updateDirs(0, 0);
    }

    var tracking = -1, originX = 0, originY = 0;

    function getTouchById(touches, id) {
        for (var i = 0; i < touches.length; i++) {
            if (touches[i].identifier === id) return touches[i];
        }
        return null;
    }

    svg.addEventListener('touchstart', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (tracking !== -1) return;
        var t = e.changedTouches[0];
        tracking = t.identifier;
        var rect = svg.getBoundingClientRect();
        originX = t.clientX - rect.left;
        originY = t.clientY - rect.top;
        stick.setAttribute('fill', 'rgba(226,160,61,0.35)');
        stick.setAttribute('stroke', '#e2a03d');
    }, { passive: false });

    svg.addEventListener('touchmove', function (e) {
        e.preventDefault(); e.stopPropagation();
        var t = getTouchById(e.changedTouches, tracking);
        if (!t) return;
        var rect = svg.getBoundingClientRect();
        var dx = (t.clientX - rect.left) - originX;
        var dy = (t.clientY - rect.top) - originY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxD = baseR - stickR;
        if (dist > maxD) { dx = dx / dist * maxD; dy = dy / dist * maxD; }
        stick.setAttribute('cx', cx + dx);
        stick.setAttribute('cy', cy + dy);
        updateDirs(dx, dy);
    }, { passive: false });

    function endTouch(e) {
        var t = getTouchById(e.changedTouches, tracking);
        if (t) { tracking = -1; center(); }
    }
    svg.addEventListener('touchend', function (e) { e.preventDefault(); endTouch(e); }, { passive: false });
    svg.addEventListener('touchcancel', endTouch);

    return { releaseAll: function() { heldDir.x = null; heldDir.y = null; center(); } };
}

// ─── Main ──────────────────────────────────────────────────────────────────
function init() {
    if (document.getElementById('pix-gamepad-toggle')) return;

    var joystick = null;

    // Toggle button — OUTSIDE the gamepad overlay, always on top of everything
    var toggle = document.createElement('div');
    toggle.id = 'pix-gamepad-toggle';
    toggle.textContent = '🎮';
    toggle.style.cssText =
        'position:fixed;bottom:12px;right:12px;z-index:2147483647;' +
        'width:44px;height:44px;border-radius:50%;' +
        'background:rgba(10,5,8,0.9);border:2px solid rgba(226,160,61,0.5);' +
        'display:flex;align-items:center;justify-content:center;' +
        'font-size:20px;cursor:pointer;' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
        'box-shadow:0 2px 12px rgba(0,0,0,0.6);' +
        'touch-action:none;-webkit-tap-highlight-color:transparent;' +
        'transition:transform 0.15s,border-color 0.15s,background 0.15s;';
    document.body.appendChild(toggle);

    // Gamepad overlay — controls area
    var pad = document.createElement('div');
    pad.id = 'pix-gamepad';
    pad.innerHTML =
    '<style>' +
        '#pix-gamepad{' +
            'position:fixed;bottom:0;left:0;right:0;height:200px;' +
            'z-index:2147483646;pointer-events:none;' +
            'font-family:"Courier New",monospace;' +
            'background:linear-gradient(to top,rgba(10,5,8,0.65) 0%,transparent 100%);' +
        '}' +
        '#pix-gamepad *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}' +

        '#pix-gamepad .gp-row{' +
            'display:flex;justify-content:space-between;align-items:flex-end;' +
            'padding:0 14px 16px;height:100%;pointer-events:none;' +
        '}' +
        '#pix-gamepad .gp-side{pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}' +

        '#pix-gamepad .gp-btn{' +
            'width:50px;height:50px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;' +
            'font-size:13px;font-weight:bold;letter-spacing:1px;touch-action:none;transition:all 0.06s;' +
        '}' +
        '#pix-gamepad .gp-btn.on{transform:scale(1.12);filter:brightness(1.5)}' +

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

        '#pix-gamepad .gp-shoulder{background:rgba(226,160,61,0.08);border:1.5px solid rgba(226,160,61,0.25);color:rgba(226,160,61,0.5);width:58px;height:26px;border-radius:6px;font-size:9px;letter-spacing:1px}' +
        '#pix-gamepad .gp-shoulder.on{background:rgba(226,160,61,0.35);border-color:#e2a03d;color:#fff;box-shadow:0 0 10px rgba(226,160,61,0.3)}' +

        '#pix-gamepad .gp-label{color:rgba(255,255,255,0.2);font-size:7px;letter-spacing:2px;margin-bottom:5px;text-transform:uppercase}' +
        '#pix-gamepad .gp-row-btns{display:flex;gap:8px;align-items:center}' +
        '#pix-gamepad .gp-row-sm{display:flex;gap:6px;margin-top:8px;align-items:center}' +
    '</style>' +
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

    var controls = document.getElementById('gp-controls');
    var visible = false;

    function showControls() {
        visible = true;
        controls.style.display = 'flex';
        toggle.textContent = '✕';
        toggle.style.borderColor = '#e2a03d';
        toggle.style.background = 'rgba(226,160,61,0.2)';
        if (!joystick) joystick = createJoystick(document.getElementById('gp-joystick'));
    }

    function hideControls() {
        visible = false;
        controls.style.display = 'none';
        toggle.textContent = '🎮';
        toggle.style.borderColor = 'rgba(226,160,61,0.5)';
        toggle.style.background = 'rgba(10,5,8,0.9)';
        releaseAll();
        if (joystick) joystick.releaseAll();
    }

    toggle.addEventListener('touchstart', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (visible) hideControls(); else showControls();
    }, { passive: false });

    toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (visible) hideControls(); else showControls();
    });

    pad.querySelectorAll('[data-key]').forEach(bindBtn);

    window.addEventListener('blur', releaseAll);
    window.addEventListener('pagehide', releaseAll);
    window.addEventListener('beforeunload', releaseAll);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();
