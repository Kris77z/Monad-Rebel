# JSON-RPC API

URL: https://docs.monad.xyz/reference/json-rpc/

This section provides an interactive reference for the Monad's JSON-RPC API. For a simple example, try [getting the latest block](/reference/json-rpc/eth_getBlockByNumber?block_number=latest&return_full_txns=false) .

## Debug methods

- [`debug_getRawBlock`](/reference/json-rpc/debug_getRawBlock) - returns an RLP-encoded block
- [`debug_getRawHeader`](/reference/json-rpc/debug_getRawHeader) - returns an RLP-encoded header
- [`debug_getRawReceipts`](/reference/json-rpc/debug_getRawReceipts) - returns an array of EIP-2718 binary-encoded receipts
- [`debug_getRawTransaction`](/reference/json-rpc/debug_getRawTransaction) - returns an EIP-2718 binary-encoded transaction
- [`debug_traceBlockByHash`](/reference/json-rpc/debug_traceBlockByHash) - returns the tracing result by executing all transactions in the block; supports callTracer or prestateTracer
- [`debug_traceBlockByNumber`](/reference/json-rpc/debug_traceBlockByNumber) - same
- [`debug_traceCall`](/reference/json-rpc/debug_traceCall) - returns the tracing result by executing an `eth_call`
- [`debug_traceTransaction`](/reference/json-rpc/debug_traceTransaction) - returns all the traces of a given transaction

## Eth methods

- [`eth_blockNumber`](/reference/json-rpc/eth_blockNumber) - returns the most recent block number
- [`eth_call`](/reference/json-rpc/eth_call) - simulates calling a smart contract without writing a transaction
- [`eth_chainId`](/reference/json-rpc/eth_chainId) - returns the chainId in hex
- [`eth_createAccessList`](/reference/json-rpc/eth_createAccessList) - returns an access list containing all addresses and storage slots accessed during a simulated transaction
- [`eth_estimateGas`](/reference/json-rpc/eth_estimateGas) - estimates the gasLimit for a smart contract call to run successfully, using simulation and binary search
- [`eth_feeHistory`](/reference/json-rpc/eth_feeHistory) - returns transaction base fee per gas and effective priority fee per gas for the block range
- [`eth_gasPrice`](/reference/json-rpc/eth_gasPrice) - returns the current price per gas in MON-wei in hex
- [`eth_getBalance`](/reference/json-rpc/eth_getBalance) - returns the balance of an account in MON-wei in hex
- [`eth_getBlockByHash`](/reference/json-rpc/eth_getBlockByHash) - returns a block
- [`eth_getBlockByNumber`](/reference/json-rpc/eth_getBlockByNumber) - returns a block
- [`eth_getBlockReceipts`](/reference/json-rpc/eth_getBlockReceipts) - returns the receipts of a block
- [`eth_getBlockTransactionCountByHash`](/reference/json-rpc/eth_getBlockTransactionCountByHash) - returns the number of transactions in a block
- [`eth_getBlockTransactionCountByNumber`](/reference/json-rpc/eth_getBlockTransactionCountByNumber) - returns the number of transactions in a block
- [`eth_getCode`](/reference/json-rpc/eth_getCode) - returns the code at this address
- [`eth_getLogs`](/reference/json-rpc/eth_getLogs) - returns an array of all logs matching an address or topic
- [`eth_getStorageAt`](/reference/json-rpc/eth_getStorageAt) - returns the value at a particular storage slot for a particular address
- [`eth_getTransactionByBlockHashAndIndex`](/reference/json-rpc/eth_getTransactionByBlockHashAndIndex) - returns a transaction
- [`eth_getTransactionByBlockNumberAndIndex`](/reference/json-rpc/eth_getTransactionByBlockNumberAndIndex) - returns a transaction
- [`eth_getTransactionByHash`](/reference/json-rpc/eth_getTransactionByHash) - returns a transaction
- [`eth_getTransactionCount`](/reference/json-rpc/eth_getTransactionCount) - returns the nonce of an address
- [`eth_getTransactionReceipt`](/reference/json-rpc/eth_getTransactionReceipt) - returns the receipt for a transaction
- [`eth_maxPriorityFeePerGas`](/reference/json-rpc/eth_maxPriorityFeePerGas) - returns the current `maxPriorityFeePerGas` in MON-wei
- [`eth_sendRawTransaction`](/reference/json-rpc/eth_sendRawTransaction)
- `eth_sendRawTransactionSync` - [EIP-7966](https://eips.ethereum.org/EIPS/eip-7966) synchronous transaction submission; waits for transaction to be included in a block before returning (available in v0.12.3+)
- [`eth_syncing`](/reference/json-rpc/eth_syncing) - indicates if node is currently syncing (RPC providers should ensure no node that returns true for this call is serving users)

## Other methods

- [`admin_ethCallStatistics`](/reference/json-rpc/admin_ethCallStatistics) - ignore, for internal purposes
- [`net_version`](/reference/json-rpc/net_version) - always returns the chain id
- [`txpool_statusByAddress`](/reference/json-rpc/txpool_statusByAddress) - returns the status of pending transactions this RPC server is aware of from this sender. Since there is [no global mempool](/monad-arch/consensus/local-mempool) , the RPC would typically be aware of a transaction because it was submitted through this RPC
- [`txpool_statusByHash`](/reference/json-rpc/txpool_statusByHash) - returns the status of pending transactions this RPC is aware of with this hash
- [`web3_clientVersion`](/reference/json-rpc/web3_clientVersion) - returns the Monad version