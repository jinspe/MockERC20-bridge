# MockERC20 Contract

## Overview

`MockERC20` is a mock ERC20 token for testing, incorporating ERC2771 meta-transaction context for gasless transactions. It supports minting, burning, and a counter increment feature to demonstrate state changes.

## Features

- **Minting**: Only the contract owner can mint new tokens.
- **Burning**: Holders can burn their tokens to reduce supply.
- **Counter**: Demonstrates a simple state change with an increment function.

## Technologies

- OpenZeppelin Contracts for ERC20 and ownership features.
- Gelato Network's ERC2771Context for meta-transactions.

## Setup

1. Install dependencies with `npm install`.
2. Compile contracts with `npm run compile`.

## Usage

- Deploy the contract specifying the name, symbol, initial owner, and trusted forwarder.
- Use `mint` to issue new tokens, `burn` to destroy tokens, and `increment` to test state changes.

## Gelato web3 functions

[Explore here ](./gelato-functions)

## Development

This contract is intended for development and testing purposes only.
