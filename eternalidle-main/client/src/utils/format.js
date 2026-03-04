export const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    // Using pt-BR locale as a shortcut for dots as thousand separators
    return Math.floor(num).toLocaleString('pt-BR');
};

export const formatCompactNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return formatNumber(num);
};

export const formatSilver = (num, abbreviate = false) => {
    if (!num) return '0';
    if (!abbreviate) return formatNumber(num);
    return formatCompactNumber(num);
};

