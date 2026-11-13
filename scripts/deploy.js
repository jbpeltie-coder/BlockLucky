const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");
const { PARAMS, constructorArgs } = require("./params");

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

  let overrides = {};
  if (!isLocal) {
    // Par défaut ethers réserve des frais bien au-dessus du prix réel de Sepolia et peut refuser le déploiement.
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

  if (!isLocal) {
    const ts = fs.readFileSync(WEB_CONFIG_FILE, "utf8");
    const pattern = /export const CONTRACT_ADDRESS\s*=\s*["'][^"']*["'];/;
    if (!pattern.test(ts)) throw new Error("CONTRACT_ADDRESS introuvable dans web/src/lib/blocklucky/config.ts");
    fs.writeFileSync(WEB_CONFIG_FILE, ts.replace(pattern, `export const CONTRACT_ADDRESS = '${address}';`));
    console.log("📝 web/src/lib/blocklucky/config.ts mis à jour avec la nouvelle adresse.");
    console.log("\nÉtape suivante : npm run verify:sepolia");
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err.shortMessage || err.message}`);
  process.exitCode = 1;
});
