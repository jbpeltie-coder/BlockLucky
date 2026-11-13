// Publie le code source du contrat sur Etherscan (badge "Contract Source Code Verified").
// Usage : npm run verify:sepolia   (après npm run deploy:sepolia)
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const file = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`${path.relative(process.cwd(), file)} introuvable : lance d'abord npm run deploy:sepolia`);
  }
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error("ETHERSCAN_API_KEY manquante dans le fichier .env");
  }
  const { address, constructorArgs } = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Vérification de ${address} sur ${hre.network.name}...`);

  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
      contract: "contracts/BlockLucky.sol:BlockLucky",
    });
  } catch (err) {
    if (/already verified/i.test(err.message)) {
      console.log("Le contrat est déjà vérifié.");
    } else {
      throw err;
    }
  }
  console.log(`✅ Code visible ici : https://sepolia.etherscan.io/address/${address}#code`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exitCode = 1;
});
