require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

// Les secrets viennent du fichier .env (jamais commité). Voir .env.example.
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
let PRIVATE_KEY = (process.env.PRIVATE_KEY || "").trim();
if (PRIVATE_KEY && !PRIVATE_KEY.startsWith("0x")) PRIVATE_KEY = "0x" + PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // Réseau local par défaut ("hardhat") : utilisé pour les tests et la démo.
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    // Une seule clé Etherscan (API V2) suffit pour tous les réseaux.
    apiKey: ETHERSCAN_API_KEY,
  },
  sourcify: { enabled: false },
};
