# Network Information - Testnets

URL: https://docs.monad.xyz/developer-essentials/testnets

## Summary

| Network | Purpose 
| testnet | Primary testnet environment with hundreds of apps deployed 
| tempnet | Transient network subject to resets; used as a sandbox for new features 

## testnet

Testnet Reset
`testnet` was [reset from genesis on 2025-12-16](/developer-essentials/changelog/testnet#v0125-2025-12-16) . Canonical contracts listed below will be redeployed.

| Name | Value 
| Chain ID | `10143` 
| Network Name | `Monad Testnet` 
| Currency Symbol | `MON` 
| RPC URL | see below 
| Block Explorer (MonadVision) | [`https://testnet.monadvision.com`](https://testnet.monadvision.com) 
| Block Explorer (Monadscan) | [`https://testnet.monadscan.com/`](https://testnet.monadscan.com/) 
| Block Explorer (Socialscan) | [`https://monad-testnet.socialscan.io/`](https://monad-testnet.socialscan.io/) 
| Network visualization | [`https://www.gmonads.com/?network=testnet`](https://www.gmonads.com/?network=testnet) 
| App hub | [https://testnet.monad.xyz/](https://testnet.monad.xyz/) 
| Faucet | [https://faucet.monad.xyz](https://faucet.monad.xyz) 
| Current version / revision | [`v0.12.7`](/developer-essentials/changelog/testnet#v0127-2026-01-20) / [`MONAD_EIGHT`](/developer-essentials/changelog/#revisions) 
| Changelog | [(link)](/developer-essentials/changelog/testnet) 

### Public RPC Endpoints

Websocket endpoints start with `wss://` . See [Websocket Reference](/reference/websockets) for further information.

| RPC URL | Provider | Rate Limits | Batch Requests | Archive Support | Notes 
| [https://testnet-rpc.monad.xyz](https://testnet-rpc.monad.xyz)
[wss://testnet-rpc.monad.xyz](wss://testnet-rpc.monad.xyz) | QuickNode | 25 rps | 100 | 鉁� |  
| [https://rpc.ankr.com/monad_testnet](https://rpc.ankr.com/monad_testnet) | Ankr | 300 reqs / 10s

12000 reqs / 10 min | 100 | 鉂� | `debug_*` methods are not allowed 
| [https://rpc-testnet.monadinfra.com](https://rpc-testnet.monadinfra.com)
[wss://rpc-testnet.monadinfra.com](wss://rpc-testnet.monadinfra.com) | Monad Foundation | 20 rps | not allowed | 鉁� |  

See [RPC Limits](/reference/rpc-limits) for additional detail on method-specific limits.

### Canonical Contracts

| Name | Address 
| Wrapped MON | [`0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541`](https://testnet.monadvision.com/address/0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541) 
| CreateX | [`0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed`](https://testnet.monadvision.com/address/0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed) 
| Foundry Deterministic Deployer | [`0x4e59b44847b379578588920ca78fbf26c0b4956c`](https://testnet.monadvision.com/address/0x4e59b44847b379578588920cA78FbF26c0B4956C) 
| [ERC-6492 UniversalSigValidator](https://eips.ethereum.org/EIPS/eip-6492) | [`0xdAcD51A54883eb67D95FAEb2BBfdC4a9a6BD2a3B`](https://testnet.monadvision.com/address/0xdAcD51A54883eb67D95FAEb2BBfdC4a9a6BD2a3B) 
| EntryPoint v0.6 | [`0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`](https://testnet.monadvision.com/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789) 
| EntryPoint v0.7 | [`0x0000000071727De22E5E9d8BAf0edAc6f37da032`](https://testnet.monadvision.com/address/0x0000000071727De22E5E9d8BAf0edAc6f37da032) 
| Multicall3 | [`0xcA11bde05977b3631167028862bE2a173976CA11`](https://testnet.monadvision.com/address/0xcA11bde05977b3631167028862bE2a173976CA11) 
| Permit2 | [`0x000000000022d473030f116ddee9f6b43ac78ba3`](https://testnet.monadvision.com/address/0x000000000022d473030f116ddee9f6b43ac78ba3) 
| SafeSingletonFactory | [`0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7`](https://testnet.monadvision.com/address/0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7) 

#### Safe v1.4.1 Contracts

| Name | Address 
| Safe | [`0x41675C099F32341bf84BFc5382aF534df5C7461a`](https://testnet.monadvision.com/address/0x41675C099F32341bf84BFc5382aF534df5C7461a) 
| SafeL2 | [`0x29fcB43b46531BcA003ddC8FCB67FFE91900C762`](https://testnet.monadvision.com/address/0x29fcB43b46531BcA003ddC8FCB67FFE91900C762) 
| SafeProxyFactory | [`0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67`](https://testnet.monadvision.com/address/0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67) 
| MultiSend | [`0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526`](https://testnet.monadvision.com/address/0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526) 
| MultiSendCallOnly | [`0x9641d764fc13c8B624c04430C7356C1C7C8102e2`](https://testnet.monadvision.com/address/0x9641d764fc13c8B624c04430C7356C1C7C8102e2) 
| CompatibilityFallbackHandler | [`0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99`](https://testnet.monadvision.com/address/0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99) 
| SignMessageLib | [`0xd53cd0aB83D845Ac265BE939c57F53AD838012c9`](https://testnet.monadvision.com/address/0xd53cd0aB83D845Ac265BE939c57F53AD838012c9) 
| CreateCall | [`0x9b35Af71d77eaf8d7e40252370304687390A1A52`](https://testnet.monadvision.com/address/0x9b35Af71d77eaf8d7e40252370304687390A1A52) 
| SimulateTxAccessor | [`0x3d4BA2E0884aa488718476ca2FB8Efc291A46199`](https://testnet.monadvision.com/address/0x3d4BA2E0884aa488718476ca2FB8Efc291A46199) 

### Testnet Tokens (partial list)

See [tokenlist-testnet.json](https://github.com/monad-crypto/token-list/blob/main/tokenlist-testnet.json) .

## tempnet

`tempnet` runs the `devnet` ChainConfig with version `v0.12.3` .

| Name | Value 
| Purpose | Transient network; sandbox for new features. Currently a sandbox for the [Opcode pricing changes](/developer-essentials/opcode-pricing) 
| Chain ID | `20143` 
| RPC URL | Please submit [this form](https://tally.so/r/wLlvlj) . You will need to join the [Monad Developer Discord](https://discord.gg/monaddev) 
| Block Explorer | n/a 
| Faucet | Please submit [this form](https://tally.so/r/wLlvlj) . You will need to join the [Monad Developer Discord](https://discord.gg/monaddev) 
| Current version / revision | [`v0.12.3`](/developer-essentials/changelog/testnet#v0123-2025-12-04) / [`MONAD_EIGHT`](/developer-essentials/changelog/#revisions)