/**
 * ARCHITECTURE CONFIGURATION & STATE SYSTEM
 */
const COLS = 22, ROWS = 16, C = 30, OX = 18, OY = 18;
let grid = mk();
let startPos = { x: 2, y: 8, dir: 0 };
let goalPos = { x: 18, y: 8, dir: 0 };
let tool = 'obs', spd = 8;

let openMap = new Map(), closedSet = new Map(), pathCells = [], fullPath = [];
let vizSteps = [], vizIdx = 0, carPos = null, paused = false, animating = false;
let vizTimer = null, carTimer = null, trialN = 0, curViz = null;

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

// Canvas Aesthetics Mapping
const COL = {
    boardBg: '#ede9e0',
    gridLine: 'rgba(178,168,154,0.38)',
    border: '#b0a898',
    openCell: 'rgba(140,175,230,0.20)',  
    closedCell: 'rgba(80,120,195,0.42)',  
    pathFill: 'rgba(80,185,130,0.32)',    
    pathLine: 'rgba(40,160,100,0.70)',
    curNode: 'rgba(220,120,30,0.75)',    
    obsFill: '#c4bfb5',
    obsHatch: 'rgba(148,140,130,0.28)',
    obsStroke: '#ada8a0',
    goalFill: 'rgba(61,122,92,0.08)',
    goalStroke: '#3d7a5c',
    goalText: '#3d7a5c',
    carBody: '#4a5fa8',
    carRoof: '#3a4e8c',
    carGlass: 'rgba(255,255,255,0.20)',
    carLight: '#d4a84a',
    carTail: '#8c3a2e',
    carStroke: '#3a4e8c',
    carArrow: 'rgba(74,95,168,0.50)'
};

function mk() { return Array.from({ length: ROWS }, () => new Array(COLS).fill(0)); }

function init() {
    cv.width = COLS * C + OX * 2; 
    cv.height = ROWS * C + OY * 2;
    addDef(); 
    setupEventListeners();
    render();
}

function addDef() {
    for (let x = 5; x <= 14; x++) { grid[3][x] = 1; grid[11][x] = 1; }
    for (let y = 4; y <= 10; y++) { grid[y][16] = 1; }
    for (let x = 7; x <= 11; x++) { grid[7][x] = 1; }
}

function setTool(t) {
    tool = t;
    ['obs', 'era', 'car', 'goal'].forEach(k => {
        document.getElementById('t-' + k).classList.toggle('on', k === t);
    });
    const h = {
        obs: 'Klik untuk tambah obstacle', 
        era: 'Klik untuk hapus cell',
        car: 'Klik untuk pindah posisi mobil', 
        goal: 'Klik untuk pindah slot parkir'
    };
    document.getElementById('tool-hint').textContent = h[t];
}

/**
 * ALGORITHMIC ENGINE (A* PATHFINDING)
 */
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function kk(x, y, d) { return x + ',' + y + ',' + d; }

function heur(x, y, d) {
    return Math.abs(x - goalPos.x) + Math.abs(y - goalPos.y) + (d !== goalPos.dir ? 2 : 0);
}

function nbrs(x, y, d) {
    const o = [], [dx, dy] = DIRS[d];
    const fx = x + dx, fy = y + dy;
    if (fx >= 0 && fx < COLS && fy >= 0 && fy < ROWS && grid[fy][fx] === 0) o.push([fx, fy, d]);
    const bx = x - dx, by = y - dy;
    if (bx >= 0 && bx < COLS && by >= 0 && by < ROWS && grid[by][bx] === 0) o.push([bx, by, d]);
    o.push([x, y, (d + 3) % 4]);
    o.push([x, y, (d + 1) % 4]);
    return o;
}

