document.addEventListener('DOMContentLoaded', init);

function init() {
    const balanceElement = document.getElementById('balance');
    const listElement = document.getElementById('list');
    const amountElement = document.getElementById('amount');
    const addTransactionBtn = document.getElementById('addTransactionBtn');

    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    function updateLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    function addTransactionDOM(transaction) {
        const listItem = document.createElement('li');
        const sign = transaction.amount < 0 ? '-' : '+';
        const absAmount = Math.abs(transaction.amount).toFixed(2);
        const transactionClass = transaction.amount < 0 ? 'list-group-item-danger' : 'list-group-item-success';

        listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', transactionClass);

        const date = new Date(transaction.date).toLocaleString();

        listItem.innerHTML = `
            ${sign}R${absAmount} <small>(${date})</small>
            <button class="btn btn-danger btn-sm" onclick="removeTransaction('${transaction.id}')">x</button>
        `;

        listElement.appendChild(listItem);
    }

    function updateBalance() {
        const balance = transactions.reduce((acc, transaction) => acc + transaction.amount, 0);
        balanceElement.innerText = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(balance);
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
            date: new Date().toISOString()
        };

        transactions.push(transaction);
        addTransactionDOM(transaction);
        updateBalance();
        updateLocalStorage();

        amountElement.value = '';
    }

    function generateUUID() {
        var d = new Date().getTime();
        var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
    }

    window.removeTransaction = removeTransaction; // Make the function global

    addTransactionBtn.addEventListener('click', addTransaction);

    function loadTransactions() {
        listElement.innerHTML = '';
        transactions.forEach(addTransactionDOM);
        updateBalance();
    }

    loadTransactions();
}