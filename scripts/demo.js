const { ethers, network } = require("hardhat");
const { DEMO_PARAMS: PARAMS, constructorArgs } = require("./params");

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const eth = (wei) => `${ethers.formatEther(wei)} ETH`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (network.name !== "hardhat") {
    throw new Error("La démo tourne uniquement en local : npx hardhat run scripts/demo.js");
  }

  const [organizer, ...accounts] = await ethers.getSigners();
  const names = ["Alice", "Bob", "Chloé", "David", "Emma"];
  const players = accounts.slice(0, PARAMS.maxPlayers);

  console.log("\n🎟️  BlockLucky — démo locale\n");
  const lottery = await ethers.deployContract("BlockLucky", constructorArgs(PARAMS), organizer);
  await lottery.waitForDeployment();
  console.log(`Contrat déployé à ${await lottery.getAddress()} par l'organisateur ${short(organizer.address)}`);
  console.log(
    `Règles : ${eth(PARAMS.ticketPrice)} le ticket, tirage au ${PARAMS.maxPlayers}e joueur ` +
      `ou après ${PARAMS.roundDuration / 60} min, ${PARAMS.maxTicketsPerPlayer} tickets max par personne.\n`
  );

  const balancesBefore = await Promise.all(players.map((p) => ethers.provider.getBalance(p.address)));

  console.log("— Partie 1 : tirage automatique quand 5 joueurs ont acheté —");
  let receipt;
  for (let i = 0; i < players.length; i++) {
    const tx = await lottery.connect(players[i]).buyTicket({ value: PARAMS.ticketPrice });
    receipt = await tx.wait();
    const pot = i < players.length - 1 ? await lottery.getPot() : PARAMS.ticketPrice * BigInt(players.length);
    console.log(`  ${names[i].padEnd(6)} (${short(players[i].address)}) achète un ticket  → cagnotte : ${eth(pot)}`);
    await pause(300);
  }

  const event = receipt.logs
    .map((log) => {
      try {
        return lottery.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "WinnerPicked");

  const winner = event.args.winner;
  const idx = players.findIndex((p) => p.address === winner);
  const balanceAfter = await ethers.provider.getBalance(winner);

  console.log(`\n  🎲 Tirage effectué automatiquement par le contrat (partie n°${event.args.roundId})`);
  console.log(`  🏆 Gagnant  : ${names[idx]} (${winner})`);
  console.log(`  💰 Cagnotte : ${eth(event.args.prize)} versée directement sur son compte`);
  console.log(`     Solde de ${names[idx]} : ${eth(balancesBefore[idx])} → ${eth(balanceAfter)} (sa mise de ${eth(PARAMS.ticketPrice)} et le gas déduits)`);
  console.log(`  Contrat remis à zéro : partie n°${await lottery.roundId()}, cagnotte ${eth(await lottery.getPot())}\n`);

  console.log("— Partie 2 : tirage quand le temps est écoulé —");
  await (await lottery.connect(players[0]).buyTicket({ value: PARAMS.ticketPrice })).wait();
  await (await lottery.connect(players[0]).buyTicket({ value: PARAMS.ticketPrice })).wait();
  await (await lottery.connect(players[1]).buyTicket({ value: PARAMS.ticketPrice })).wait();
  console.log(`  ${names[0]} achète 2 tickets, ${names[1]} en achète 1 → cagnotte : ${eth(await lottery.getPot())}`);
  try {
    await lottery.connect(players[0]).buyTicket.staticCall({ value: PARAMS.ticketPrice });
  } catch (err) {
    console.log(`  ${names[0]} tente un 3e ticket → refusé par le contrat (${err.revert?.name ?? lottery.interface.parseError(err.data)?.name ?? "erreur"})`);
  }

  console.log(`  ⏩ On avance l'horloge de la blockchain locale de ${PARAMS.roundDuration} secondes...`);
  await network.provider.send("evm_increaseTime", [PARAMS.roundDuration]);
  await network.provider.send("evm_mine");

  await (await lottery.connect(players[4]).drawWinner()).wait();
  const w2 = await lottery.lastWinner();
  const i2 = players.findIndex((p) => p.address === w2);
  console.log(`  ${names[4]} (simple spectateur) déclenche le tirage : n'importe qui peut le faire.`);
  console.log(`  🏆 Gagnant  : ${names[i2]} (${w2})`);
  console.log(`  💰 Cagnotte : ${eth(await lottery.lastPrize())}  (${names[0]} avait 2 chances sur 3)\n`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exitCode = 1;
});
