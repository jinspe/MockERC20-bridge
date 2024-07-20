## Gelato web3 functions

This repository contains implementations of Gelato Web3 functions used to listen for blockchain events. Specifically, these events are from the MockERC20 contracts deployed on Arbitrum Sepolia and Optimism Sepolia.

`erc20-bridge`:\
This function is triggered when a burn event is received on Arbitrum Sepolia or Optimism Sepolia. It mints the same amount of tokens on the other chain to the user who initiated the burn.

The function used secrets (environment variables) to define which chain the function is listening to and which chain it is minting to.

### Additional Resources

Other example of web3-function implementations: https://github.com/gelatodigital/web3-functions-hardhat-template/tree/master

Documentation: https://docs.gelato.network/web3-services/web3-functions
