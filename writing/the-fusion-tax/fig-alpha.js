// Figure 4: sweep the dense weight alpha of min-max score interpolation from 0
// (BM25 only) to 1 (dense only). Left: mean nDCG@10. Right: share of queries
// scored below dense-only. Dashed lines mark RRF. Values were computed on the
// paper's stored BGE-small runs on a 0.1 grid.

PostKit.mount('fig-alpha', function (card) {
    const { h, segmented } = PostKit;
    const CORPORA = window.FusionTaxData.corpora;

    const state = { corpus: 'trec-covid', alpha: 0.7, hover: null };

    const corpus = segmented('Corpus', CORPORA.map(c => ({ value: c.id, label: c.label })), state.corpus,
        v => { state.corpus = v; render(); });
    const alphaOut = h('output', {});
    const alpha = h('input', {
        type: 'range', min: '0', max: '1', step: '0.1', value: String(state.alpha), 'aria-label': 'Dense weight alpha',
        oninput: e => { state.alpha = Number(e.target.value); render(); },
    });

    const V = { w: 320, h: 210, l: 44, r: 58, t: 14, b: 40 };
    const charts = {
        ndcg: makeChart('Mean nDCG@10', 'var(--c-interp)'),
        hurt: makeChart('Queries below dense-only', 'var(--c-hurt)'),
    };
    const stats = h('div', { class: 'al-stats', 'aria-live': 'polite' });
    const verdict = h('div', { class: 'verdict' });

    card.appendChild(h('div', {},
        h('div', { class: 'controls sc-corpus' }, corpus.el),
        h('div', { class: 'controls' },
            h('label', { class: 'al-slider' }, h('span', { class: 'control-label' }, 'Dense weight α'), alpha, alphaOut)),
        h('div', { class: 'al-charts' }, charts.ndcg.el, charts.hurt.el),
        stats,
        verdict));

    function makeChart(title, color) {
        const svg = h('svg', { viewBox: `0 0 ${V.w} ${V.h}`, class: 'al-svg', role: 'img' });
        const el = h('div', { class: 'al-chart' }, h('div', { class: 'fig-title' }, title), svg);
        const chart = { el, svg, color };
        svg.addEventListener('pointermove', e => {
            const a = alphaAt(svg, e);
            if (a !== state.hover) { state.hover = a; render(); }
        });
        svg.addEventListener('pointerleave', () => { state.hover = null; render(); });
        svg.addEventListener('click', e => {
            state.alpha = alphaAt(svg, e);
            alpha.value = String(state.alpha);
            render();
        });
        return chart;
    }

    function alphaAt(svg, e) {
        const box = svg.getBoundingClientRect();
        const x = (e.clientX - box.left) * (V.w / box.width);
        const t = (x - V.l) / (V.w - V.l - V.r);
        return Math.round(Math.min(1, Math.max(0, t)) * 10) / 10;
    }

    const X = a => V.l + a * (V.w - V.l - V.r);

    function niceTicks(lo, hi, count) {
        const span = hi - lo;
        const step0 = span / count;
        const mag = Math.pow(10, Math.floor(Math.log10(step0)));
        const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || 10 * mag;
        const out = [];
        for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
        return out;
    }

    function drawChart(chart, grid, key, refValue, refLabel, fmt, yLo, yHi, active) {
        const { svg } = chart;
        svg.textContent = '';
        const Y = v => V.t + (1 - (v - yLo) / (yHi - yLo)) * (V.h - V.t - V.b);

        niceTicks(yLo, yHi, 4).forEach(v => {
            svg.appendChild(h('line', { x1: V.l, x2: V.w - V.r, y1: Y(v), y2: Y(v), class: 'al-grid' }));
            svg.appendChild(h('text', { x: V.l - 6, y: Y(v) + 3.5, class: 'al-tick', 'text-anchor': 'end' }, fmt(v)));
        });
        [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(a => {
            svg.appendChild(h('text', { x: X(a), y: V.h - V.b + 14, class: 'al-tick', 'text-anchor': 'middle' }, a.toFixed(1)));
        });
        svg.appendChild(h('text', { x: V.l, y: V.h - 6, class: 'al-axis' }, '← BM25 only'));
        svg.appendChild(h('text', { x: V.w - V.r, y: V.h - 6, class: 'al-axis', 'text-anchor': 'end' }, 'dense only →'));

        // RRF reference.
        svg.appendChild(h('line', { x1: V.l, x2: V.w - V.r, y1: Y(refValue), y2: Y(refValue), class: 'al-ref', style: { stroke: 'var(--c-rrf)' } }));
        svg.appendChild(h('text', { x: V.w - V.r + 4, y: Y(refValue) + 3.5, class: 'al-reflabel' }, refLabel));

        // Guide at the active weight.
        svg.appendChild(h('line', { x1: X(active), x2: X(active), y1: V.t, y2: V.h - V.b, class: 'al-guide' }));

        const d = grid.map((g, i) => `${i ? 'L' : 'M'} ${X(g.alpha)} ${Y(g[key])}`).join(' ');
        svg.appendChild(h('path', { d, class: 'al-line', style: { stroke: chart.color } }));
        grid.forEach(g => {
            const on = Math.abs(g.alpha - active) < 1e-9;
            svg.appendChild(h('circle', {
                cx: X(g.alpha), cy: Y(g[key]), r: on ? 5.5 : 3,
                class: on ? 'al-pt is-on' : 'al-pt', style: { fill: chart.color },
            }));
            if (on) {
                svg.appendChild(h('text', { x: X(g.alpha), y: Y(g[key]) - 10, class: 'al-val', 'text-anchor': 'middle' }, fmt(g[key], true)));
            }
        });
    }

    function render() {
        const c = CORPORA.find(x => x.id === state.corpus);
        const grid = c.alpha_grid;
        const active = state.hover ?? state.alpha;
        alphaOut.textContent = state.alpha.toFixed(1);

        const ndcgs = grid.map(g => g.ndcg).concat([c.rrf.ndcg]);
        const lo = Math.min(...ndcgs), hi = Math.max(...ndcgs);
        const pad = Math.max(0.01, (hi - lo) * 0.12);
        drawChart(charts.ndcg, grid, 'ndcg', c.rrf.ndcg, `RRF ${c.rrf.ndcg.toFixed(3)}`,
            (v, full) => v.toFixed(full ? 3 : 2), lo - pad, hi + pad, active);
        const hurts = grid.map(g => g.hurt_vs_dense).concat([c.rrf.dense.pct_hurt]);
        drawChart(charts.hurt, grid, 'hurt_vs_dense', c.rrf.dense.pct_hurt, `RRF ${c.rrf.dense.pct_hurt.toFixed(0)}%`,
            (v, full) => (full ? v.toFixed(1) : v.toFixed(0)) + '%', 0, Math.max(...hurts) + 5, active);

        const g = grid.find(x => Math.abs(x.alpha - active) < 1e-9);
        const best = grid.reduce((a, b) => (b.ndcg > a.ndcg + 1e-9 ? b : a));
        charts.ndcg.svg.setAttribute('aria-label', `${c.label}: mean nDCG@10 by dense weight; best ${best.ndcg.toFixed(3)} at ${best.alpha.toFixed(1)}; RRF ${c.rrf.ndcg.toFixed(3)}.`);
        charts.hurt.svg.setAttribute('aria-label', `${c.label}: share of queries below dense-only by dense weight; ${g.hurt_vs_dense.toFixed(1)}% at ${active.toFixed(1)}.`);

        stats.textContent = '';
        stats.append(
            h('span', {}, h('span', { class: 'stat-label' }, `α = ${active.toFixed(1)}${state.hover !== null ? ' (hover)' : ''}`)),
            h('span', {}, 'mean nDCG@10 ', h('b', {}, g.ndcg.toFixed(3))),
            h('span', {}, 'below dense-only ', h('b', {}, `${g.hurt_vs_dense.toFixed(1)}%`)),
            h('span', {}, 'above dense-only ', h('b', {}, `${g.help_vs_dense.toFixed(1)}%`)));

        verdict.textContent = '';
        let text = `Best average on ${c.label}: α = ${best.alpha.toFixed(1)}, mean ${best.ndcg.toFixed(3)}, with ${best.hurt_vs_dense.toFixed(1)}% of queries below dense-only.`;
        if (Math.abs(active - best.alpha) > 1e-9) {
            text += active === 1
                ? ' At 1.0 this is dense-only, so no query is below it by definition.'
                : ` At ${active.toFixed(1)}: mean ${g.ndcg.toFixed(3)}, ${g.hurt_vs_dense.toFixed(1)}% below.`;
        }
        verdict.append(h('span', { class: 'verdict-icon' }, '→'), h('span', {}, text + ' Click either chart to set the weight.'));
    }

    render();
});
