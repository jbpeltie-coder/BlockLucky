const { ethers } = require("hardhat");

const PARAMS = {
  ticketPrice: ethers.parseEther("0.01"),
  maxPlayers: 10_000,
  roundDuration: 600,
  maxTicketsPerPlayer: 2,
};

const DEMO_PARAMS = { ...PARAMS, maxPlayers: 5 };

const constructorArgs = (p = PARAMS) => [p.ticketPrice, p.maxPlayers, p.roundDuration, p.maxTicketsPerPlayer];

module.exports = { PARAMS, DEMO_PARAMS, constructorArgs };
