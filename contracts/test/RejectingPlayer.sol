// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBlockLucky {
    function buyTicket() external payable;
    function withdraw() external;
}

contract RejectingPlayer {
    IBlockLucky public immutable lottery;
    bool public acceptPayments;

    constructor(address _lottery) {
        lottery = IBlockLucky(_lottery);
    }

    function buy() external payable {
        lottery.buyTicket{value: msg.value}();
    }

    function setAcceptPayments(bool v) external {
        acceptPayments = v;
    }

    function claim() external {
        lottery.withdraw();
    }

    receive() external payable {
        require(acceptPayments, "refuse");
    }
}
