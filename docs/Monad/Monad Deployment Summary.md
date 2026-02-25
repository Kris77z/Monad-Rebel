# Deployment Summary for Developers

URL: https://docs.monad.xyz/developer-essentials/summary

This page summarizes what you need to know when developing or deploying smart contracts for Monad.

## Start with

- [Network Information](/developer-essentials/network-information/) - for RPC & block explorer URLs, and canonical contract deployments.
- [Differences between Monad and Ethereum](/developer-essentials/differences)
- [`protocols` repo](https://github.com/monad-crypto/protocols) (add yours!)
- [`token-list` repo](https://github.com/monad-crypto/token-list) (add yours!)
- [RPC API](/reference/json-rpc/) - an interactive reference

## Supported Tooling & Infra

Here are some of the most commonly-requested tools:

| Tool | Status | Notes 
| [Tenderly](https://dashboard.tenderly.co/explorer) | 鉁� |  
| [Safe](https://app.safe.global) | 鉁� |  
| [Monadscan](https://monadscan.com) (by Etherscan) | 鉁� |  
| [MonadVision](https://monadvision.com) (by Blockvision) | 鉁� |  
| [Foundry](https://getfoundry.sh) | 鉁� | Use the [Monad Foundry](/tooling-and-infra/toolkits/monad-foundry) fork 
| [Viem](https://github.com/wevm/viem) | 鉁� | `viem >= 2.40.0` 

See [Tooling and Infra](/tooling-and-infra/) for a complete list of what is supported, including:

| Category 
| [AA Infra](/tooling-and-infra/wallet-infra/account-abstraction) 
| [Analytics](/tooling-and-infra/analytics) 
| [Block Explorers](/tooling-and-infra/block-explorers) 
| [Cross-Chain](/tooling-and-infra/cross-chain) 
| [Custody](/tooling-and-infra/custody) 
| [Embedded Wallets](/tooling-and-infra/wallet-infra/embedded-wallets) 
| [Indexers - Common Data](/tooling-and-infra/indexers/common-data) (e.g. token balances, transfers, trades) 
| [Indexing Frameworks (incl Subgraphs)](/tooling-and-infra/indexers/indexing-frameworks) 
| [Onramps](/tooling-and-infra/onramps) 
| [Oracles](/tooling-and-infra/oracles) 
| [RPC Providers](/tooling-and-infra/rpc-providers) 

## Accounts

|  |  
| Address space | Same address space as Ethereum (last 20 bytes of ECDSA public key) 
| EIP-7702 | Supported. See [EIP-7702 reference](/developer-essentials/eip-7702) 

## Smart Contracts

For deployment and verification guides, see:

- [Deploy a Contract](/guides/deploy-smart-contract/)
- [Verify a Contract](/guides/verify-smart-contract/)
- [MonadVision verification guide](https://docs.blockvision.org/reference/verify-smart-contract-on-monad-explorer)

|  |  
| Opcodes | All [opcodes](https://www.evm.codes/) as of the Pectra fork are supported. 
| Precompiles | All Ethereum precompiles as of the Pectra fork ( `0x01` to `0x11` ), plus precompile `0x0100` ( [EIP-7951](https://eips.ethereum.org/EIPS/eip-7951) ) are supported. See [Precompiles](/developer-essentials/precompiles) 
| Max contract size | 128 kb (up from 24.5 kb in Ethereum) 

## Transaction types

Full article: [Transactions](/developer-essentials/transactions)

|  |  
| Transaction types | Supported:
- 0 ("legacy")
- 1 ("EIP-2930")
- 2 ("EIP-1559", the "default" on Ethereum)
- 4 ( ["EIP-7702"](/developer-essentials/eip-7702) )
Not supported:
- 3 ("EIP-4844") 

## Gas limits

|  |  
| Per-transaction gas limit | 30M gas 
| Block gas limit | 200M gas 
| Block gas target | 80% (160M gas) 
| Gas throughput | 500M gas/sec (200M gas/block divided by 0.4 sec/block) 

## Gas pricing

Full article: [Gas pricing](/developer-essentials/gas-pricing)

|  |  
| Gas charged | The **gas limit** is what is charged. That is: total tokens deducted from the sender's balance is `value + gas_price * gas_limit` . See [discussion](/developer-essentials/gas-pricing#gas-limit-not-gas-used) . 
| EIP-1559 dynamics | Monad is EIP-1559-compatible; base fee and priority fee work as on Ethereum. [EIP-1559 explainer](/developer-essentials/gas-pricing#eip-1559-compatibility) 
| Base fee | Min base fee of 100 MON-gwei (100 * 10^-9 MON).
The base fee controller is similar to Ethereum's but stays elevated for less time ( [details](/developer-essentials/gas-pricing#base_price_per_gas-controller) ). 

## Opcode pricing

Full article: [Opcode Pricing](/developer-essentials/opcode-pricing)

Opcode pricing is the same as on Ethereum (see: [evm.codes](https://www.evm.codes/) ), **except** for the below repricings needed to reweight relative scarcities of resources due to Monad optimizations.

| Item | Ethereum | Monad | Notes 
| Cold access cost - account | 2,600 | 10,100 | Affected opcodes: `BALANCE` , `EXTCODESIZE` , `EXTCODECOPY` , `EXTCODEHASH` , `CALL` , `CALLCODE` , `DELEGATECALL` , `STATICCALL` , `SELFDESTRUCT`
See [details](/developer-essentials/opcode-pricing#cold-access-cost) 
| Cold access cost - storage | 2,100 | 8,100 | Affected opcodes: `SLOAD` , `SSTORE` . See [details](/developer-essentials/opcode-pricing#cold-access-cost) 
| `ecRecover` , `ecAdd` , `ecMul` , `ecPairing` , `blake2f` , `point_eval` precompiles |  |  | See [details](/developer-essentials/opcode-pricing#precompiles)

Precompiles `0x01` , `0x06` , `0x07` , `0x08` , `0x09` , `0x0a` 

## Timing considerations

|  |  
| Block frequency | 400 ms 
| `TIMESTAMP` opcode | As in Ethereum, `TIMESTAMP` is a second-granularity unix timestamp. Since blocks are every 400 ms, this means that 2-3 blocks will likely have the same timestamp. 
| Finality | Blocks are finalized after two blocks (800 ms). Once a block is finalized, it cannot be reorged. See [MonadBFT](/monad-arch/consensus/monad-bft) for a fuller discussion. 
| Speculative finality | Blocks can be [speculatively finalized](/monad-arch/consensus/monad-bft#speculative-finality) after one block (400 ms), when it is marked as being in the `Voted` stage.

Speculative finality can revert under very rare circumstances (see fuller discussion [here](/monad-arch/consensus/monad-bft#speculative-finality) ), but most frontends should be able to reflect state based on speculative finality. 

## Mempool

Full article: [Local Mempool](/monad-arch/consensus/local-mempool)

Monad does not have a global mempool, as this approach is not suitable for high-performance blockchains.

Each validator maintains a local mempool with transactions that it is aware of. When an RPC receives a transaction, it forwards it strategically to upcoming leaders, repeating this process if it doesn't observe the transaction getting included.

Although this is an important part of Monad's design, it is not one that should generally affect smart contract developers in their system designs.

## Parallel Execution and JIT Compilation

Monad utilizes [parallel execution](/monad-arch/execution/parallel-execution) and [JIT compilation](/monad-arch/execution/native-compilation) for efficiency, but smart contract developers don't need to change anything to account for this.

In Monad, transactions are still linearly ordered, and the only correct outcome of execution is the result as if the transactions were serially executed. All aspects of parallel execution can be treated by smart contract developers as implementation details. See [further discussion](/monad-arch/execution/parallel-execution) .

## Asynchronous Execution

Full article: [Asynchronous Execution](/monad-arch/consensus/asynchronous-execution)

Monad utilizes asynchronous execution for efficiency, but most developers shouldn't need to change anything.

Developers with significant off-chain financial logic (e.g. exchanges, bridges, and stablecoin/RWA issuers) should wait until blocks reach the [`Verified`](/monad-arch/consensus/block-states#verified) phase (aka state root finality), three blocks later than [`Finalized`](/monad-arch/consensus/block-states#finalized) , to be sure that the entire network agrees with their own node's local execution of a finalized block.

Async execution and block stages Asynchronous execution is a technique that allows Monad to substantially increase execution throughput by decoupling consensus from execution. In asynchronous execution, validators **vote first, execute later** - because once the transaction order is determined, the state is determined. Afterward, each node executes locally. There is a [delayed merkle root](/monad-arch/consensus/asynchronous-execution#delayed-merkle-root) three blocks later which confirms that the network got the same state trie as local execution.

From the developer perspective:

- Someone submits a transaction through your frontend which interacts with your smart contract. You make note of the hash.
- The transaction gets included in a block.
- The block gets [`Voted`](/monad-arch/consensus/block-states#voted) (speculatively finalized) one block later. ( `T+1` )
- The block gets [`Finalized`](/monad-arch/consensus/block-states#finalized) one block later ( `T+2` )
- The block gets [`Verified`](/monad-arch/consensus/block-states#verified) (state root finalized) three blocks later ( `T+5` )
You listen for transaction receipts by calling [`eth_getTransactionReceipt`](/reference/json-rpc/eth_getTransactionReceipt) . Receipts will first be available after a block becomes `Voted` (speculatively finalized).

Your choice of when to update your UI to give feedback to the user depends on risk preference, but for most applications it is reasonable to do so when the block becomes `Voted` because speculative finality reversion is extremely rare. A more conservative approach would be to wait until the block is `Finalized` , since then you will never have to handle a reorg. Waiting until `Verified` is not generally necessary (except for the aforementioned developers with off-chain financial logic).

## Reserve balance

Full article: [Reserve Balance](/developer-essentials/reserve-balance)

Monad introduces the Reserve Balance mechanism to enable Asynchronous Execution.

The Reserve Balance mechanism places light restrictions on when transactions can be included at consensus time, and imposes some conditions under which transactions will revert at execution time.

The Reserve Balance mechanism is designed to preserve safety under asynchronous execution without interfering with normal usage patterns. Most users and developers need not worry about the Reserve Balance constraints.

| Parameter | Value 
| Default reserve balance | 10 MON 

## EIP-7702

EIP-7702 is supported; see the full notes [here](/developer-essentials/eip-7702) .

There are two caveats:

1. If an EOA is EIP-7702-delegated, its balance cannot be lowered below 10 MON due to the [Reserve Balance](/developer-essentials/reserve-balance) rules. (If the delegation is removed, dipping below 10 MON is allowed.) [Discussion](/developer-essentials/eip-7702#delegated-eoas-cant-dip-below-10-mon) .
2. If an EOA is EIP-7702-delegated, when it is called as a smart contract, the `CREATE` and `CREATE2` opcodes are banned. [Discussion](/developer-essentials/eip-7702#delegated-contract-code-cannot-call-createcreate2) .

## Reading blockchain data

The following methods are supported for reading blockchain data:

|  |  
| JSON-RPC | See [RPC API](/reference/json-rpc) . Monad supports all standard RPC methods from Ethereum. Differences are noted in [RPC Differences](/reference/rpc-differences) . For rate limits, see [here](/reference/rpc-limits) . 
| WebSocket | See the [WebSocket Guide](/reference/websockets) .

Monad implements the `eth_subscribe` method with the following subscription types:
- `newHeads` and `logs` (for Geth-style subscriptions that wait for finalization)
- `monadNewHeads` and `monadLogs` (similar, but published as soon as the proposal is received)
The `syncing` and `newPendingTransactions` subscription types are not supported. For more details see [Real-time Data Sources](/monad-arch/realtime-data/data-sources) . 
| Execution Events | See [Execution Events](/execution-events/) .

The Execution Events system allows developers to build high-performance applications that receive lowest-latency event data from a Monad node via shared memory queue. 

You can also use the supported [Indexers](/tooling-and-infra/indexers/) .

## Historic data

Monad full nodes provide access to all historic ledger data (blocks, transactions, receipts, events, and traces). Monad full nodes do not provide access to arbitrary historic state as discussed [here](/developer-essentials/historical-data) .

There is a special RPC service at [`https://rpc-mainnet.monadinfra.com`](https://rpc-mainnet.monadinfra.com) that provides access to historical data.

## Recommended Open Source Tooling Versions

- `foundry` : use the [Monad Foundry](/tooling-and-infra/toolkits/monad-foundry) fork, which incorporates Monad gas pricing and precompiles
- `viem >= 2.40.0` (just to bring in [monad.ts](https://github.com/wevm/viem/blob/main/src/chains/definitions/monad.ts) )
- `alloy-chains >= 0.2.20`

## Canonical contract addresses

See [Canonical Contracts](/developer-essentials/network-information/#canonical-contracts-on-testnet)

## Source code

- [`monad-bft`](https://github.com/category-labs/monad-bft) (consensus)
- [`monad`](https://github.com/category-labs/monad) (execution)

## Running a full node

See [Node Operations](/node-ops/)

## Need Help?

Please ask in the [developer discord](https://discord.gg/monaddev) . We are here to help!