function runAstar() {
    const steps = [], open = new Map(), closed = new Map(), gsc = new Map(), came = new Map();
    const sk = kk(startPos.x, startPos.y, startPos.dir);
    
    open.set(sk, { x: startPos.x, y: startPos.y, dir: startPos.dir, g: 0, f: heur(startPos.x, startPos.y, startPos.dir) });
    gsc.set(sk, 0);
    
    let iter = 0;
    while (open.size > 0 && iter < 8000) {
        iter++;
        let bk = null, bf = Infinity;
        for (const [k, nd] of open) if (nd.f < bf) { bf = nd.f; bk = k; }
        
        const cur = open.get(bk);
        open.delete(bk); 
        closed.set(bk, closed.size + 1);
        
        steps.push({ type: 'exp', cx: cur.x, cy: cur.y, open: new Map(open), closed: new Map(closed), nExp: closed.size, nOpen: open.size });
        
        if (cur.x === goalPos.x && cur.y === goalPos.y && cur.dir === goalPos.dir) {
            const path = []; 
            let ck = bk;
            while (ck) {
                const [px, py, pd] = ck.split(',').map(Number);
                path.unshift({ x: px, y: py, dir: pd });
                ck = came.get(ck);
            }
            steps.push({ type: 'found', path, open: new Map(open), closed: new Map(closed), nExp: closed.size });
            return { steps, found: true, path };
        }
        
        for (const [nx, ny, nd] of nbrs(cur.x, cur.y, cur.dir)) {
            const nk = kk(nx, ny, nd);
            if (closed.has(nk)) continue;
            const tg = (gsc.get(bk) ?? Infinity) + 1;
            if (tg < (gsc.get(nk) ?? Infinity)) {
                came.set(nk, bk); 
                gsc.set(nk, tg);
                open.set(nk, { x: nx, y: ny, dir: nd, g: tg, f: tg + heur(nx, ny, nd) });
            }
        }
    }
    steps.push({ type: 'fail', open: new Map(open), closed: new Map(closed), nExp: closed.size });
    return { steps, found: false, path: [] };
}

/**
 * ANIMATION CONTROL & PLAYBACK
 */
function startSolve() {
    if (animating) return;
    clearViz(); 
    trialN++;
    document.getElementById('h-trial').textContent = 'Percobaan: ' + trialN;
    document.getElementById('h-status').textContent = 'Mencari...';
    document.getElementById('h-status').className = 'chip active';
    
    const t0 = performance.now();
    const res = runAstar();
    const ms = (performance.now() - t0).toFixed(1);
    
    document.getElementById('s-time').textContent = ms + ' ms';
    vizSteps = res.steps; 
    vizIdx = 0; 
    fullPath = res.found ? res.path : [];
    
    if (res.found) document.getElementById('s-path').textContent = res.path.length;
    setDot('searching'); 
    setMsg('Visualisasi proses pencarian A*...');
    
    document.getElementById('btn-pause').disabled = false;
    document.getElementById('btn-step').disabled = false;
    runViz();
}

function runViz() {
    if (vizTimer) clearTimeout(vizTimer);
    if (vizIdx >= vizSteps.length) { onVizEnd(); return; }
    if (paused) return;
    applyStep(vizSteps[vizIdx]); 
    vizIdx++;
    vizTimer = setTimeout(runViz, Math.max(8, 250 / spd));
}

function applyStep(st) {
    curViz = st; 
    openMap = st.open; 
    closedSet = st.closed;
    document.getElementById('s-exp').textContent = st.nExp;
    document.getElementById('s-open').textContent = st.nOpen ?? 0;
    document.getElementById('prog').style.width = Math.round(vizIdx / vizSteps.length * 100) + '%';
    if (st.type === 'found') pathCells = st.path;
    render();
}

function stepOnce() {
    if (vizIdx >= vizSteps.length) { onVizEnd(); return; }
    applyStep(vizSteps[vizIdx]); 
    vizIdx++;
}

