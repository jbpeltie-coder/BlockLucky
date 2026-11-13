// Paramètres de la loterie, partagés par deploy.js, verify.js et demo.js.
const { ethers } = require("hardhat");

// Déploiement Sepolia : configuré pour l'objectif de la ville d'EtherBay (10 000 participants).
const PARAMS = {
  ticketPrice: ethers.parseEther("0.01"), // 0.01 ETH par ticket
  maxPlayers: 10_000,                     // tirage automatique au 10 000e joueur différent
  roundDuration: 600,                     // ou au bout de 600 s (10 min) après le 1er ticket
  maxTicketsPerPlayer: 2,                 // 2 tickets maximum par personne et par partie
};

// Démo locale (scripts/demo.js) : mêmes règles, mais tirage au 5e joueur pour aller vite.
const DEMO_PARAMS = { ...PARAMS, maxPlayers: 5 };

// Ordre exact des arguments du constructor de BlockLucky.sol
const constructorArgs = (p = PARAMS) => [p.ticketPrice, p.maxPlayers, p.roundDuration, p.maxTicketsPerPlayer];

module.exports = { PARAMS, DEMO_PARAMS, constructorArgs };
