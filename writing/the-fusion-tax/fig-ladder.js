// Figure 5: step the dense encoder from MiniLM (22M) to Qwen3-Embedding (596M).
// Left: nDCG@10 of BM25, dense-only and the fused list on each corpus. Right:
// the oracle fusion tax, with ticks marking the other encoders' values.

PostKit.mount('fig-ladder', function (card) {
    const { h, segmented, reducedMotion } = PostKit;
    const { corpora: CORPORA, encoders: ENCODERS } = window.FusionTaxData;
    const TAX_SCALE = 70;

    const state = { enc: 'minilm', method: 'interp' };
    let timer = 0;

    const enc = segmented('Dense encoder', ENCODERS.map(e => ({ value: e.id, label: `${e.label} ${e.params}M` })),
        state.enc, v => { stop(); state.enc = v; render(); });
    const method = segmented('Fusion method', [
        { value: 'interp', label: 'Weighted 0.7' },
        { value: 'rrf', label: 'RRF' },
    ], state.method, v => { state.method = v; render(); });
    const play = h('button', { type: 'button', class: 'chip', onclick: () => (timer ? stop() : start()) }, '▶ Step through');

    const legend = h('div', { class: 'ld-legend' },
        h('span', {}, h('span', { class: 'ld-key ld-bm25' }), 'BM25'),
        h('span', {}, h('span', { class: 'ld-key ld-dense' }), 'dense-only'),
        h('span', {}, h('span', { class: 'ld-key ld-fused' }), h('span', { class: 'ld-fused-name' }, 'fused')));

    const rows = CORPORA.map(c => {
        const bm = h('span', { class: 'ld-mark ld-bm25' });
        const dn = h('span', { class: 'ld-mark ld-dense' });
        const fu = h('span', { class: 'ld-mark ld-fused' });
        const bar = h('span', { class: 'ld-bar' });
        const ticks = h('span', { class: 'ld-ticks' });
        const val = h('span', { class: 'ld-val' });
        const el = h('div', { class: 'ld-row' },
            h('span', { class: 'ld-label' }, c.label),
            h('span', { class: 'ld-track' }, bm, dn, fu),
            h('span', { class: 'ld-taxcell' }, h('span', { class: 'ld-taxtrack' }, bar, ticks), val));
        return { c, el, bm, dn, fu, bar, ticks, val };
    });

    const verdict = h('div', { class: 'verdict', 'aria-live': 'polite' });

    card.appendChild(h('div', {},
        h('div', { class: 'controls sc-corpus' }, enc.el),
        h('div', { class: 'controls' },
            h('span', {}, h('span', { class: 'control-label' }, 'Fusion'), method.el), play),
        h('div', { class: 'ld-row ld-head', 'aria-hidden': 'true' },
            h('span', {}), h('span', {}, 'nDCG@10, 0 to 1'), h('span', {}, 'Fusion tax (% of queries hurt)')),
        rows.map(r => r.el),
        legend,
        verdict));

    function render() {
        const e = ENCODERS.find(x => x.id === state.enc);
        const taxKey = state.method === 'rrf' ? 'tax_rrf' : 'tax_interp';
        const fusedKey = state.method === 'rrf' ? 'rrf' : 'interp';
        card.querySelector('.ld-fused-name').textContent = state.method === 'rrf' ? 'fused (RRF)' : 'fused (weighted 0.7)';
        card.style.setProperty('--ld-fused', state.method === 'rrf' ? 'var(--c-rrf)' : 'var(--c-interp)');

        rows.forEach(r => {
            const L = r.c.ladder[state.enc];
            r.bm.style.left = `${L.bm25 * 100}%`;
            r.dn.style.left = `${L.dense * 100}%`;
            r.fu.style.left = `${L[fusedKey] * 100}%`;
            r.bar.style.width = `${(L[taxKey] / TAX_SCALE) * 100}%`;
            r.val.textContent = `${L[taxKey].toFixed(0)}%`;
            r.ticks.textContent = '';
            ENCODERS.filter(x => x.id !== state.enc).forEach(x => {
                r.ticks.appendChild(h('span', { class: 'ld-tick', style: { left: `${(r.c.ladder[x.id][taxKey] / TAX_SCALE) * 100}%` } }));
            });
            r.el.setAttribute('aria-label',
                `${r.c.label} with ${e.label}: BM25 ${L.bm25.toFixed(3)}, dense ${L.dense.toFixed(3)}, fused ${L[fusedKey].toFixed(3)}; fusion tax ${L[taxKey].toFixed(1)}%`);
        });

        const six = rows.filter(r => r.c.id !== 'trec-covid').map(r => r.c.ladder[state.enc][taxKey]);
        const covid = CORPORA.find(c => c.id === 'trec-covid').ladder[state.enc][taxKey];
        const meanDense = CORPORA.reduce((s, c) => s + c.ladder[state.enc].dense, 0) / CORPORA.length;
        const base = CORPORA.reduce((s, c) => s + c.ladder.minilm.dense, 0) / CORPORA.length;
        const name = state.method === 'rrf' ? 'RRF' : 'Weighted fusion';
        verdict.textContent = '';
        verdict.append(h('span', { class: 'verdict-icon' }, '→'), h('span', {},
            `${e.label} (${e.params}M): mean dense nDCG@10 across the seven corpora is ${meanDense.toFixed(3)}` +
            (state.enc === 'minilm' ? '' : `, ${(meanDense - base >= 0 ? '+' : '−') + Math.abs(meanDense - base).toFixed(3)} over MiniLM`) +
            `. ${name} still hurts ${Math.round(Math.min(...six))}–${Math.round(Math.max(...six))}% of queries on six corpora, and ${Math.round(covid)}% on the 50-query TREC-COVID.`));
    }

    function start() {
        play.textContent = '❚❚ Pause';
        const step = () => {
            const i = ENCODERS.findIndex(x => x.id === state.enc);
            state.enc = ENCODERS[(i + 1) % ENCODERS.length].id;
            enc.set(state.enc);
            render();
        };
        step();
        timer = setInterval(step, reducedMotion.matches ? 2400 : 1600);
    }

    function stop() {
        clearInterval(timer);
        timer = 0;
        play.textContent = '▶ Step through';
    }

    render();
});