function onVizEnd() {
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-step').disabled = true;
    document.getElementById('prog').style.width = '100%';
    if (fullPath.length > 0) {
        setDot('animating'); 
        setMsg('Mobil lagi jalan ke slot parkir...');
        animateCar();
    } else {
        setDot('fail'); 
        setMsg('Jalur nggak ketemu — coba kurangi obstacle');
        document.getElementById('h-status').textContent = 'Gagal';
        document.getElementById('h-status').className = 'chip fail';
    }
}

function togglePause() {
    paused = !paused;
    document.getElementById('picon').innerHTML = paused
        ? '<path d="M3 2.5l10 5.5-10 5.5V2.5z"/>'
        : '<path d="M4 2h3v12H4V2zm5 0h3v12H9V2z"/>';
    document.getElementById('plabel').textContent = paused ? 'Lanjut' : 'Pause';
    if (!paused) runViz();
}

let carIdx = 0;
function animateCar() { 
    animating = true; 
    carIdx = 0; 
    carPos = { ...fullPath[0] }; 
    doCarFrame(); 
}

function doCarFrame() {
    if (carIdx >= fullPath.length) {
        animating = false; 
        carPos = { ...goalPos };
        setDot('done'); 
        setMsg('Berhasil parkir.');
        document.getElementById('h-status').textContent = 'Selesai';
        document.getElementById('h-status').className = 'chip done';
        render(); 
        return;
    }
    carPos = { ...fullPath[carIdx] };
    document.getElementById('s-step').textContent = (carIdx + 1) + '/' + fullPath.length;
    document.getElementById('prog').style.width = Math.round(carIdx / fullPath.length * 100) + '%';
    document.getElementById('prog').style.background = 'var(--green)';
    render(); 
    carIdx++;
    carTimer = setTimeout(doCarFrame, Math.max(30, 500 / spd));
}

function clearViz() {
    if (vizTimer) clearTimeout(vizTimer);
    if (carTimer) clearTimeout(carTimer);
    openMap = new Map(); closedSet = new Map(); pathCells = []; fullPath = [];
    vizSteps = []; vizIdx = 0; carPos = null; animating = false; paused = false; curViz = null;
    document.getElementById('s-exp').textContent = '0';
    document.getElementById('s-open').textContent = '0';
    document.getElementById('s-path').textContent = '—';
    document.getElementById('s-step').textContent = '—';
    document.getElementById('prog').style.width = '0%';
    document.getElementById('prog').style.background = 'var(--blue)';
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-step').disabled = true;
}

function resetAll() {
    clearViz(); 
    grid = mk(); 
    startPos = { x: 2, y: 8, dir: 0 }; 
    goalPos = { x: 18, y: 8, dir: 0 };
    addDef(); 
    trialN = 0;
    document.getElementById('h-trial').textContent = 'Percobaan: 0';
    document.getElementById('h-status').textContent = 'Standby';
    document.getElementById('h-status').className = 'chip';
    document.getElementById('s-time').textContent = '—';
    setDot('idle'); 
    setMsg('Atur obstacle dulu, lalu tekan Space.');
    render();
}

/**
 * CANVAS GRAPHICS GRAPHICS RENDERING SYSTEM
 */
