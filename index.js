document.addEventListener('DOMContentLoaded', init);

function init() {
  const ELEMENT_IDS = {
    BALANCE: 'balance',
    LIST: 'list',
    AMOUNT: 'amount',
    WHOM: 'whom',
    ADD_TRANSACTION: 'addTransactionBtn',
    ARCHIVE_LIST: 'ArchiveListBtn',
    ARCHIVED_TOTAL: 'archivedTotal',
    ARCHIVED_LIST: 'archivedList',
    RESET_ALL: 'ResetEverythingBtn',
    APP_HEADER: 'app-header',
    WHOM_DATALIST: 'whom-list'
  };

  // elements
  const balanceElement = document.getElementById(ELEMENT_IDS.BALANCE);
  const listElement = document.getElementById(ELEMENT_IDS.LIST);
  const amountElement = document.getElementById(ELEMENT_IDS.AMOUNT);
  const whomElement = document.getElementById(ELEMENT_IDS.WHOM);
  const whomDatalist = document.getElementById(ELEMENT_IDS.WHOM_DATALIST);
  const addTransactionBtn = document.getElementById(ELEMENT_IDS.ADD_TRANSACTION);
  const archiveListBtn = document.getElementById(ELEMENT_IDS.ARCHIVE_LIST);
  const archivedTotalElement = document.getElementById(ELEMENT_IDS.ARCHIVED_TOTAL);
  const archivedListElement = document.getElementById(ELEMENT_IDS.ARCHIVED_LIST);
  const resetEverythingBtn = document.getElementById(ELEMENT_IDS.RESET_ALL);
  const appHeaderElement = document.getElementById(ELEMENT_IDS.APP_HEADER);

  // storage keys
  const STORAGE = {
    TRANSACTIONS: 'transactions',
    ARCHIVED: 'archivedTransactions',
    APP_HEADER: 'appHeader',
    WHOM_LIST: 'whomList'
  };

  // safe localStorage helpers
  function getLocalStorageItem(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse localStorage key', key, e);
      return defaultValue;
    }
  }
  function setLocalStorageItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // basic utilities
  function generateUUID() {
    let d = Date.now();
    let d2 = (performance && performance.now && performance.now() * 1000) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      let r = Math.random() * 16;
      if (d > 0) {
        r = (d + r) % 16 | 0;
        d = Math.floor(d / 16);
      } else {
        r = (d2 + r) % 16 | 0;
        d2 = Math.floor(d2 / 16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  const currencyFormatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
  function formatCurrency(v) { return currencyFormatter.format(v); }
  function getTotalBalance(arr) { return arr.reduce((s, t) => s + (t.amount || 0), 0); }
  function clearEl(el) { if (el) el.innerHTML = ''; }
  function setText(el, txt) { if (el) el.innerText = txt; }

  // data
  let transactions = getLocalStorageItem(STORAGE.TRANSACTIONS, []);
  let archivedTransactions = getLocalStorageItem(STORAGE.ARCHIVED, []);

  // APP HEADER: make editable if exists and persist
  if (appHeaderElement) {
    appHeaderElement.contentEditable = 'true';
    const savedHeader = getLocalStorageItem(STORAGE.APP_HEADER, 'Expense Tracker');
    appHeaderElement.textContent = savedHeader;
    appHeaderElement.addEventListener('input', (e) => {
      setLocalStorageItem(STORAGE.APP_HEADER, e.target.textContent.trim());
    });
  }

  // WHOM datalist persistence
  function loadWhomList() {
    const items = getLocalStorageItem(STORAGE.WHOM_LIST, []);
    if (!whomDatalist) return;
    clearEl(whomDatalist);
    items.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      whomDatalist.appendChild(opt);
    });
  }
  function saveWhomIfNew(name) {
    if (!name) return;
    const clean = name.trim();
    if (!clean) return;
    const items = getLocalStorageItem(STORAGE.WHOM_LIST, []);
    if (!items.includes(clean)) {
      items.push(clean);
      setLocalStorageItem(STORAGE.WHOM_LIST, items);
      loadWhomList();
    }
  }
  if (whomElement) {
    // save on blur or change (covers typing + selecting)
    whomElement.addEventListener('change', () => saveWhomIfNew(whomElement.value));
    whomElement.addEventListener('blur', () => saveWhomIfNew(whomElement.value));
  }
  loadWhomList();

  // DOM append using proper event listeners (no inline onclick)
  function appendTransactionToDOM(transaction, targetEl, isArchive = false) {
    if (!targetEl) return;
    const li = document.createElement('li');
    li.className = 'list-group-item';
    const formattedAmount = formatCurrency(Math.abs(transaction.amount));
    const date = new Date(transaction.date).toLocaleString();
    const wrapper = document.createElement('div');
    wrapper.className = 'd-flex justify-content-between align-items-center gap-3';

    const left = document.createElement('div');
    left.className = 'd-flex justify-content-between align-items-center gap-3 w-100';
    const amtP = document.createElement('p'); amtP.className = 'm-0 fw-bolder'; amtP.style.fontSize = '0.9rem'; amtP.innerText = formattedAmount;
    const whomP = document.createElement('p'); whomP.className = 'm-0 text-secondary'; whomP.style.fontSize = '0.6rem'; whomP.innerText = `${transaction.whom || ''}, ${date}`;
    left.appendChild(amtP); left.appendChild(whomP);

    wrapper.appendChild(left);

    if (!isArchive) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-danger btn-sm px-2 py-0';
      btn.type = 'button';
      btn.innerText = '-';
      btn.addEventListener('click', () => removeTransaction(transaction.id));
      wrapper.appendChild(btn);
    }

    li.appendChild(wrapper);
    targetEl.appendChild(li);
  }

  function renderTransactions() {
    clearEl(listElement);
    // non-mutating sort copy
    [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(t => appendTransactionToDOM(t, listElement));
    setText(balanceElement, formatCurrency(getTotalBalance(transactions)));
  }

  function renderArchivedTransactions() {
    clearEl(archivedListElement);
    [...archivedTransactions].sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(t => appendTransactionToDOM(t, archivedListElement, true));
    setText(archivedTotalElement, formatCurrency(getTotalBalance(archivedTransactions)));
  }

  function updateArchiveButtonState() {
    if (archiveListBtn) archiveListBtn.disabled = transactions.length === 0;
  }

  // business logic
  function addTransaction() {
    if (!amountElement) return;
    const amount = parseFloat(amountElement.value);
    if (isNaN(amount) || amount === 0) { alert('Please enter a valid amount'); return; }
    if (whomElement && !whomElement.value.trim()) { alert('Please enter whom to pay'); whomElement.focus(); return; }

    const transaction = { id: generateUUID(), amount: amount, whom: whomElement ? whomElement.value.trim() : '', date: new Date().toISOString() };
    transactions.push(transaction);
    setLocalStorageItem(STORAGE.TRANSACTIONS, transactions);
    saveWhomIfNew(transaction.whom); // persist whom
    renderTransactions();
    updateArchiveButtonState();
    amountElement.value = '';
    alert(`Amount of ${formatCurrency(amount)} was added successfully.`);
  }

  function removeTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    setLocalStorageItem(STORAGE.TRANSACTIONS, transactions);
    renderTransactions();
    updateArchiveButtonState();
  }

  function archiveTransactions() {
    if (transactions.length === 0) return;
    archivedTransactions = archivedTransactions.concat(transactions.map(t => ({ ...t, archivedAt: new Date().toISOString() })));
    transactions = [];
    setLocalStorageItem(STORAGE.TRANSACTIONS, transactions);
    setLocalStorageItem(STORAGE.ARCHIVED, archivedTransactions);
    renderTransactions();
    renderArchivedTransactions();
    updateArchiveButtonState();
  }

  function resetEverything() {
    if (!confirm('Are you sure you want to reset everything?')) return;
    localStorage.clear();
    transactions = [];
    archivedTransactions = [];
    loadWhomList();
    if (appHeaderElement) appHeaderElement.textContent = 'Expense Tracker';
    renderTransactions();
    renderArchivedTransactions();
    updateArchiveButtonState();
  }

  // expose for debug if needed
  window.removeTransaction = removeTransaction;

  // listeners
  if (addTransactionBtn) addTransactionBtn.addEventListener('click', addTransaction);
  if (archiveListBtn) archiveListBtn.addEventListener('click', archiveTransactions);
  if (resetEverythingBtn) resetEverythingBtn.addEventListener('click', resetEverything);
  if (amountElement) {
    amountElement.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTransaction(); });
  }

  // initial render
  renderTransactions();
  renderArchivedTransactions();
  updateArchiveButtonState();

  // service worker (unchanged)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('ServiceWorker registered with scope:', reg.scope))
        .catch(err => console.log('ServiceWorker registration failed:', err));
    });
  }
}
