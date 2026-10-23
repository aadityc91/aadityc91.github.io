// Figure 6: the paper's decision framework as a calculator. From a labeled
// sample's BM25 and dense nDCG@10, the spread of their per-query differences
// and the sample size, place the dense-minus-BM25 gap (with an approximate 95%
// interval, 1.96 s / sqrt(n)) against the regimes the paper observed and give a
// starting fusion policy. Thresholds come from the seven corpora in the paper.

PostKit.mount('fig-decide', function (card) {
    const { h, segmented, onLayout } = PostKit;
    const CORPORA = window.FusionTaxData.corpora;

    const BALANCED = 0.015; // the balanced corpora sat at about 0.01
    const CLEAR = 0.04;     // the dense-led corpora led by 0.039-0.18
    const AXIS = [-0.06, 0.2];
    const TARGET_HW = 0.02;

    const state = { bm25: 0.6647, dense: 0.72, s: 0.297, n: 300, reranker: 'none', priority: 'average', preset: 'scifact' };

    // ---- Inputs ----
    function numberInput(label, key, min, max, step) {
        const input = h('input', {
            type: 'number', min: String(min), max: String(max), step: String(step), value: String(state[key]),
            'aria-label': label, class: 'dc-num',
            oninput: e => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) { state[key] = Math.min(max, Math.max(min, v)); state.preset = null; render(); }
            },
        });
        return { input, el: h('label', { class: 'dc-field' }, h('span', { class: 'control-label' }, label), input) };
    }
    const fields = {
        bm25: numberInput('BM25 nDCG@10', 'bm25', 0, 1, 0.001),
        dense: numberInput('Dense nDCG@10', 'dense', 0, 1, 0.001),
        s: numberInput('Per-query SD', 's', 0.01, 1, 0.01),
    };
    const nOut = h('output', {});
    const nInput = h('input', {
        type: 'range', min: '25', max: '2000', step: '25', value: String(state.n), 'aria-label': 'Labeled queries',
        oninput: e => { state.n = Number(e.target.value); state.preset = null; render(); },
    });
    const reranker = segmented('Reranker', [
        { value: 'none', label: 'No reranker' },
        { value: 'reliable', label: 'Reliable reranker' },
    ], state.reranker, v => { state.reranker = v; render(); });
    const priority = segmented('What matters more', [
        { value: 'average', label: 'Average quality' },
        { value: 'worst', label: 'Worst case' },
    ], state.priority, v => { state.priority = v; render(); });

    const presetButtons = CORPORA.map(c => h('button', {
        type: 'button', class: 'chip', 'data-id': c.id,
        onclick: () => {
            Object.assign(state, { bm25: c.bm25, dense: c.dense, s: c.sd_paired_diff, n: Math.min(2000, c.n), preset: c.id });
            fields.bm25.input.value = String(c.bm25);
            fields.dense.input.value = String(c.dense);
            fields.s.input.value = String(c.sd_paired_diff);
            nInput.value = String(state.n);
            render();
        },
    }, c.label));

    const line = h('svg', { viewBox: '0 0 640 92', class: 'dc-line', role: 'img' });
    const rec = h('div', { class: 'dc-rec', 'aria-live': 'polite' });

    card.appendChild(h('div', {},
        h('div', { class: 'dc-presets', role: 'group', 'aria-label': 'Start from a corpus in the paper' },
            h('span', { class: 'control-label' }, 'Start from'), presetButtons),
        h('div', { class: 'dc-inputs' },
            fields.bm25.el, fields.dense.el, fields.s.el,
            h('label', { class: 'dc-field' }, h('span', { class: 'control-label' }, 'Labeled queries'), nInput, nOut)),
        h('div', { class: 'controls' },
            h('span', {}, h('span', { class: 'control-label' }, 'Downstream'), reranker.el),
            h('span', {}, h('span', { class: 'control-label' }, 'Optimize for'), priority.el)),
        line,
        rec));

    // ---- Logic ----
    const zoneOf = x => (x >= CLEAR ? 'dense' : x > BALANCED ? 'between' : x >= -BALANCED ? 'balanced' : 'bm25');
    const ZONE_ORDER = ['bm25', 'balanced', 'between', 'dense'];
    const ZONE_TEXT = { bm25: 'BM25 leads', balanced: 'balanced', between: 'in between', dense: 'dense leads clearly' };
    const ZONE_SHORT = { bm25: 'BM25 ahead', balanced: 'even', between: 'between', dense: 'dense clearly ahead' };
    const fmt = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3);

    function drawLine(gap, lo, hi) {
        line.textContent = '';
        // Lay out at the real pixel width so labels keep their size on phones.
        const w = Math.max(280, Math.round(line.getBoundingClientRect().width) || 640);
        const narrow = w < 520; // stagger labels onto extra rows
        line.setAttribute('viewBox', `0 0 ${w} ${narrow ? 112 : 92}`);
        const L = 16, R = w - 16, Y = narrow ? 56 : 46;
        const X = v => L + ((Math.min(AXIS[1], Math.max(AXIS[0], v)) - AXIS[0]) / (AXIS[1] - AXIS[0])) * (R - L);
        const zones = [
            ['bm25', AXIS[0], -BALANCED], ['balanced', -BALANCED, BALANCED],
            ['between', BALANCED, CLEAR], ['dense', CLEAR, AXIS[1]],
        ];
        zones.forEach(([z, a, b], i) => {
            line.appendChild(h('rect', { x: X(a), y: Y - 14, width: X(b) - X(a), height: 28, class: `dc-zone dc-zone-${z}` }));
            const ly = narrow && i % 2 ? Y - 32 : Y - 20;
            line.appendChild(h('text', { x: Math.max(L + 20, (X(a) + X(b)) / 2), y: ly, class: 'dc-zlabel', 'text-anchor': 'middle' }, ZONE_SHORT[z]));
        });
        // The paper's corpora, for orientation; neighbors alternate rows so labels don't collide.
        [...CORPORA].sort((a, b) => (a.dense - a.bm25) - (b.dense - b.bm25)).forEach((c, i) => {
            const x = X(c.dense - c.bm25);
            line.appendChild(h('line', { x1: x, x2: x, y1: Y + 14, y2: Y + 20, class: 'dc-ctick' }));
            line.appendChild(h('text', { x, y: Y + 30 + (i % (narrow ? 3 : 2)) * 10, class: 'dc-clabel', 'text-anchor': 'middle' }, c.label));
        });
        line.appendChild(h('line', { x1: X(lo), x2: X(hi), y1: Y, y2: Y, class: 'dc-ci' }));
        [lo, hi].forEach(v => line.appendChild(h('line', { x1: X(v), x2: X(v), y1: Y - 6, y2: Y + 6, class: 'dc-ci' })));
        line.appendChild(h('circle', { cx: X(gap), cy: Y, r: 6, class: 'dc-gap' }));
        line.setAttribute('aria-label', `Dense minus BM25 nDCG@10: ${fmt(gap)}, 95% interval ${fmt(lo)} to ${fmt(hi)}.`);
    }

    function render() {
        presetButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === state.preset)));
        nOut.textContent = String(state.n);
        const gap = state.dense - state.bm25;
        const hw = 1.96 * state.s / Math.sqrt(state.n);
        const lo = gap - hw, hi = gap + hw;
        drawLine(gap, lo, hi);

        const zone = zoneOf(gap);
        const zi = [zoneOf(lo), zoneOf(hi)].map(z => ZONE_ORDER.indexOf(z));
        const spanned = ZONE_ORDER.slice(Math.min(...zi), Math.max(...zi) + 1);
        const need = Math.ceil(Math.pow(1.96 * state.s / TARGET_HW, 2));

        const POLICY = {
            dense: ['Dense-weighted interpolation, α ≈ 0.6–0.7',
                `Dense leads by ${gap.toFixed(3)}. In the paper, every corpus with a lead this size did best with a dense-heavy score blend, and RRF trailed dense-only there. Set the final weight by cross-validation on your labeled queries.`],
            balanced: ['RRF or CombMNZ, or interpolation near α = 0.5',
                `The two retrievers are about even (${fmt(gap)}). On the paper's two balanced corpora, rank fusion matched or beat score blending; on TREC-COVID it helped 70–74% of queries against dense-only.`],
            between: ['Compare RRF with interpolation at 0.5–0.7',
                `Dense leads by ${gap.toFixed(3)}, between the balanced corpora (about 0.01) and the clearly dense-led ones (0.04 or more). None of the paper's corpora sat here, so test both on held-out queries.`],
            bm25: ['Lean the blend toward BM25, and measure',
                `BM25 leads by ${(-gap).toFixed(3)}. None of the paper's seven corpora had BM25 ahead, so this is outside what we measured. By the same logic, start with a BM25-heavy weight and check it on held-out queries.`],
        };
        const [title, why] = POLICY[zone];

        rec.textContent = '';
        rec.append(
            h('div', { class: 'stat-label' }, 'Starting policy'),
            h('div', { class: 'dc-title' }, title),
            h('p', {}, why),
            h('p', {}, spanned.length > 1
                ? `Your 95% interval, ${fmt(lo)} to ${fmt(hi)}, spans ${spanned.map(z => ZONE_TEXT[z]).join(' and ')}, so the sample can't settle the choice yet. At this spread, about ${need.toLocaleString('en-US')} labeled queries would narrow it to ±${TARGET_HW}.`
                : `Your 95% interval, ${fmt(lo)} to ${fmt(hi)}, sits inside this zone.`));

        const notes = [];
        if (state.priority === 'worst') {
            notes.push('You care about the worst case, so keep dense-only as a candidate. In the paper, weighted fusion beat it on average by only 0.008–0.051 nDCG@10 while 8–21% of queries lost 0.04–0.21. Measure the share of held-out queries that fusion puts below dense-only, and ship dense-only if that share is more than you can accept.');
        }
        if (state.reranker === 'reliable') {
            notes.push(zone === 'balanced'
                ? 'With a reliable reranker, the second retriever added little in the paper, with one exception that looks like your corpus: on the balanced TREC-COVID, fused candidates still beat dense candidates by 0.018 (interpolation) and 0.044 (RRF) after reranking.'
                : 'With a reliable reranker over the top 30, fused and dense candidates finished within 0.011 nDCG@10 of each other in the paper. Validate the reranker on this corpus first; the second retriever is optional.');
        } else {
            notes.push('Without a reranker, fusion is the cheap lever: a BM25 query cost 1.1–4.3 ms in the paper, against about 1.6 s for a cross-encoder over 30 candidates.');
        }
        rec.appendChild(h('ul', { class: 'dc-notes' }, notes.map(t => h('li', {}, t))));
    }

    render();
    onLayout(line, render);
});
