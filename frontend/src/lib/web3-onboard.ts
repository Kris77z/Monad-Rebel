import Onboard from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import walletConnectModule from '@web3-onboard/walletconnect';

/**
 * Monad Testnet chain definition for web3-onboard.
 */
const MONAD_TESTNET = {
    id: 10143,
    token: 'MON',
    label: 'Monad Testnet',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
};

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '';

const injected = injectedModule();
const walletConnect = walletConnectModule({
    projectId,
    requiredChains: [MONAD_TESTNET.id],
    dappUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://rebel-agent-mesh.xyz',
});

/**
 * Single onboard instance shared across the app.
 * Call `onboard.connectWallet()` to trigger the modal.
 */
export const onboard = Onboard({
    wallets: [injected, walletConnect],
    chains: [MONAD_TESTNET],
    appMetadata: {
        name: 'Agora Mesh',
        description: 'Autonomous Agent Economy on Monad',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#2B180A"/><text x="16" y="22" text-anchor="middle" fill="#FCF6EF" font-size="16" font-weight="bold">A</text></svg>',
    },
    connect: {
        autoConnectLastWallet: true,
    },
    accountCenter: {
        desktop: { enabled: false },
        mobile: { enabled: false },
    },
});
