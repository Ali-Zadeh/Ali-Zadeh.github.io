(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.IouLogic = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    function parseAmount(raw) {
        const digits = String(raw).replace(/[^0-9]/g, '');
        if (digits === '') return null;
        const cents = parseInt(digits, 10);
        if (cents <= 0) return null;
        return cents / 100;
    }

    return { parseAmount };
});
