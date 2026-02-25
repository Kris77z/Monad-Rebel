'use client';

import { Blocks, Clock, Fuel, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

/** Monad testnet RPC endpoint */
const MONAD_RPC = 'https://testnet-rpc.monad.xyz';

interface ChainData {
    blockNumber: number | null;
    gasPrice: string | null;
    connected: boolean;
}

/** Fetch chain data via local API proxy (avoids CORS) */
async function fetchChainStatus(): Promise<{ blockNumber: number | null; gasGwei: string | null }> {
    // Try local proxy first, fallback to direct RPC
    try {
        const res = await fetch('/api/chain-status');
        if (res.ok) return await res.json();
    } catch { /* fallback below */ }

    // Direct RPC fallback
    const call = async (method: string) => {
        const res = await fetch(MONAD_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method, params: [], id: 1 }),
        });
        return (await res.json()).result;
    };
    const [blockHex, gasPriceHex] = await Promise.all([call('eth_blockNumber'), call('eth_gasPrice')]);
    return {
        blockNumber: typeof blockHex === 'string' ? parseInt(blockHex, 16) : null,
        gasGwei: typeof gasPriceHex === 'string' ? (parseInt(gasPriceHex, 16) / 1e9).toFixed(2) : null,
    };
}

/** Format large numbers with commas */
function formatNumber(n: number): string {
    return n.toLocaleString('en-US');
}

/**
 * Terminal-style chain status footer.
 * Polls Monad testnet RPC for real block number & gas price.
 */
export function ChainStatusBar() {
    const [data, setData] = useState<ChainData>({
        blockNumber: null,
        gasPrice: null,
        connected: false,
    });

    const fetchChainData = useCallback(async () => {
        try {
            const res = await fetchChainStatus();
            setData({
                blockNumber: res.blockNumber,
                gasPrice: res.gasGwei,
                connected: res.blockNumber !== null,
            });
        } catch {
            setData((prev) => ({ ...prev, connected: false }));
        }
    }, []);

    useEffect(() => {
        fetchChainData();
        const interval = setInterval(fetchChainData, 12_000); // poll every 12s
        return () => clearInterval(interval);
    }, [fetchChainData]);

    return (
        <footer className="border-t border-border bg-card px-4 py-1.5 relative overflow-hidden">
            {/* Monad pulse sweep */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-monad-pulse" />
            </div>

            <div className="relative flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <Blocks className="w-3 h-3" />
                        <span>
                            block #<span className="text-foreground">
                                {data.blockNumber !== null ? formatNumber(data.blockNumber) : '...'}
                            </span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>~400ms</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Fuel className="w-3 h-3" />
                        <span>
                            gas: <span className="text-foreground">
                                {data.gasPrice !== null ? `${data.gasPrice} gwei` : '...'}
                            </span>
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {data.connected ? (
                        <>
                            <Wifi className="w-3 h-3 text-green-500" />
                            <span>connected to monad testnet</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-3 h-3 text-red-500" />
                            <span className="text-red-500">disconnected</span>
                        </>
                    )}
                </div>
            </div>
        </footer>
    );
}