function render() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = COL.boardBg;
    ctx.fillRect(OX, OY, COLS * C, ROWS * C);

    for (const [k] of closedSet) {
        const [cx, cy] = k.split(',').map(Number);
        ctx.fillStyle = COL.closedCell;
        ctx.fillRect(OX + cx * C, OY + cy * C, C, C);
    }

    ctx.font = 'bold 7px DM Mono,monospace';
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    for (const [k] of openMap) {
        const [cx, cy] = k.split(',').map(Number);
        const px = OX + cx * C, py = OY + cy * C;
        ctx.fillStyle = COL.openCell;
        ctx.fillRect(px, py, C, C);
        ctx.fillStyle = 'rgba(30,60,140,0.85)';
        ctx.fillText(`${cx},${cy}`, px + C / 2, py + C / 2);
    }

    if (pathCells.length > 1) {
        for (const p of pathCells) {
            ctx.fillStyle = COL.pathFill;
            ctx.fillRect(OX + p.x * C + 1, OY + p.y * C + 1, C - 2, C - 2);
        }
        ctx.beginPath();
        ctx.strokeStyle = COL.pathLine;
        ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.moveTo(OX + pathCells[0].x * C + C / 2, OY + pathCells[0].y * C + C / 2);
        for (let i = 1; i < pathCells.length; i++)
            ctx.lineTo(OX + pathCells[i].x * C + C / 2, OY + pathCells[i].y * C + C / 2);
        ctx.stroke();
    }

    ctx.strokeStyle = COL.gridLine; ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(OX, OY + r * C); ctx.lineTo(OX + COLS * C, OY + r * C); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(OX + c * C, OY); ctx.lineTo(OX + c * C, OY + ROWS * C); ctx.stroke(); }
    ctx.strokeStyle = COL.border; ctx.lineWidth = 1;
    ctx.strokeRect(OX, OY, COLS * C, ROWS * C);

    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) drawObs(OX + c * C, OY + r * C);

    if (curViz && curViz.type === 'exp') {
        ctx.strokeStyle = COL.curNode; ctx.lineWidth = 2;
        ctx.strokeRect(OX + curViz.cx * C + 1, OY + curViz.cy * C + 1, C - 2, C - 2);
    }

    drawGoal(OX + goalPos.x * C, OY + goalPos.y * C, goalPos.dir);
    const cp = carPos ?? startPos;
    drawCar(OX + cp.x * C, OY + cp.y * C, cp.dir);
}

function drawObs(px, py) {
    ctx.fillStyle = COL.obsFill;
    ctx.fillRect(px + 1, py + 1, C - 2, C - 2);
    ctx.strokeStyle = COL.obsHatch; ctx.lineWidth = 0.5;
    for (let i = 4; i < C; i += 8) {
        ctx.beginPath(); ctx.moveTo(px + 1, py + i); ctx.lineTo(px + i, py + 1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px + C - 1, py + i); ctx.lineTo(px + i, py + C - 1); ctx.stroke();
    }
    ctx.strokeStyle = COL.obsStroke; ctx.lineWidth = 0.5;
    ctx.strokeRect(px + 1, py + 1, C - 2, C - 2);
}

function drawGoal(px, py, dir) {
    ctx.fillStyle = COL.goalFill;
    ctx.fillRect(px + 1, py + 1, C - 2, C - 2);
    ctx.strokeStyle = COL.goalStroke; ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(px + 3, py + 3, C - 6, C - 6);
    ctx.setLineDash([]);
    ctx.fillStyle = COL.goalText;
    ctx.font = 'bold 11px Outfit,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('P', px + C / 2, py + C / 2);
    arrow(px + C / 2, py + C / 2, dir, COL.goalStroke, 4, 10);
}

function drawCar(px, py, dir) {
    const cx = px + C / 2, cy = py + C / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(dir * Math.PI / 2);
    const w = C - 8, h = C - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(-w/2 + 1, -h/2 + 2, w, h);
    ctx.fillStyle = COL.carBody; rr(ctx, -w / 2, -h / 2, w, h, 3); ctx.fill();
    ctx.fillStyle = COL.carRoof; ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h / 2 - 2);
    ctx.fillStyle = COL.carGlass; ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, 4);
    ctx.fillStyle = COL.carLight;
    ctx.fillRect(-w / 2 + 2, h / 2 - 4, 4, 3); ctx.fillRect(w / 2 - 6, h / 2 - 4, 4, 3);
    ctx.fillStyle = COL.carTail;
    ctx.fillRect(-w / 2 + 2, -h / 2 + 1, 3, 2); ctx.fillRect(w / 2 - 5, -h / 2 + 1, 3, 2);
    ctx.strokeStyle = COL.carStroke; ctx.lineWidth = 1;
    rr(ctx, -w / 2, -h / 2, w, h, 3); ctx.stroke();
    ctx.restore();
    arrow(cx, cy, dir, COL.carArrow, 4, C / 2 + 4);
}

