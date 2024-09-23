document.addEventListener('DOMContentLoaded', init);

function init() {
    const balanceElement = document.getElementById('balance');
    const listElement = document.getElementById('list');
    const amountElement = document.getElementById('amount');
    const whomElement = document.getElementById('whom');
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const archiveListBtn = document.getElementById('ArchiveListBtn');
    const archivedTotalElement = document.getElementById('archivedTotal');
    const archivedListElement = document.getElementById('archivedList');
    const resetEverythingBtn = document.getElementById('ResetEverythingBtn');

    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let archivedTransactions = JSON.parse(localStorage.getItem('archivedTransactions')) || [];

    const currencyFormatter = new Intl.NumberFormat('en-ZA', {style: 'currency', currency: 'ZAR'});

    function updateLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('archivedTransactions', JSON.stringify(archivedTransactions));
    }

    function addTransactionDOM(transaction, listElement, isArchive = false) {
        const listItem = document.createElement('li');
        const formattedAmount = currencyFormatter.format(Math.abs(transaction.amount));

        listItem.classList.add('list-group-item');

        const date = new Date(transaction.date).toLocaleString();

        listItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center gap-3">
                        <div class="d-flex justify-content-between align-items-center gap-3 w-100">
                            <p class="m-0 fw-bolder" style="font-size: 0.9rem;">${formattedAmount}</p>
                            <p class="m-0 text-secondary" style="font-size: 0.6rem;">${transaction.whom}, ${date}</p>
                        </div>
                        ${!isArchive ? '<button class="btn btn-danger btn-sm px-2 py-0" onclick="removeTransaction(\'' + transaction.id + '\')">-</button>' : ''}
                    </div>
                `;

        listElement.append(listItem);
    }

    function updateBalance() {
        const balance = transactions.reduce((acc, transaction) => acc + transaction.amount, 0);
        balanceElement.innerText = currencyFormatter.format(balance);
    }

    function updateArchivedTotal() {
        const total = archivedTransactions.reduce((acc, transaction) => acc + transaction.amount, 0);
        archivedTotalElement.innerText = currencyFormatter.format(total);
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
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        addTransactionDOM(transaction, listElement);
        updateBalance();
        updateLocalStorage();
        loadTransactions();
        updateArchiveButtonState();

        amountElement.value = '';
        alert(`Amount of ${currencyFormatter.format(amount)} was added successfully.`);
    }

    function generateUUID() {
        var d = new Date().getTime();
        var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16;
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

    function removeTransaction(id) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        updateLocalStorage();
        loadTransactions();
        updateArchiveButtonState();
    }

    function archiveTransactions() {
        archivedTransactions = archivedTransactions.concat(transactions.map(transaction => ({
            ...transaction,
            archivedAt: new Date().toISOString()
        })));
        transactions = [];
        updateLocalStorage();
        loadTransactions();
        loadArchivedTransactions();
        updateArchiveButtonState();
    }

    function loadTransactions() {
        listElement.innerHTML = '';
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        transactions.forEach(transaction => addTransactionDOM(transaction, listElement));
        updateBalance();
    }

    function loadArchivedTransactions() {
        archivedListElement.innerHTML = '';
        archivedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        archivedTransactions.forEach(transaction => addTransactionDOM(transaction, archivedListElement, true));
        updateArchivedTotal();
    }

    function resetEverything() {
        if (confirm('Are you sure you want to reset everything?')) {
            localStorage.clear();
            transactions = [];
            archivedTransactions = [];
            listElement.innerHTML = '';
            archivedListElement.innerHTML = '';
            updateBalance();
            updateArchivedTotal();
            updateArchiveButtonState();
        }
    }

    function updateArchiveButtonState() {
        archiveListBtn.disabled = transactions.length === 0;
    }

    window.removeTransaction = removeTransaction;

    addTransactionBtn.addEventListener('click', addTransaction);
    archiveListBtn.addEventListener('click', archiveTransactions);
    resetEverythingBtn.addEventListener('click', resetEverything);

    amountElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTransaction();
        }
    });

    loadTransactions();
    loadArchivedTransactions();
    updateArchiveButtonState();
}