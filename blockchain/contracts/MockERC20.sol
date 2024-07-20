// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {
    ERC2771Context
} from "@gelatonetwork/relay-context/contracts/vendor/ERC2771Context.sol";


contract MockERC20 is ERC20, Ownable, ERC2771Context {
    // Events for mint and burn operations
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event IncrementCounter(uint256 newCounterValue, address msgSender);

    uint256 public counter;

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        address trustedForwarder
    )
        ERC20(name, symbol)
        Ownable(initialOwner)
        ERC2771Context(trustedForwarder)
    {}

    // Mint function that can only be called by the owner
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // Burn function to destroy tokens
    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
        emit TokensBurned(_msgSender(), amount);
    }

    // Increment function using ERC2771 context
    function increment() external {
        counter++;
        emit IncrementCounter(counter, _msgSender());
    }


    // Override _msgSender to use ERC2771Context
    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address sender)
    {
        return ERC2771Context._msgSender();
    }

    // Override _msgData to use ERC2771Context
    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }
}

