document.addEventListener('DOMContentLoaded', init);

function init() {
    // Constants for DOM element IDs
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
    };

    // DOM Elements
    const balanceElement = document.getElementById(ELEMENT_IDS.BALANCE);
    const listElement = document.getElementById(ELEMENT_IDS.LIST);
    const amountElement = document.getElementById(ELEMENT_IDS.AMOUNT);
    const whomElement = document.getElementById(ELEMENT_IDS.WHOM);
    const addTransactionBtn = document.getElementById(ELEMENT_IDS.ADD_TRANSACTION);
    const archiveListBtn = document.getElementById(ELEMENT_IDS.ARCHIVE_LIST);
    const archivedTotalElement = document.getElementById(ELEMENT_IDS.ARCHIVED_TOTAL);
    const archivedListElement = document.getElementById(ELEMENT_IDS.ARCHIVED_LIST);
    const resetEverythingBtn = document.getElementById(ELEMENT_IDS.RESET_ALL);

    // Transactions Data
    let transactions = getLocalStorageItem('transactions', []);
    let archivedTransactions = getLocalStorageItem('archivedTransactions', []);

    // Formatter
    const currencyFormatter = new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR'
    });

    /**
     * Utility Functions
     */

    function getLocalStorageItem(key, defaultValue) {
        return JSON.parse(localStorage.getItem(key)) || defaultValue;
    }

    function setLocalStorageItem(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function generateUUID() {
        let d = new Date().getTime();
        let d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
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

    function formatCurrency(amount) {
        return currencyFormatter.format(amount);
    }

    function sortTransactionsByDate(transactions) {
        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * UI Update Functions
     */

    function updateDOMElementText(element, text) {
        element.innerText = text;
    }

    function clearDOMElementContent(element) {
        element.innerHTML = '';
    }

    function appendTransactionToDOM(transaction, listElement, isArchive = false) {
        const listItem = document.createElement('li');
        const formattedAmount = formatCurrency(Math.abs(transaction.amount));
        const date = new Date(transaction.date).toLocaleString();

        listItem.classList.add('list-group-item');
        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center gap-3">
                <div class="d-flex justify-content-between align-items-center gap-3 w-100">
                    <p class="m-0 fw-bolder" style="font-size: 0.9rem;">${formattedAmount}</p>
                    <p class="m-0 text-secondary" style="font-size: 0.6rem;">${transaction.whom}, ${date}</p>
                </div>
                ${!isArchive ? `<button class="btn btn-danger btn-sm px-2 py-0" onclick="removeTransaction('${transaction.id}')">-</button>` : ''}
            </div>
        `;

        listElement.append(listItem);
    }

    function renderTransactions() {
        clearDOMElementContent(listElement);
        sortTransactionsByDate(transactions).forEach(transaction => appendTransactionToDOM(transaction, listElement));
        updateDOMElementText(balanceElement, formatCurrency(getTotalBalance(transactions)));
    }

    function renderArchivedTransactions() {
        clearDOMElementContent(archivedListElement);
        sortTransactionsByDate(archivedTransactions).forEach(transaction => appendTransactionToDOM(transaction, archivedListElement, true));
        updateDOMElementText(archivedTotalElement, formatCurrency(getTotalBalance(archivedTransactions)));
    }

    /**
     * Business Logic Functions
     */

    function getTotalBalance(transactions) {
        return transactions.reduce((acc, transaction) => acc + transaction.amount, 0);
    }

    function addTransaction() {
        const amount = parseFloat(amountElement.value);
        if (isNaN(amount) || amount === 0) {
            alert('Please enter a valid amount');
            return;
        }

        const transaction = {
            id: generateUUID(),
            amount: amount,
            whom: whomElement.value,
            date: new Date().toISOString()
        };

        transactions.push(transaction);
        setLocalStorageItem('transactions', transactions);
        renderTransactions();
        updateArchiveButtonState();
        amountElement.value = '';
        alert(`Amount of ${formatCurrency(amount)} was added successfully.`);
    }

    function removeTransaction(id) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        setLocalStorageItem('transactions', transactions);
        renderTransactions();
        updateArchiveButtonState();
    }

    function archiveTransactions() {
        archivedTransactions = archivedTransactions.concat(transactions.map(transaction => ({
            ...transaction,
            archivedAt: new Date().toISOString()
        })));
        transactions = [];
        setLocalStorageItem('transactions', transactions);
        setLocalStorageItem('archivedTransactions', archivedTransactions);
        renderTransactions();
        renderArchivedTransactions();
        updateArchiveButtonState();
    }

    function resetEverything() {
        if (confirm('Are you sure you want to reset everything?')) {
            localStorage.clear();
            transactions = [];
            archivedTransactions = [];
            renderTransactions();
            renderArchivedTransactions();
            updateArchiveButtonState();
        }
    }

    function updateArchiveButtonState() {
        archiveListBtn.disabled = transactions.length === 0;
    }

    // Expose removeTransaction to the window object
    window.removeTransaction = removeTransaction;

    // Event Listeners
    addTransactionBtn.addEventListener('click', addTransaction);
    archiveListBtn.addEventListener('click', archiveTransactions);
    resetEverythingBtn.addEventListener('click', resetEverything);
    amountElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTransaction();
        }
    });

    // Initial Rendering of Transactions
    renderTransactions();
    renderArchivedTransactions();
    updateArchiveButtonState();


    /**
     * serviceWorker
     */
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }
}