// Déploie BlockLucky puis branche automatiquement le frontend sur la nouvelle adresse.
// Usage : npm run deploy:sepolia
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers, network } = hre;
const { PARAMS, constructorArgs } = require("./params");

const FRONTEND_FILE = path.join(__dirname, "..", "frontend", "index.html");
const WEB_CONFIG_FILE = path.join(__dirname, "..", "web", "src", "lib", "blocklucky", "config.ts");

async function main() {
  if (network.name === "sepolia") {
    const missing = ["SEPOLIA_RPC_URL", "PRIVATE_KEY"].filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Variable(s) manquante(s) dans le fichier .env : ${missing.join(", ")} (voir .env.example)`);
    }
  }
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      `Aucun compte configuré pour le réseau "${network.name}". Remplis PRIVATE_KEY dans le fichier .env (voir .env.example).`
    );
  }
  const deployer = signers[0];
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Réseau      : ${network.name} (chainId ${network.config.chainId ?? "local"})`);
  console.log(`Déployeur   : ${deployer.address}`);
  console.log(`Solde       : ${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) {
    throw new Error("Le compte n'a pas d'ETH pour payer le gas. Récupère des SepoliaETH sur un faucet.");
  }
  console.log(
    `Paramètres  : ${ethers.formatEther(PARAMS.ticketPrice)} ETH/ticket, ${PARAMS.maxPlayers} joueurs, ` +
      `${PARAMS.roundDuration} s, ${PARAMS.maxTicketsPerPlayer} tickets max/personne\n`
  );

  const isLocal = network.name === "hardhat" || network.name === "localhost";

  // Frais calés sur le prix réel du réseau. Par défaut, ethers réserve une marge très au-dessus
  // du prix de Sepolia, ce qui peut bloquer un compte de test peu approvisionné.
  let overrides = {};
  if (!isLocal) {
    const fee = await ethers.provider.getFeeData();
    const priority = ethers.parseUnits("0.05", "gwei");
    overrides = { maxPriorityFeePerGas: priority, maxFeePerGas: (fee.maxFeePerGas ?? 0n) * 2n + priority };
  }

  console.log("Déploiement en cours...");
  const lottery = await ethers.deployContract("BlockLucky", constructorArgs(), overrides);
  const tx = lottery.deploymentTransaction();
  console.log(`Transaction : ${tx.hash}`);
  await lottery.waitForDeployment();
  const address = await lottery.getAddress();

  if (!isLocal) {
    console.log("Attente de 5 confirmations (nécessaire pour la vérification Etherscan)...");
    await tx.wait(5);
  }

  console.log(`\n✅ BlockLucky déployé à l'adresse : ${address}`);
  if (network.name === "sepolia") {
    console.log(`🔎 Etherscan : https://sepolia.etherscan.io/address/${address}`);
  }

  // Sauvegarde de l'adresse (utilisée par scripts/verify.js)
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const record = {
    network: network.name,
    chainId: network.config.chainId,
    address,
    deployer: deployer.address,
    txHash: tx.hash,
    constructorArgs: constructorArgs().map(String),
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(deploymentsDir, `${network.name}.json`), JSON.stringify(record, null, 2) + "\n");

  // Mise à jour automatique de CONTRACT_ADDRESS dans frontend/index.html
  if (!isLocal) {
    const html = fs.readFileSync(FRONTEND_FILE, "utf8");
    const pattern = /const CONTRACT_ADDRESS\s*=\s*["'][^"']*["'];/;
    if (!pattern.test(html)) throw new Error("CONTRACT_ADDRESS introuvable dans frontend/index.html");
    fs.writeFileSync(FRONTEND_FILE, html.replace(pattern, `const CONTRACT_ADDRESS = "${address}";`));
    console.log("📝 frontend/index.html mis à jour avec la nouvelle adresse.");

    // Même chose pour le site React (web/)
    if (fs.existsSync(WEB_CONFIG_FILE)) {
      const ts = fs.readFileSync(WEB_CONFIG_FILE, "utf8");
      const tsPattern = /export const CONTRACT_ADDRESS\s*=\s*["'][^"']*["'];/;
      if (!tsPattern.test(ts)) throw new Error("CONTRACT_ADDRESS introuvable dans web/src/lib/blocklucky/config.ts");
      fs.writeFileSync(WEB_CONFIG_FILE, ts.replace(tsPattern, `export const CONTRACT_ADDRESS = '${address}';`));
      console.log("📝 web/src/lib/blocklucky/config.ts mis à jour avec la nouvelle adresse.");
    }
    console.log("\nÉtape suivante : npm run verify:sepolia");
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err.shortMessage || err.message}`);
  process.exitCode = 1;
});
