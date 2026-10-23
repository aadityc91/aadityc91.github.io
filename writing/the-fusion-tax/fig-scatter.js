// Figure 2: every query of a corpus, BM25 nDCG@10 across and dense nDCG@10 up,
// colored by what fusion did to it. Queries one retriever missed entirely sit
// in strips along the left and bottom edges. Per-query data is loaded on demand
// from data/q-<corpus>.json; the hurt/helped codes were computed at full
// precision when the data was extracted.

PostKit.mount('fig-scatter', function (card) {
    const { h, segmented, onLayout } = PostKit;
    const CORPORA = window.FusionTaxData.corpora;

    // Index into each query's four-character code: interp vs dense, interp vs
    // oracle, RRF vs dense, RRF vs oracle.
    const CODE = { interp: { dense: 0, oracle: 1 }, rrf: { dense: 2, oracle: 3 } };
    const REF_TEXT = { dense: 'dense-only', oracle: 'the better of BM25 and dense' };
    const METHOD_TEXT = { interp: 'Weighted fusion', rrf: 'RRF' };

    const state = { corpus: 'scifact', method: 'interp', ref: 'dense', hover: -1 };
    const cache = {};
    let data = null;

    // ---- Controls ----
    const corpus = segmented('Corpus', CORPORA.map(c => ({ value: c.id, label: c.label })), state.corpus,
        v => { state.corpus = v; load(); });
    const method = segmented('Fusion method', [
        { value: 'interp', label: 'Weighted 0.7' },
        { value: 'rrf', label: 'RRF' },
    ], state.method, v => { state.method = v; draw(); });
    const ref = segmented('Compare against', [
        { value: 'dense', label: 'Dense-only' },
        { value: 'oracle', label: 'Better of the two' },
    ], state.ref, v => { state.ref = v; draw(); });

    const canvas = h('canvas', { class: 'sc-canvas', role: 'img' });
    const tip = h('div', { class: 'sc-tip', 'aria-hidden': 'true' });
    const plot = h('div', { class: 'sc-plot' }, canvas, tip);
    const side = h('div', { class: 'sc-side' });
    const verdict = h('div', { class: 'verdict', 'aria-live': 'polite' });

    card.appendChild(h('div', {},
        h('div', { class: 'controls sc-corpus' }, corpus.el),
        h('div', { class: 'controls' },
            h('span', {}, h('span', { class: 'control-label' }, 'Fusion'), method.el),
            h('span', {}, h('span', { class: 'control-label' }, 'Compare against'), ref.el)),
        h('div', { class: 'sc-wrap' }, plot, side),
        verdict));

    // ---- Geometry ----
    const PAD = { left: 44, right: 10, top: 10, bottom: 40 };
    const STRIP = 26; // width of the "found nothing" strips
    const GAP = 8;
    let W = 0, H = 0, pts = [];

    // Deterministic jitter so dots don't move when the method changes.
    function rand(i, salt) {
        let x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    function layout() {
        const width = Math.max(260, plot.clientWidth);
        const height = Math.round(Math.min(420, Math.max(280, width * 0.78)));
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        W = width; H = height;
    }

    // Plot coordinates: x0/x1 is the main area for BM25 in (0, 1]; the strip
    // left of it holds BM25 = 0. Same for y with dense.
    function geo() {
        const x0 = PAD.left + STRIP + GAP, x1 = W - PAD.right;
        const y1 = PAD.top, y0 = H - PAD.bottom - STRIP - GAP;
        return { x0, x1, y0, y1, sx: PAD.left, sy: H - PAD.bottom };
    }

    function position(i) {
        const g = geo();
        const b = data.bm25[i] / 1000, d = data.dense[i] / 1000;
        const jx = (rand(i, 1) - 0.5), jy = (rand(i, 2) - 0.5);
        const x = b === 0 ? g.sx + 3 + rand(i, 3) * (STRIP - 6) : g.x0 + b * (g.x1 - g.x0) + jx * 7;
        const y = d === 0 ? g.sy - 3 - rand(i, 4) * (STRIP - 6) : g.y0 - d * (g.y0 - g.y1) + jy * 7;
        return [x, y];
    }

    function colors() {
        const cs = getComputedStyle(card);
        const v = name => cs.getPropertyValue(name).trim();
        return { hurt: v('--c-hurt'), help: v('--c-help'), same: v('--c-same'), ink: v('--ink-3'),
            grid: v('--fig-grid'), sunken: v('--fig-sunken'), text: v('--ink-2') };
    }

    function classOf(i) {
        const c = data.cls[i][CODE[state.method][state.ref]];
        return c === 'h' ? 'hurt' : c === 'p' ? 'help' : 'same';
    }

    // ---- Drawing ----
    function draw() {
        if (!data) return;
        const ctx = canvas.getContext('2d');
        const c = colors();
        const g = geo();
        ctx.clearRect(0, 0, W, H);

        // Strips and main area backgrounds.
        ctx.fillStyle = c.sunken;
        ctx.fillRect(g.sx, g.y1, STRIP, g.sy - g.y1);
        ctx.fillRect(g.sx, g.sy - STRIP, g.x1 - g.sx, STRIP);

        // Grid and diagonal.
        ctx.strokeStyle = c.grid;
        ctx.lineWidth = 1;
        ctx.font = '11px ui-monospace, "JetBrains Mono", monospace';
        ctx.fillStyle = c.ink;
        [0.25, 0.5, 0.75, 1].forEach(t => {
            const x = g.x0 + t * (g.x1 - g.x0), y = g.y0 - t * (g.y0 - g.y1);
            ctx.beginPath(); ctx.moveTo(x, g.y1); ctx.lineTo(x, g.y0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillText(t.toFixed(2).replace(/0$/, ''), x, H - PAD.bottom + 14);
            ctx.textAlign = 'right'; ctx.fillText(t.toFixed(2).replace(/0$/, ''), PAD.left - 6, y + 4);
        });
        ctx.textAlign = 'center';
        ctx.fillText('0', g.sx + STRIP / 2, H - PAD.bottom + 14);
        ctx.textAlign = 'right';
        ctx.fillText('0', PAD.left - 6, g.sy - STRIP / 2 + 4);
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x1, g.y1); ctx.stroke();
        ctx.setLineDash([]);

        // Axis titles.
        ctx.fillStyle = c.text;
        ctx.textAlign = 'center';
        ctx.fillText('BM25 nDCG@10 →', (g.x0 + g.x1) / 2, H - 6);
        ctx.save();
        ctx.translate(11, (g.y0 + g.y1) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('dense nDCG@10 →', 0, 0);
        ctx.restore();

        // Points: unchanged first, so hurt and helped stay on top.
        const n = data.cls.length;
        const r = n > 3000 ? 1.6 : n > 800 ? 2.2 : 3;
        pts = new Array(n);
        const order = { same: [], help: [], hurt: [] };
        for (let i = 0; i < n; i++) {
            pts[i] = position(i);
            order[classOf(i)].push(i);
        }
        ['same', 'help', 'hurt'].forEach(k => {
            ctx.fillStyle = c[k];
            ctx.globalAlpha = k === 'same' ? (n > 3000 ? 0.45 : 0.7) : (n > 3000 ? 0.8 : 0.9);
            ctx.beginPath();
            order[k].forEach(i => {
                const [x, y] = pts[i];
                ctx.moveTo(x + r, y);
                ctx.arc(x, y, r, 0, Math.PI * 2);
            });
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Strip labels, drawn over the dots.
        ctx.fillStyle = c.text;
        ctx.font = '10.5px ui-monospace, "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('dense found nothing', g.x0 + 4, g.sy - STRIP + 11);
        ctx.save();
        ctx.translate(g.sx + 11, g.y1 + 4);
        ctx.rotate(Math.PI / 2);
        ctx.fillText('BM25 found nothing', 0, 0);
        ctx.restore();

        if (state.hover >= 0) {
            const [x, y] = pts[state.hover];
            ctx.strokeStyle = c.text;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke();
        }

        canvas.setAttribute('aria-label', summaryText(stats()));
        renderSide(stats());
    }

    function stats() {
        const n = data.cls.length;
        const s = { n, hurt: 0, help: 0, same: 0, offHurt: 0, off: 0, bothHurt: 0, both: 0 };
        for (let i = 0; i < n; i++) {
            const k = classOf(i);
            s[k]++;
            const b = data.bm25[i] > 0, d = data.dense[i] > 0;
            if (b !== d) { s.off++; if (k === 'hurt') s.offHurt++; }
            if (b && d) { s.both++; if (k === 'hurt') s.bothHurt++; }
        }
        return s;
    }

    const pct = (a, b) => (b ? (100 * a / b) : 0).toFixed(1) + '%';

    function summaryText(s) {
        const c = CORPORA.find(x => x.id === state.corpus);
        return `${c.label}, ${s.n} queries: ${METHOD_TEXT[state.method]} scored ${pct(s.hurt, s.n)} of queries below ${REF_TEXT[state.ref]} and ${pct(s.help, s.n)} above it.`;
    }

    function renderSide(s) {
        side.textContent = '';
        const item = (key, label, count) => h('div', { class: 'sc-stat' },
            h('span', { class: 'sc-dot', style: { background: `var(--c-${key})` } }),
            h('span', { class: 'sc-stat-label' }, label),
            h('span', { class: 'sc-stat-value' }, pct(count, s.n)));
        side.append(
            h('div', { class: 'stat-label' }, `${s.n.toLocaleString('en-US')} queries`),
            item('hurt', 'hurt', s.hurt),
            item('help', state.ref === 'oracle' ? 'beat both' : 'helped', s.help),
            item('same', 'unchanged', s.same),
            h('div', { class: 'sc-split' },
                h('div', {}, h('b', {}, s.off ? pct(s.offHurt, s.off) : '–'), ' hurt where only one retriever found something', h('span', { class: 'sc-n' }, ` (${s.off} queries)`)),
                h('div', {}, h('b', {}, s.both ? pct(s.bothHurt, s.both) : '–'), ' hurt where both did', h('span', { class: 'sc-n' }, ` (${s.both} queries)`))));
        verdict.textContent = '';
        const share = s.hurt ? Math.round(100 * s.bothHurt / s.hurt) : 0;
        const offRate = s.off ? s.offHurt / s.off : 0, bothRate = s.both ? s.bothHurt / s.both : 0;
        let more;
        if (!s.off) more = 'Every query here was found by both retrievers, so each hurt query is fusion reordering two lists that both had something right.';
        else if (offRate > bothRate) more = `The hurt rate is highest where only one retriever found something, but ${share}% of the hurt queries are ones both retrievers found.`;
        else more = `Here the hurt rate is as high where both retrievers found something, and those queries make up ${share}% of the hurt ones.`;
        verdict.append(h('span', { class: 'verdict-icon' }, '→'), h('span', {}, `${summaryText(s)} ${more}`));
    }

    // ---- Hover ----
    function nearest(mx, my) {
        let best = -1, bd = 64; // within 8px
        for (let i = 0; i < pts.length; i++) {
            const dx = pts[i][0] - mx, dy = pts[i][1] - my;
            const d2 = dx * dx + dy * dy;
            if (d2 < bd) { bd = d2; best = i; }
        }
        return best;
    }

    canvas.addEventListener('mousemove', e => {
        if (!data) return;
        const box = canvas.getBoundingClientRect();
        const i = nearest(e.clientX - box.left, e.clientY - box.top);
        if (i === state.hover) return;
        state.hover = i;
        draw();
        if (i < 0) { tip.style.opacity = '0'; return; }
        const k = classOf(i);
        const f = data[state.method][i] / 1000;
        const refVal = state.ref === 'dense' ? data.dense[i] / 1000 : Math.max(data.bm25[i], data.dense[i]) / 1000;
        tip.textContent = '';
        tip.append(
            h('div', { class: 'sc-tip-q' }, data.q[i]),
            h('div', {}, `BM25 ${(data.bm25[i] / 1000).toFixed(2)} · dense ${(data.dense[i] / 1000).toFixed(2)} · fused ${f.toFixed(2)}`),
            h('div', { class: 'sc-tip-k' }, k === 'same' ? 'unchanged' : `${k === 'hurt' ? 'hurt' : 'helped'} by ${Math.abs(f - refVal).toFixed(2)}`));
        const [x, y] = pts[i];
        tip.style.left = Math.min(Math.max(x, 120), W - 120) + 'px';
        tip.style.top = (y < 110 ? y + 16 : y - 12) + 'px';
        tip.classList.toggle('is-below', y < 110);
        tip.style.opacity = '1';
    });
    canvas.addEventListener('mouseleave', () => {
        state.hover = -1;
        tip.style.opacity = '0';
        draw();
    });

    // ---- Data ----
    function load() {
        const id = state.corpus;
        state.hover = -1;
        tip.style.opacity = '0';
        if (cache[id]) { data = cache[id]; draw(); return; }
        side.textContent = 'Loading…';
        fetch(`data/q-${id}.json`).then(r => r.json()).then(d => {
            cache[id] = d;
            if (state.corpus === id) { data = d; draw(); }
        }).catch(() => { side.textContent = 'Could not load the per-query data.'; });
    }

    onLayout(plot, () => { layout(); draw(); });
    document.addEventListener('themechange', () => requestAnimationFrame(draw));
    layout();
    load();
});
