export const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    // Using pt-BR locale as a shortcut for dots as thousand separators
    return Math.floor(num).toLocaleString('pt-BR');
};

export const formatSilver = (num) => {
    if (num === null || num === undefined) return '0';
    return formatNumber(num);
};
