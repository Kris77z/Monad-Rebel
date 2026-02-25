# Network Information - Mainnet

URL: https://docs.monad.xyz/developer-essentials/network-information/

| Name | Value 
| Network Name | `Monad Mainnet` 
| Chain ID | `143` 
| Currency Symbol | `MON` 
| RPC URL | see below 
| Block Explorer (MonadVision) | [`https://monadvision.com`](https://monadvision.com) 
| Block Explorer (Monadscan) | [`https://monadscan.com`](https://monadscan.com) 
| Block Explorer (Socialscan) | [`https://monad.socialscan.io`](https://monad.socialscan.io) 
| Network Visualization | [`https://gmonads.com`](https://gmonads.com) 
| Current version / revision | [`v0.12.7`](/developer-essentials/changelog/releases#v0127) / [`MONAD_EIGHT`](/developer-essentials/changelog/#revisions) 

Other [block explorers](/tooling-and-infra/block-explorers) supported:

- Detailed traces: [Phalcon Explorer](https://blocksec.com/explorer) and [Tenderly](https://dashboard.tenderly.co/explorer)
- UserOps: [Jiffyscan](https://jiffyscan.xyz/?network=monad)

### Public RPC Endpoints

Public RPC endpoints are rate-limited but should be sufficient for basic usage. If you need a higher-limit RPC endpoint, please see [RPC Providers](/tooling-and-infra/rpc-providers) .

Websocket endpoints start with `wss://` . See [Websocket Reference](/reference/websockets) for further information.

| RPC URL | Provider | Rate Limits | Batch Call Limit | Notes 
| [`https://rpc.monad.xyz`](https://rpc.monad.xyz)
[`wss://rpc.monad.xyz`](wss://rpc.monad.xyz) | QuickNode | 25 rps | 100 |  
| [`https://rpc1.monad.xyz`](https://rpc1.monad.xyz)
[`wss://rpc1.monad.xyz`](wss://rpc1.monad.xyz) | Alchemy | 15 rps | 100 | `debug_` and `trace_` methods disabled 
| [`https://rpc2.monad.xyz`](https://rpc2.monad.xyz)
[`wss://rpc2.monad.xyz`](wss://rpc2.monad.xyz) | Goldsky Edge | 300 per 10s | 10 | historical state lookups (e.g. `eth_call` ) supported; see [discussion](/developer-essentials/historical-data) 
| [`https://rpc3.monad.xyz`](https://rpc3.monad.xyz)
[`wss://rpc3.monad.xyz`](wss://rpc3.monad.xyz) | Ankr | 300 per 10s | 10 | `debug_` methods disabled 
| [`https://rpc-mainnet.monadinfra.com`](https://rpc-mainnet.monadinfra.com)
[`wss://rpc-mainnet.monadinfra.com`](wss://rpc-mainnet.monadinfra.com) | MF | 20 rps | 1 | historical state lookups (e.g. `eth_call` ) supported; see [discussion](/developer-essentials/historical-data) 

See [RPC Limits](/reference/rpc-limits) for additional detail on method-specific limits.

### Supported Infrastructure

See the [Tooling and Infrastructure](/tooling-and-infra/) page for a list of providers supporting mainnet.

### Canonical Contracts

| Name | Address 
| Wrapped MON | [`0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`](https://monadvision.com/address/0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A) 
| [Create2Deployer](https://github.com/pcaversaccio/create2deployer) | [`0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2`](https://monadvision.com/address/0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2) 
| [CreateX](https://github.com/pcaversaccio/createx) | [`0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed`](https://monadvision.com/address/0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed) 
| [ERC-2470 Singleton Factory](https://eips.ethereum.org/EIPS/eip-2470) | [`0xce0042b868300000d44a59004da54a005ffdcf9f`](https://monadvision.com/address/0xce0042b868300000d44a59004da54a005ffdcf9f) 
| [ERC-4337 EntryPoint v0.6](https://github.com/eth-infinitism/account-abstraction/blob/v0.6.0/contracts/core/EntryPoint.sol) | [`0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`](https://monadvision.com/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789) 
| [ERC-4337 SenderCreator v0.6](https://github.com/eth-infinitism/account-abstraction/blob/v0.6.0/contracts/core/SenderCreator.sol) | [`0x7fc98430eAEdbb6070B35B39D798725049088348`](https://monadvision.com/address/0x7fc98430eAEdbb6070B35B39D798725049088348) 
| [ERC-4337 EntryPoint v0.7](https://github.com/eth-infinitism/account-abstraction/releases) | [`0x0000000071727De22E5E9d8BAf0edAc6f37da032`](https://monadvision.com/address/0x0000000071727De22E5E9d8BAf0edAc6f37da032) 
| [ERC-4337 SenderCreator v0.7](https://github.com/eth-infinitism/account-abstraction/blob/v0.7.0/contracts/core/SenderCreator.sol) | [`0xEFC2c1444eBCC4Db75e7613d20C6a62fF67A167C`](https://monadvision.com/address/0xEFC2c1444eBCC4Db75e7613d20C6a62fF67A167C) 
| [ERC-6492 UniversalSigValidator](https://eips.ethereum.org/EIPS/eip-6492) | [`0xdAcD51A54883eb67D95FAEb2BBfdC4a9a6BD2a3B`](https://monadvision.com/address/0xdAcD51A54883eb67D95FAEb2BBfdC4a9a6BD2a3B) 
| [Foundry Deterministic Deployer](https://getfoundry.sh/guides/deterministic-deployments-using-create2/) | [`0x4e59b44847b379578588920ca78fbf26c0b4956c`](https://monadvision.com/address/0x4e59b44847b379578588920ca78fbf26c0b4956c) 
| [Multicall3](https://www.multicall3.com/) | [`0xcA11bde05977b3631167028862bE2a173976CA11`](https://monadvision.com/address/0xcA11bde05977b3631167028862bE2a173976CA11) 
| [MultiSend](https://github.com/safe-fndn/safe-smart-account/blob/v1.3.0/contracts/libraries/MultiSend.sol) | [`0x998739BFdAAdde7C933B942a68053933098f9EDa`](https://monadvision.com/address/0x998739BFdAAdde7C933B942a68053933098f9EDa) 
| [MultiSendCallOnly](https://github.com/safe-fndn/safe-smart-account/blob/v1.3.0/contracts/libraries/MultiSendCallOnly.sol) | [`0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B`](https://monadvision.com/address/0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B) 
| [Permit2](https://github.com/Uniswap/permit2) | [`0x000000000022d473030f116ddee9f6b43ac78ba3`](https://monadvision.com/address/0x000000000022d473030f116ddee9f6b43ac78ba3) 
| [Safe](https://github.com/safe-fndn/safe-smart-account/blob/v1.3.0/contracts/GnosisSafe.sol) | [`0x69f4D1788e39c87893C980c06EdF4b7f686e2938`](https://monadvision.com/address/0x69f4D1788e39c87893C980c06EdF4b7f686e2938) 
| [SafeL2](https://github.com/safe-fndn/safe-smart-account/blob/v1.3.0/contracts/GnosisSafeL2.sol) | [`0xfb1bffC9d739B8D520DaF37dF666da4C687191EA`](https://monadvision.com/address/0xfb1bffC9d739B8D520DaF37dF666da4C687191EA) 
| [SafeSingletonFactory](https://github.com/safe-fndn/safe-singleton-factory/blob/main/source/deterministic-deployment-proxy.yul) | [`0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7`](https://monadvision.com/address/0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7) 
| [SimpleAccount](https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/accounts/SimpleAccount.sol) | [`0x68641DE71cfEa5a5d0D29712449Ee254bb1400C2`](https://monadvision.com/address/0x68641DE71cfEa5a5d0D29712449Ee254bb1400C2) 
| [Simple7702Account](https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/accounts/Simple7702Account.sol) | [`0xe6Cae83BdE06E4c305530e199D7217f42808555B`](https://monadvision.com/address/0xe6Cae83BdE06E4c305530e199D7217f42808555B) 
| [Sub Zero VanityMarket](https://github.com/Philogy/sub-zero-contracts) | [`0x000000000000b361194cfe6312EE3210d53C15AA`](https://monadvision.com/address/0x000000000000b361194cfe6312EE3210d53C15AA) 
| [Zoltu Deterministic Deployment Proxy](https://github.com/Zoltu/deterministic-deployment-proxy) | [`0x7A0D94F55792C434d74a40883C6ed8545E406D12`](https://monadvision.com/address/0x7A0D94F55792C434d74a40883C6ed8545E406D12) 

### Ecosystem contract addresses

See the [protocols](https://github.com/monad-crypto/protocols) repo.

### Tokens

See [Tokens and Bridges](/developer-essentials/network-information/tokens-and-bridges) or the [token-list](https://github.com/monad-crypto/token-list) repo.