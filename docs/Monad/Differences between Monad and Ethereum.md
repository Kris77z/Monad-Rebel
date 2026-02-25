# Differences between Monad and Ethereum

URL: https://docs.monad.xyz/developer-essentials/differences

note
To take into account these differences, there is a custom [Monad Foundry](/tooling-and-infra/toolkits/monad-foundry) to ensure that your local development environment matches Monad's on-chain behavior.

This list assembles notable behavioral differences between Monad and Ethereum from the perspective of a smart contract developer.

## Virtual Machine

1. Max contract size is 128kb (up from 24.5kb in Ethereum).
2. A few opcodes and precompiles are repriced, to reweight relative scarcities of resources due to Monad optimizations. See [Opcode Pricing](/developer-essentials/opcode-pricing) .
3. The `secp256r1` (P256) verification precompile in [EIP-7951](https://eips.ethereum.org/EIPS/eip-7951) is supported. See [Precompiles](/developer-essentials/precompiles) .

## Transactions

1. Transactions are charged based on gas limit rather than gas usage, i.e. total tokens deducted from the sender's balance is `value + gas_bid * gas_limit` . As discussed in [Gas in Monad](/developer-essentials/gas-pricing) , this is a DOS-prevention measure for asynchronous execution.
2. Consensus and execution utilize the [Reserve Balance](/developer-essentials/reserve-balance) mechanism to ensure that all transactions included in consensus can be paid for. This mechanism places light restrictions on transaction inclusion at consensus time, and defines select conditions under which a transaction will revert at execution time.
3. Due to the Reserve Balance mechanism, you may see transactions in the blockchain which ultimately fail due to trying to spend too much MON relative to account balance. These transactions still pay for gas and are valid transactions whose result is execution reversion. This isn't a protocol difference, as many reverting Ethereum transactions are included in the chain, but it may be different from expectation. [Longer discussion](/developer-essentials/reserve-balance#transactions-that-are-included-but-revert) .
4. Transaction type 3 (EIP-4844 type aka blob transactions) is not supported.
5. There is no global mempool. For efficiency, transactions are forwarded to the next few leadersas described in [Local Mempool](/monad-arch/consensus/local-mempool) .

## EIP-7702 Delegation

1. If an EOA is EIP-7702-delegated, its balance cannot be lowered below 10 MON due to the [Reserve Balance](/developer-essentials/reserve-balance) rules. (If the delegation is removed, dipping below 10 MON is allowed.) [Discussion](/developer-essentials/eip-7702#delegated-eoas-cant-dip-below-10-mon) .
2. If an EOA is EIP-7702-delegated, when it is called as a smart contract, the `CREATE` and `CREATE2` opcodes are banned. [Discussion](/developer-essentials/eip-7702#delegated-contract-code-cannot-call-createcreate2) .

## Historical Data

1. Due to Monad's high throughput, full nodes do not provide access to arbitrary historic state, as this would require too much storage. See [Historical Data](/developer-essentials/historical-data) for a fuller discussion.

## RPC

See: [RPC Differences](/reference/rpc-differences)