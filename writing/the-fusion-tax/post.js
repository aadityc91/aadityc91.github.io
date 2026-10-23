// Page chrome for standalone posts, plus small helpers the figures share.
//
// The home page's script.js isn't loaded here: it wraps every letter "b" in a
// span for the bee easter egg, which would split the figures' text and SVG
// labels. This file keeps only the theme toggle and the mobile menu, with the
// same localStorage key, so the theme follows the reader between pages.

(function () {
    function readTheme() {
        try {
            return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
        } catch (e) {
            return 'light';
        }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            // Private mode or blocked storage: the theme still applies for this page.
        }
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;
        toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        const sun = toggle.querySelector('.sun-icon');
        const moon = toggle.querySelector('.moon-icon');
        if (sun && moon) {
            sun.style.display = theme === 'dark' ? 'block' : 'none';
            moon.style.display = theme === 'dark' ? 'none' : 'block';
        }
        document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
    }

    function initChrome() {
        applyTheme(readTheme());
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
            });
        }

        const header = document.getElementById('main-header');
        const menuButton = document.getElementById('toggle-navigation-menu');
        if (!header || !menuButton) return;
        let open = false;
        const setOpen = next => {
            open = next;
            header.classList.toggle('menu-open', open);
            document.body.classList.toggle('menu-open', open);
            document.body.style.overflow = open ? 'hidden' : '';
            menuButton.setAttribute('aria-expanded', String(open));
        };
        menuButton.addEventListener('click', () => setOpen(!open));
        document.querySelectorAll('#navigation-menu a').forEach(link => {
            link.addEventListener('click', () => open && setOpen(false));
        });
        document.addEventListener('click', e => {
            if (open && !e.target.closest('#main-header')) setOpen(false);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && open) setOpen(false);
        });
    }

    // ---- Helpers for the figures -----------------------------------------

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Tiny element builder: h('div', { class: 'x', onclick: fn }, child, 'text').
    function h(tag, attrs, ...children) {
        const svgTags = new Set(['svg', 'path', 'g', 'rect', 'circle', 'line', 'text', 'polyline']);
        const el = svgTags.has(tag)
            ? document.createElementNS('http://www.w3.org/2000/svg', tag)
            : document.createElement(tag);
        Object.entries(attrs || {}).forEach(([key, value]) => {
            if (value === undefined || value === null || value === false) return;
            if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2), value);
            } else if (key === 'style' && typeof value === 'object') {
                Object.entries(value).forEach(([prop, v]) => el.style.setProperty(prop, v));
            } else if (key === 'html') {
                el.innerHTML = value;
            } else {
                el.setAttribute(key, value === true ? '' : value);
            }
        });
        children.flat().forEach(child => {
            if (child === undefined || child === null || child === false) return;
            el.appendChild(typeof child === 'string' || typeof child === 'number'
                ? document.createTextNode(String(child)) : child);
        });
        return el;
    }

    // A segmented control. options: [{ value, label }]; returns { el, set }.
    function segmented(name, options, initial, onChange) {
        let current = initial;
        const buttons = options.map(opt => h('button', {
            type: 'button',
            'aria-pressed': String(opt.value === current),
            onclick: () => {
                if (opt.value === current) return;
                set(opt.value);
                onChange(opt.value);
            },
        }, opt.label));
        function set(value) {
            current = value;
            buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].value === value)));
        }
        const el = h('div', { class: 'seg', role: 'group', 'aria-label': name }, buttons);
        return { el, set, get: () => current };
    }

    // FLIP: call before re-rendering with a key->element map, then call the
    // returned function with the new map to animate elements into place.
    function flip(oldEls) {
        const before = new Map();
        oldEls.forEach((el, key) => before.set(key, el.getBoundingClientRect()));
        return function play(newEls) {
            if (reducedMotion.matches) return;
            newEls.forEach((el, key) => {
                const old = before.get(key);
                const now = el.getBoundingClientRect();
                if (!old) {
                    el.animate([{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }],
                        { duration: 260, easing: 'ease-out' });
                    return;
                }
                const dx = old.left - now.left;
                const dy = old.top - now.top;
                if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
                el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                    { duration: 380, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
            });
        };
    }

    // Re-run a layout function when the element resizes or the fonts settle.
    function onLayout(el, fn) {
        let frame = 0;
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(fn);
        };
        if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(el);
        window.addEventListener('resize', schedule);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
        return schedule;
    }

    // Each figure registers a mount function; it runs once the DOM is ready and
    // replaces the figure's no-JavaScript fallback.
    function mount(id, fn) {
        const run = () => {
            const root = document.getElementById(id);
            if (!root) return;
            const body = root.querySelector('.fig-card');
            const fallback = body.querySelector('.fig-fallback');
            try {
                fn(body);
                if (fallback) fallback.remove();
            } catch (err) {
                console.error(`Figure ${id} failed to render`, err);
            }
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
        else run();
    }

    window.PostKit = { h, segmented, flip, onLayout, mount, reducedMotion };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChrome);
    else initChrome();
})();
