// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBlockLucky {
    function buyTicket() external payable;
    function withdraw() external;
}

/// @dev Contrat utilisé UNIQUEMENT dans les tests : un "joueur" qui refuse de recevoir des ETH,
///      pour vérifier que la loterie ne se bloque pas si le gagnant ne peut pas être payé.
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
