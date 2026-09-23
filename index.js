document.addEventListener('DOMContentLoaded', init);

function init() {
    const STORAGE = { TX: 'iou_tx', ARCH: 'iou_arch', WHOM: 'iou_whom' };
    const currency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
    const $ = id => document.getElementById(id);
    function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def } catch (e) { return def } }
    function save(k, v) { localStorage.setItem(k, JSON.stringify(v)) }
    function uid() { return crypto.randomUUID ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)) }
    function toast(msg) { const c = $('toastContainer'); const el = document.createElement('div'); el.className = 'toast align-items-center text-bg-dark border-0 show mb-2'; el.role = 'alert'; el.ariaLive = 'assertive'; el.ariaAtomic = 'true'; el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`; c.appendChild(el); setTimeout(() => el.remove(), 2500) }
    function toastWithUndo(msg, onUndo) {
        const c = $('toastContainer'); const el = document.createElement('div');
        el.className = 'toast align-items-center text-bg-dark border-0 show mb-2';
        el.role = 'alert'; el.ariaLive = 'assertive'; el.ariaAtomic = 'true';
        el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn btn-sm btn-link text-white text-decoration-underline me-1 my-auto">Undo</button><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
        c.appendChild(el);
        let settled = false;
        const timer = setTimeout(() => { if (!settled) { settled = true; el.remove(); } }, 4000);
        el.querySelector('.btn-link').addEventListener('click', () => {
            if (settled) return;
            settled = true; clearTimeout(timer); el.remove(); onUndo();
        });
    }

    // one-time migration: pre-namespaced keys → iou_* keys. Old values were JSON-stringified, same format as new ones.
    (function migrateLegacyStorage() {
        const moves = [['transactions', STORAGE.TX], ['archivedTransactions', STORAGE.ARCH], ['whomList', STORAGE.WHOM]];
        for (const [oldKey, newKey] of moves) {
            const oldVal = localStorage.getItem(oldKey);
            if (oldVal === null) continue;
            if (localStorage.getItem(newKey) === null) { localStorage.setItem(newKey, oldVal); localStorage.removeItem(oldKey); }
        }
    })();

    let transactions = load(STORAGE.TX, []); // {id, whom, amount, date}; whom kept in shape but not used (single-merchant app)
    let archived = load(STORAGE.ARCH, []);

    const peopleList = $('peopleList'), archList = $('archivedList'), balanceEl = $('balance');
    const amountEl = $('amount'), addBtn = $('addBtn'), amountPreviewEl = $('amountPreview');
    const payAllBtn = $('payAllBtn'), resetBtn = $('resetBtn');
    const resetConfirmModalEl = $('resetConfirmModal'), resetConfirmInput = $('resetConfirmInput'), resetConfirmBtn = $('resetConfirmBtn');
    const actionConfirmModalEl = $('actionConfirmModal'), actionConfirmTitle = $('actionConfirmTitle'), actionConfirmBody = $('actionConfirmBody'), actionConfirmBtn = $('actionConfirmBtn');

    function confirmAction({ title, body, confirmLabel = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
        actionConfirmTitle.textContent = title;
        actionConfirmBody.textContent = body;
        actionConfirmBtn.textContent = confirmLabel;
        actionConfirmBtn.className = `btn ${confirmClass}`;
        actionConfirmBtn.onclick = () => { bootstrap.Modal.getOrCreateInstance(actionConfirmModalEl).hide(); onConfirm(); };
        bootstrap.Modal.getOrCreateInstance(actionConfirmModalEl).show();
    }

    function saveAll() { save(STORAGE.TX, transactions); save(STORAGE.ARCH, archived); }
    function format(v) { return currency.format(v || 0); }
    function sum(arr) { return arr.reduce((s, t) => s + (t.amount || 0), 0); }

    function makeDeleteBtn(onClick) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn-close'; b.setAttribute('aria-label', 'Delete');
        b.addEventListener('click', onClick);
        return b;
    }

    function renderOutstanding() {
        peopleList.innerHTML = '';
        if (transactions.length === 0) {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = 'No outstanding entries';
            peopleList.appendChild(li);
        } else {
            const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
            for (const t of sorted) {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                const date = document.createElement('div'); date.className = 'small-muted'; date.textContent = new Date(t.date).toLocaleString();
                const right = document.createElement('div'); right.className = 'd-flex align-items-center gap-3';
                const amt = document.createElement('div'); amt.className = 'fw-bold'; amt.textContent = format(t.amount);
                right.append(amt, makeDeleteBtn(() => deleteOutstanding(t.id)));
                li.append(date, right);
                peopleList.appendChild(li);
            }
        }
        balanceEl.textContent = format(sum(transactions));
        renderPayAllBtn();
    }

    function renderPayAllBtn() {
        payAllBtn.disabled = transactions.length === 0;
        payAllBtn.textContent = transactions.length === 0 ? 'Pay all' : `Pay all (${format(sum(transactions))})`;
    }

    function payAll() {
        const paidCount = transactions.length;
        const archivedAt = new Date().toISOString();
        const movedIn = transactions.map(t => ({ ...t, archivedAt }));
        archived = archived.concat(movedIn);
        transactions = [];
        saveAll(); renderOutstanding(); renderArchived(); drawChart();
        toastWithUndo('All marked paid', () => {
            archived = archived.slice(0, archived.length - paidCount);
            transactions = movedIn.map(({ archivedAt, ...t }) => t);
            saveAll(); renderOutstanding(); renderArchived(); drawChart();
        });
    }

    function renderArchived() {
        archList.innerHTML = '';
        if (archived.length === 0) {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = 'No archived payments';
            archList.appendChild(li);
            return;
        }
        const groups = new Map();
        for (const t of archived) {
            const key = t.archivedAt || t.date;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(t);
        }
        const sortedKeys = [...groups.keys()].sort((a, b) => new Date(b) - new Date(a));
        for (const key of sortedKeys) {
            const items = groups.get(key);
            const header = document.createElement('li');
            header.className = 'list-group-item d-flex justify-content-between align-items-center fw-bold';
            header.style.borderTop = '2px solid var(--surface-contrast)';
            header.innerHTML = `<span>Paid ${new Date(key).toLocaleDateString()}</span><span>${format(sum(items))}</span>`;
            archList.appendChild(header);
            for (const t of items) {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center ps-4';
                li.innerHTML = `<div class="small-muted">Added: ${new Date(t.date).toLocaleDateString()}</div><div>${format(t.amount)}</div>`;
                archList.appendChild(li);
            }
        }
    }

    function deleteOutstanding(id) {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return;
        confirmAction({
            title: 'Delete entry?',
            body: `Delete the ${format(tx.amount)} outstanding entry? This cannot be undone.`,
            confirmLabel: 'Delete',
            confirmClass: 'btn-danger',
            onConfirm: () => {
                transactions = transactions.filter(t => t.id !== id);
                saveAll(); renderOutstanding(); drawChart();
                toast('Deleted');
            }
        });
    }

    function renderAmountPreview() {
        const digitsOnly = amountEl.value.replace(/[^0-9]/g, '');
        if (digitsOnly !== amountEl.value) amountEl.value = digitsOnly;
        const parsed = IouLogic.parseAmount(amountEl.value);
        amountPreviewEl.textContent = parsed === null ? 'Type digits — e.g. 123 = R1.23' : `= ${format(parsed)}`;
    }
    amountEl.addEventListener('input', renderAmountPreview);

    function addTransaction() {
        const parsed = IouLogic.parseAmount(amountEl.value);
        if (parsed === null) { toast('Enter a positive amount'); amountEl.focus(); return; }
        const tx = { id: uid(), whom: '', amount: parsed, date: new Date().toISOString() };
        transactions.push(tx);
        saveAll();
        amountEl.value = '';
        renderAmountPreview();
        renderOutstanding(); renderArchived(); drawChart();
        toast('Saved');
    }

    payAllBtn.addEventListener('click', () => {
        if (transactions.length === 0) return;
        confirmAction({
            title: 'Pay all?',
            body: `Mark all outstanding entries as paid (${format(sum(transactions))})?`,
            confirmLabel: 'Pay all',
            confirmClass: 'btn-success',
            onConfirm: payAll
        });
    });

    resetBtn.addEventListener('click', () => {
        resetConfirmInput.value = ''; resetConfirmBtn.disabled = true;
        bootstrap.Modal.getOrCreateInstance(resetConfirmModalEl).show();
        setTimeout(() => resetConfirmInput.focus(), 200);
    });
    resetConfirmInput.addEventListener('input', () => { resetConfirmBtn.disabled = resetConfirmInput.value.trim() !== 'RESET'; });
    resetConfirmInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !resetConfirmBtn.disabled) resetConfirmBtn.click(); });
    resetConfirmBtn.addEventListener('click', () => {
        if (resetConfirmInput.value.trim() !== 'RESET') return;
        localStorage.clear(); transactions = []; archived = [];
        saveAll(); renderOutstanding(); renderArchived(); drawChart();
        bootstrap.Modal.getOrCreateInstance(resetConfirmModalEl).hide();
        toast('Reset done');
    });

    addBtn.addEventListener('click', addTransaction);
    amountEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTransaction(); });

    // chart: last 30 days, daily totals
    let chart = null;
    function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    function drawChart() {
        try {
            const ctx = $('chart').getContext('2d');
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const days = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today); d.setDate(today.getDate() - i);
                days.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, key: dayKey(d) });
            }
            const all = transactions.concat(archived);
            const totals = new Map(days.map(x => [x.key, 0]));
            for (const t of all) { const k = dayKey(new Date(t.date)); if (totals.has(k)) totals.set(k, totals.get(k) + (t.amount || 0)); }
            const values = days.map(x => totals.get(x.key));
            const labels = days.map(x => x.label);
            if (chart) chart.destroy();
            chart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Total (paid+owed)', data: values }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { autoSkip: true, maxRotation: 0 } } } } });
        } catch (e) { console.warn(e); }
    }

    renderOutstanding(); renderArchived(); drawChart();

    window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); amountEl.focus(); amountEl.select(); } });
    amountEl.focus();
    requestAnimationFrame(() => requestAnimationFrame(() => amountEl.focus()));
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !document.querySelector('.modal.show')) amountEl.focus();
    });

    window.app = { transactions, archived };

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').catch(err => console.warn('SW registration failed', err));
        });
    }
}