function arrow(cx, cy, dir, color, sz, dist) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(dir * Math.PI / 2);
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(0, dist); ctx.lineTo(-sz, dist - sz * 1.5); ctx.lineTo(sz, dist - sz * 1.5);
    ctx.closePath(); ctx.fill(); ctx.restore();
}

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function cellAt(e) {
    const r = cv.getBoundingClientRect();
    return { x: Math.floor((e.clientX - r.left - OX) / C), y: Math.floor((e.clientY - r.top - OY) / C) };
}

function inB(x, y) { return x >= 0 && x < COLS && y >= 0 && y < ROWS; }

function act({ x, y }) {
    if (!inB(x, y)) return;
    const ig = x === goalPos.x && y === goalPos.y, is = x === startPos.x && y === startPos.y;
    if (tool === 'car') { if (!ig && grid[y][x] === 0) { startPos = { x, y, dir: startPos.dir }; clearViz(); render(); } }
    else if (tool === 'goal') { if (!is && grid[y][x] === 0) { goalPos = { x, y, dir: goalPos.dir }; clearViz(); render(); } }
    else if (tool === 'obs') { if (!ig && !is) { grid[y][x] = 1; clearViz(); render(); } }
    else if (tool === 'era') { grid[y][x] = 0; clearViz(); render(); }
}

function setupEventListeners() {
    let mdown = false;
    
    cv.addEventListener('mousedown', e => { mdown = true; act(cellAt(e)); });
    cv.addEventListener('mousemove', e => {
        const { x, y } = cellAt(e);
        document.getElementById('cpos').textContent = inB(x, y) ? `(${x}, ${y})` : '—';
        if (!mdown) return;
        if (tool === 'obs' || tool === 'era') act({ x, y });
    });
    cv.addEventListener('mouseup', () => { mdown = false; });
    cv.addEventListener('mouseleave', () => { mdown = false; document.getElementById('cpos').textContent = '—'; });
    cv.addEventListener('contextmenu', e => e.preventDefault());

    document.getElementById('btn-run').addEventListener('click', () => { if (!animating) startSolve(); });
    document.getElementById('btn-step').addEventListener('click', stepOnce);
    document.getElementById('btn-pause').addEventListener('click', togglePause);
    document.getElementById('btn-reset').addEventListener('click', resetAll);
    
    ['obs', 'era', 'car', 'goal'].forEach(k => {
        document.getElementById('t-' + k).addEventListener('click', () => setTool(k));
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', e => {
        if (e.code === 'Space') { e.preventDefault(); if (!animating) startSolve(); }
        else if (e.code === 'KeyR') resetAll();
        else if (e.code === 'KeyP' && !document.getElementById('btn-pause').disabled) togglePause();
        else if (e.code === 'KeyS' && !document.getElementById('btn-step').disabled) stepOnce();
        else if (e.code === 'Digit1') setTool('obs');
        else if (e.code === 'Digit2') setTool('era');
        else if (e.code === 'Digit3') setTool('car');
        else if (e.code === 'Digit4') setTool('goal');
        else if (e.code === 'ArrowRight') { startPos.dir = 0; clearViz(); render(); }
        else if (e.code === 'ArrowDown') { startPos.dir = 1; clearViz(); render(); }
        else if (e.code === 'ArrowLeft') { startPos.dir = 2; clearViz(); render(); }
        else if (e.code === 'ArrowUp') { startPos.dir = 3; clearViz(); render(); }
    });
}

function setDot(s) { document.getElementById('dot').className = 'dot ' + s; }
function setMsg(m) { document.getElementById('smsg').textContent = m; }

init();