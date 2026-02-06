export const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    // Using pt-BR locale as a shortcut for dots as thousand separators
    return Math.floor(num).toLocaleString('pt-BR');
};

export const formatSilver = (num) => {
    if (num === null || num === undefined) return '0';

    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + 'B';
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }

    return formatNumber(num);
};
