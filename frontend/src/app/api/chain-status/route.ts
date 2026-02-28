import { NextResponse } from 'next/server';

const MONAD_RPC = 'https://testnet-rpc.monad.xyz';

/**
 * Proxy endpoint for Monad RPC calls.
 * Avoids browser CORS issues when calling the RPC directly.
 */
export async function GET() {
    try {
        const [blockRes, gasRes] = await Promise.all([
            fetch(MONAD_RPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
            }),
            fetch(MONAD_RPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 2 }),
            }),
        ]);

        const blockJson = await blockRes.json();
        const gasJson = await gasRes.json();

        const blockNumber = typeof blockJson.result === 'string'
            ? parseInt(blockJson.result, 16)
            : null;
        const gasWei = typeof gasJson.result === 'string'
            ? parseInt(gasJson.result, 16)
            : null;

        return NextResponse.json({
            blockNumber,
            gasGwei: gasWei !== null ? (gasWei / 1e9).toFixed(2) : null,
        });
    } catch {
        // Monad Testnet RPC is often unstable/rate-limited. 
        // Returning 200 with null values prevents the frontend terminal from spamming 502 errors.
        return NextResponse.json({ blockNumber: null, gasGwei: null });
    }
}
