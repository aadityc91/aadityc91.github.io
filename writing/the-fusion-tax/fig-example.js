// Figure 1: one real SciFact query, its BM25 and dense top five, and the fused
// list, recomputed here with the paper's formulas (RRF k = 60; min-max
// normalized interpolation with dense weight alpha). Scores and ranks come from
// the stored runs in fusion-data.js; documents absent from a list score 0 there.

PostKit.mount('fig-example', function (card) {
    const { h, segmented, flip } = PostKit;
    const EXAMPLES = window.FusionTaxData.examples;
    const SHOW = 5;
    const RRF_K = 60;

    const PRESETS = {
        dense_knew: { label: 'Dense found it', hint: 'Dense ranks the relevant abstract first; BM25 ranks it far down.' },
        bm25_knew: { label: 'BM25 found it', hint: 'BM25 ranks the relevant abstract first; dense ranks it far down.' },
        both_half: { label: 'Both half-found it', hint: 'Both lists have the relevant abstract, neither at the top.' },
    };

    const state = { ex: 0, method: 'interp', alpha: 0.7 };

    // ---- Ranking helpers ----
    // Ties go to the larger document id, the trec_eval convention the paper uses.
    const byScore = (a, b) => (b.score - a.score) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

    function listFor(ex, key) {
        return ex.docs.filter(d => d[key]).map(d => ({ id: d.id, score: d[key][0], rank: d[key][1] }))
            .sort((a, b) => a.rank - b.rank);
    }

    function fused(ex) {
        const norm = (v, [lo, hi]) => (hi === lo ? 0.5 : (v - lo) / (hi - lo));
        return ex.docs.map(d => {
            let score;
            if (state.method === 'rrf') {
                score = (d.bm25 ? 1 / (RRF_K + d.bm25[1]) : 0) + (d.dense ? 1 / (RRF_K + d.dense[1]) : 0);
            } else {
                const s = d.bm25 ? norm(d.bm25[0], ex.bm25_range) : 0;
                const v = d.dense ? norm(d.dense[0], ex.dense_range) : 0;
                score = state.alpha * v + (1 - state.alpha) * s;
            }
            return { id: d.id, score };
        }).sort(byScore).map((r, i) => ({ ...r, rank: i + 1 }));
    }

    function ndcg10(list, qrels) {
        let dcg = 0;
        list.slice(0, 10).forEach((r, i) => { dcg += (qrels[r.id] || 0) / Math.log2(i + 2); });
        const ideal = Object.values(qrels).sort((a, b) => b - a).slice(0, 10)
            .reduce((s, g, i) => s + g / Math.log2(i + 2), 0);
        return ideal ? dcg / ideal : 0;
    }

    const firstRel = (list, qrels) => {
        const hit = list.find(r => qrels[r.id] > 0);
        return hit ? hit.rank : null;
    };

    // ---- Controls ----
    const presetButtons = EXAMPLES.map((ex, i) => h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(i === 0),
        onclick: () => { state.ex = i; render(); },
    }, PRESETS[ex.kind].label));

    const alphaOut = h('output', {});
    const alpha = h('input', {
        type: 'range', min: '0', max: '1', step: '0.1', value: String(state.alpha), 'aria-label': 'Dense weight',
        oninput: e => { state.alpha = Number(e.target.value); render(); },
    });
    const alphaWrap = h('label', { class: 'ex-alpha' }, h('span', { class: 'control-label' }, 'dense weight'), alpha, alphaOut);
    const method = segmented('Fusion method', [
        { value: 'interp', label: 'Weighted' },
        { value: 'rrf', label: 'RRF' },
    ], state.method, v => { state.method = v; render(); });

    const query = h('p', { class: 'ex-query' });
    const hint = h('p', { class: 'ex-hint' });

    const cols = {
        bm25: { name: 'BM25', color: 'var(--c-sparse)' },
        fused: { name: 'Fused', color: 'var(--c-interp)' },
        dense: { name: 'Dense', color: 'var(--c-dense)' },
    };
    Object.entries(cols).forEach(([key, c]) => {
        c.swatch = h('span', { class: 'swatch', style: { background: c.color } });
        c.title = h('span', {}, c.name);
        c.list = h('ol', { class: 'xlist' });
        c.foot = h('div', { class: 'ex-foot' });
        c.el = h('div', { class: 'ex-col' + (key === 'fused' ? ' is-fused' : '') },
            h('h4', {}, c.swatch, c.title), c.list, c.foot);
        c.rows = new Map();
    });

    const verdict = h('div', { class: 'verdict', 'aria-live': 'polite' });

    card.appendChild(h('div', {},
        h('div', { class: 'ex-presets', role: 'group', 'aria-label': 'Example queries' }, presetButtons),
        query, hint,
        h('div', { class: 'controls' },
            h('span', {}, h('span', { class: 'control-label' }, 'Fusion'), method.el), alphaWrap),
        h('div', { class: 'ex-grid' }, cols.bm25.el, cols.fused.el, cols.dense.el),
        verdict));

    // ---- Rendering ----
    function row(ex, r, key) {
        const doc = ex.docs.find(d => d.id === r.id);
        const rel = (ex.qrels[r.id] || 0) > 0;
        let meta;
        if (key === 'bm25') meta = `BM25 ${doc.bm25[0].toFixed(2)}`;
        else if (key === 'dense') meta = `cosine ${doc.dense[0].toFixed(3)}`;
        else meta = `dense ${doc.dense ? '#' + doc.dense[1] : '–'} · BM25 ${doc.bm25 ? '#' + doc.bm25[1] : '–'}`;
        return h('li', { class: 'xrow' + (rel ? ' is-rel' : ''), 'data-id': r.id },
            h('span', { class: 'xrow-rank' }, String(r.rank)),
            h('span', { class: 'xrow-body' },
                h('span', { class: 'xrow-title' }, doc.title),
                h('span', { class: 'xrow-meta' }, meta, rel ? h('b', { class: 'xrow-rel' }, ' · ✓ relevant') : null)));
    }

    function fill(ex, key, list, nd) {
        const c = cols[key];
        c.list.textContent = '';
        c.rows = new Map();
        list.slice(0, SHOW).forEach(r => {
            const el = row(ex, r, key);
            c.rows.set(r.id, el);
            c.list.appendChild(el);
        });
        const pos = firstRel(list, ex.qrels);
        c.foot.textContent = '';
        c.foot.append(
            h('span', {}, pos === null ? 'Relevant abstract not in the top 100' : pos <= SHOW ? `Relevant abstract at #${pos}` : `Relevant abstract at #${pos}, below the fold`),
            h('span', { class: 'ex-ndcg' }, `nDCG@10 ${nd.toFixed(2)}`));
    }

    function render() {
        const ex = EXAMPLES[state.ex];
        presetButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === state.ex)));
        query.textContent = `“${ex.query}”`;
        hint.textContent = PRESETS[ex.kind].hint;
        alphaWrap.style.display = state.method === 'interp' ? '' : 'none';
        alphaOut.textContent = state.alpha.toFixed(1);
        cols.fused.title.textContent = state.method === 'rrf' ? 'Fused · RRF' : `Fused · weighted, dense ${state.alpha.toFixed(1)}`;
        cols.fused.swatch.style.background = state.method === 'rrf' ? 'var(--c-rrf)' : 'var(--c-interp)';

        const bm = listFor(ex, 'bm25');
        const dn = listFor(ex, 'dense');
        const fu = fused(ex);
        const nb = ndcg10(bm, ex.qrels), nd = ndcg10(dn, ex.qrels), nf = ndcg10(fu, ex.qrels);

        const before = new Map();
        cols.fused.rows.forEach((el, id) => before.set(id, el));
        const play = flip(before);
        fill(ex, 'bm25', bm, nb);
        fill(ex, 'dense', dn, nd);
        fill(ex, 'fused', fu, nf);
        play(cols.fused.rows);

        const tax = Math.max(nb, nd) - nf;
        const name = state.method === 'rrf' ? 'RRF' : `Weighted fusion (dense ${state.alpha.toFixed(1)})`;
        const pos = firstRel(fu, ex.qrels);
        const where = pos === null ? 'out of the top 100' : `at #${pos}`;
        const better = nd >= nb ? `dense alone (#${firstRel(dn, ex.qrels)})` : `BM25 alone (#${firstRel(bm, ex.qrels)})`;
        verdict.textContent = '';
        if (tax > 1e-9) {
            verdict.append(h('span', { class: 'verdict-icon' }, '!'),
                h('span', {}, `${name} puts the relevant abstract ${where}, below ${better}. Fusion tax on this query: ${tax.toFixed(2)} nDCG@10.`));
        } else if (tax < -1e-9) {
            verdict.append(h('span', { class: 'verdict-icon' }, '✓'),
                h('span', {}, `${name} lifts the relevant abstract to #${pos}, above both lists: a gain of ${(-tax).toFixed(2)} nDCG@10 over the better one.`));
        } else {
            verdict.append(h('span', { class: 'verdict-icon' }, '='),
                h('span', {}, `${name} keeps the relevant abstract ${where}, as good as ${better}. No tax on this query.`));
        }
    }

    render();
});
