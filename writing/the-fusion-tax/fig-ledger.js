// Figure 3: the harm/benefit ledger. For each corpus, the share of queries
// fusion scored below (left) and above (right) the reference, and the net
// change in mean nDCG@10. Numbers are the paper's symmetric accounting
// (harm_benefit.json), BGE-small.

PostKit.mount('fig-ledger', function (card) {
    const { h, segmented } = PostKit;
    const CORPORA = window.FusionTaxData.corpora;
    const SCALE = 80; // percent at the end of each half-axis

    const state = { method: 'interp', ref: 'dense', focus: null };
    const METHOD_TEXT = { interp: 'Weighted fusion (dense 0.7)', rrf: 'RRF' };
    const REF_TEXT = { dense: 'dense-only', oracle: 'the better of BM25 and dense' };

    const method = segmented('Fusion method', [
        { value: 'interp', label: 'Weighted 0.7' },
        { value: 'rrf', label: 'RRF' },
    ], state.method, v => { state.method = v; render(); });
    const ref = segmented('Compare against', [
        { value: 'dense', label: 'Dense-only' },
        { value: 'oracle', label: 'Better of the two' },
    ], state.ref, v => { state.ref = v; render(); });

    const head = h('div', { class: 'lg-row lg-head', 'aria-hidden': 'true' },
        h('span', {}), h('span', { class: 'lg-hurt-h' }, '← hurt'), h('span', { class: 'lg-help-h' }, 'helped →'),
        h('span', { class: 'lg-net' }, 'net'));

    const rows = CORPORA.map(c => {
        const hurtBar = h('span', { class: 'lg-bar lg-bar-hurt' });
        const helpBar = h('span', { class: 'lg-bar lg-bar-help' });
        const hurtVal = h('span', { class: 'lg-val' });
        const helpVal = h('span', { class: 'lg-val' });
        const net = h('span', { class: 'lg-net' });
        const el = h('div', {
            class: 'lg-row', tabindex: '0', 'data-id': c.id,
            onmouseenter: () => setFocus(c.id), onfocus: () => setFocus(c.id),
            onmouseleave: () => setFocus(null), onblur: () => setFocus(null),
        },
            h('span', { class: 'lg-label' }, c.label),
            h('span', { class: 'lg-half lg-left' }, hurtVal, hurtBar),
            h('span', { class: 'lg-half lg-right' }, helpBar, helpVal),
            net);
        return { c, el, hurtBar, helpBar, hurtVal, helpVal, net };
    });

    const detail = h('div', { class: 'verdict', 'aria-live': 'polite' });

    card.appendChild(h('div', {},
        h('div', { class: 'controls' },
            h('span', {}, h('span', { class: 'control-label' }, 'Fusion'), method.el),
            h('span', {}, h('span', { class: 'control-label' }, 'Compare against'), ref.el)),
        h('div', { class: 'lg-table', role: 'table', 'aria-label': 'Harm and benefit of fusion by corpus' },
            head, rows.map(r => r.el)),
        h('div', { class: 'lg-axis', 'aria-hidden': 'true' },
            h('span', {}), h('span', { class: 'lg-left' }, `${SCALE}%`, h('span', {}, '0')), h('span', { class: 'lg-right' }, h('span', {}, ''), `${SCALE}%`), h('span', {})),
        detail));

    const fmtNet = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(3);

    function acct(c) {
        return c[state.method][state.ref];
    }

    function render() {
        rows.forEach(r => {
            const a = acct(r.c);
            r.hurtBar.style.width = `${(a.pct_hurt / SCALE) * 100}%`;
            r.helpBar.style.width = `${(a.pct_help / SCALE) * 100}%`;
            r.hurtVal.textContent = `${a.pct_hurt.toFixed(1)}%`;
            r.helpVal.textContent = `${a.pct_help.toFixed(1)}%`;
            r.net.textContent = fmtNet(a.net_mean_delta);
            r.el.setAttribute('aria-label',
                `${r.c.label}: hurt ${a.pct_hurt.toFixed(1)}% of queries by ${a.mean_loss_when_hurt.toFixed(3)} on average, helped ${a.pct_help.toFixed(1)}% by ${a.mean_gain_when_help.toFixed(3)}, net ${fmtNet(a.net_mean_delta)} nDCG@10`);
        });
        renderDetail();
    }

    function setFocus(id) {
        state.focus = id;
        rows.forEach(r => r.el.classList.toggle('is-focus', r.c.id === id));
        renderDetail();
    }

    function renderDetail() {
        detail.textContent = '';
        const name = METHOD_TEXT[state.method];
        if (state.focus) {
            const c = CORPORA.find(x => x.id === state.focus);
            const a = acct(c);
            detail.append(h('span', { class: 'verdict-icon' }, '→'), h('span', {},
                `${c.label}: ${name} hurt ${a.pct_hurt.toFixed(1)}% of queries by ${a.mean_loss_when_hurt.toFixed(3)} nDCG@10 on average and ` +
                `${state.ref === 'oracle' ? 'beat both retrievers on' : 'helped'} ${a.pct_help.toFixed(1)}% by ${a.mean_gain_when_help.toFixed(3)}. ` +
                `Net change against ${REF_TEXT[state.ref]}: ${fmtNet(a.net_mean_delta)}.`));
            return;
        }
        const all = CORPORA.map(acct);
        const hurt = all.map(a => a.pct_hurt), net = all.map(a => a.net_mean_delta);
        const neg = net.filter(v => v < 0).length;
        const range = arr => `${Math.round(Math.min(...arr))}–${Math.round(Math.max(...arr))}%`;
        let text;
        if (state.ref === 'oracle') {
            const where = neg === all.length ? 'on every corpus' : `on ${neg} of ${all.length} corpora`;
            text = `Against the better of its two inputs, ${name} hurts ${range(hurt)} of queries, and the net is negative ${where}: a perfect per-query choice between BM25 and dense would beat it there.`;
        } else if (neg === 0) {
            text = `${name} beats dense-only on average on all ${all.length} corpora, and still scores ${range(hurt)} of queries below it.`;
        } else {
            text = `${name} hurts ${range(hurt)} of queries against dense-only, and its net is negative on ${neg} of ${all.length} corpora.`;
        }
        detail.append(h('span', { class: 'verdict-icon' }, '!'), h('span', {}, text + ' Hover a row for the size of the moves.'));
    }

    render();
});
