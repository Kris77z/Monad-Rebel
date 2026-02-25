/**
 * Convert a wei-denominated value to human-readable MON string.
 * 1 MON = 10^18 wei.
 *
 * @example formatMON('10000000000000000') => '0.01'
 * @example formatMON('1000000000000000000') => '1'
 */
export function formatMON(weiValue: string | number | undefined | null): string {
    if (weiValue === undefined || weiValue === null || weiValue === '') return '--';

    const wei = Number(weiValue);
    if (!Number.isFinite(wei) || wei === 0) return '0';

    const mon = wei / 1e18;

    if (mon >= 1) return mon.toFixed(2);
    if (mon >= 0.001) return mon.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    return mon.toPrecision(3);
}

/**
 * Shorten a hex address for display.
 * @example shortenAddress('0x1234567890abcdef') => '0x1234…cdef'
 */
export function shortenAddress(addr: string, chars = 4): string {
    if (addr.length <= chars * 2 + 2) return addr;
    return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}
