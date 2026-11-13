const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const PRICE = ethers.parseEther("0.01");
const PLAYERS = 10_000;

describe("BlockLucky — charge (10 000 participants)", function () {
  this.timeout(15 * 60 * 1000);

  it("17. gère 10 000 joueurs : tirage automatique, cagnotte versée, coût constant", async function () {
    const lottery = await ethers.deployContract("BlockLucky", [PRICE, PLAYERS, 7 * 24 * 3600, 2]);
    const address = await lottery.getAddress();

    const funding = ethers.toBeHex(ethers.parseEther("1"));
    const buyers = [];
    for (let i = 0; i < PLAYERS; i++) {
      const addr = ethers.Wallet.createRandom().address;
      await network.provider.send("hardhat_setBalance", [addr, funding]);
      await network.provider.send("hardhat_impersonateAccount", [addr]);
      buyers.push(await ethers.getSigner(addr));
    }

    const gasOf = async (tx) => (await tx.wait()).gasUsed;
    const gas = {};
    for (let i = 0; i < PLAYERS; i++) {
      const tx = await lottery.connect(buyers[i]).buyTicket({ value: PRICE });
      if (i === 1) gas.second = await gasOf(tx);
      if (i === PLAYERS - 2) gas.beforeLast = await gasOf(tx);
      if (i === PLAYERS - 1) {
        gas.lastWithDraw = await gasOf(tx);
        await expect(tx).to.emit(lottery, "WinnerPicked");
      }
      if (i === PLAYERS - 2) {
        expect(await lottery.getPlayerCount()).to.equal(PLAYERS - 1);
        const [page] = await lottery.getPlayers(9_990, 100);
        expect(page.length).to.equal(9);
        expect((await lottery.getTickets(0, 10_000)).length).to.equal(500);
      }
    }

    const winner = await lottery.lastWinner();
    expect(buyers.map((b) => b.address)).to.include(winner);
    expect(await lottery.lastPrize()).to.equal(PRICE * BigInt(PLAYERS));
    expect(await ethers.provider.getBalance(address)).to.equal(0n);
    expect(await lottery.roundId()).to.equal(2n);
    expect(await lottery.getPlayerCount()).to.equal(0n);

    expect(gas.beforeLast).to.equal(gas.second);
    expect(gas.lastWithDraw < 250_000n).to.equal(true);

    console.log(
      `      gas d'un achat (2e joueur) : ${gas.second} | (9 999e joueur) : ${gas.beforeLast}\n` +
        `      gas du 10 000e achat avec tirage et envoi de ${ethers.formatEther(PRICE * BigInt(PLAYERS))} ETH : ${gas.lastWithDraw}`
    );
  });
});
