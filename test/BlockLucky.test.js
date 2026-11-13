const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const PRICE = ethers.parseEther("0.01");
const MAX_PLAYERS = 5;
const DURATION = 600;
const MAX_TICKETS = 2;

describe("BlockLucky", function () {
  async function deployFixture() {
    const [owner, ...players] = await ethers.getSigners();
    const BlockLucky = await ethers.getContractFactory("BlockLucky");
    const lottery = await BlockLucky.deploy(PRICE, MAX_PLAYERS, DURATION, MAX_TICKETS);
    return { lottery, owner, players };
  }

  describe("Déploiement", function () {
    it("1. enregistre les paramètres et le propriétaire", async function () {
      const { lottery, owner } = await loadFixture(deployFixture);
      expect(await lottery.owner()).to.equal(owner.address);
      expect(await lottery.ticketPrice()).to.equal(PRICE);
      expect(await lottery.maxPlayers()).to.equal(MAX_PLAYERS);
      expect(await lottery.roundDuration()).to.equal(DURATION);
      expect(await lottery.maxTicketsPerPlayer()).to.equal(MAX_TICKETS);
      expect(await lottery.roundId()).to.equal(1);
    });

    it("2. refuse des paramètres invalides", async function () {
      const BlockLucky = await ethers.getContractFactory("BlockLucky");
      await expect(BlockLucky.deploy(0, 5, 600, 2)).to.be.revertedWithCustomError(BlockLucky, "InvalidParameters");
      await expect(BlockLucky.deploy(PRICE, 1, 600, 2)).to.be.revertedWithCustomError(BlockLucky, "InvalidParameters");
      await expect(BlockLucky.deploy(PRICE, 5, 0, 2)).to.be.revertedWithCustomError(BlockLucky, "InvalidParameters");
      await expect(BlockLucky.deploy(PRICE, 5, 600, 0)).to.be.revertedWithCustomError(BlockLucky, "InvalidParameters");
    });
  });

  describe("Achat de tickets", function () {
    it("3. permet d'acheter un ticket au bon prix", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      await expect(lottery.connect(players[0]).buyTicket({ value: PRICE }))
        .to.emit(lottery, "TicketPurchased")
        .withArgs(1, players[0].address, 1, PRICE);
      expect(await lottery.getTicketCount()).to.equal(1);
      expect(await lottery.getPlayerCount()).to.equal(1);
      expect(await lottery.getPot()).to.equal(PRICE);
      const [list, counts] = await lottery.getPlayers(0, 10);
      expect(list).to.deep.equal([players[0].address]);
      expect(counts).to.deep.equal([1n]);
      expect(await lottery.getTickets(0, 10)).to.deep.equal([players[0].address]);
    });

    it("4. refuse un paiement trop faible", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      await expect(lottery.connect(players[0]).buyTicket({ value: PRICE - 1n }))
        .to.be.revertedWithCustomError(lottery, "WrongTicketPrice")
        .withArgs(PRICE - 1n, PRICE);
    });

    it("5. refuse un paiement trop élevé", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      await expect(lottery.connect(players[0]).buyTicket({ value: PRICE * 2n })).to.be.revertedWithCustomError(
        lottery,
        "WrongTicketPrice"
      );
    });

    it("6. autorise 2 tickets par personne, pas un 3e", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      expect(await lottery.ticketsOf(1, players[0].address)).to.equal(2);
      await expect(lottery.connect(players[0]).buyTicket({ value: PRICE })).to.be.revertedWithCustomError(
        lottery,
        "TicketLimitReached"
      );
    });

    it("7. compte un joueur une seule fois même avec 2 tickets", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      expect(await lottery.getPlayerCount()).to.equal(1);
      expect(await lottery.getTicketCount()).to.equal(2);
    });

    it("8. démarre le chronomètre au premier ticket", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      expect(await lottery.roundEndTime()).to.equal(0);
      expect(await lottery.timeLeft()).to.equal(0);
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      const start = await time.latest();
      expect(await lottery.roundEndTime()).to.equal(start + DURATION);
      expect(await lottery.timeLeft()).to.equal(DURATION);
    });

    it("9. refuse un envoi d'ETH direct (sans passer par buyTicket)", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      await expect(players[0].sendTransaction({ to: await lottery.getAddress(), value: PRICE })).to.be.reverted;
    });
  });

  describe("Tirage au sort", function () {
    it("10. tire un gagnant automatiquement au 5e joueur et lui verse la cagnotte", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      const five = players.slice(0, MAX_PLAYERS);
      for (const p of five.slice(0, 4)) await lottery.connect(p).buyTicket({ value: PRICE });

      const pot = PRICE * 5n;
      const before = await Promise.all(five.map((p) => ethers.provider.getBalance(p.address)));

      await expect(lottery.connect(five[4]).buyTicket({ value: PRICE }))
        .to.emit(lottery, "WinnerPicked")
        .withArgs(1, anyValue, pot, 5);

      const winner = await lottery.lastWinner();
      const idx = five.findIndex((p) => p.address === winner);
      expect(idx).to.be.gte(0);
      expect(await lottery.lastPrize()).to.equal(pot);
      expect(await ethers.provider.getBalance(await lottery.getAddress())).to.equal(0);
      if (idx < 4) {
        expect(await ethers.provider.getBalance(winner)).to.equal(before[idx] + pot);
      }
    });

    it("11. remet la partie à zéro après le tirage", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      for (const p of players.slice(0, MAX_PLAYERS)) await lottery.connect(p).buyTicket({ value: PRICE });
      expect(await lottery.roundId()).to.equal(2);
      expect(await lottery.getTicketCount()).to.equal(0);
      expect(await lottery.getPlayerCount()).to.equal(0);
      expect(await lottery.roundEndTime()).to.equal(0);
      expect(await lottery.getPot()).to.equal(0);
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      expect(await lottery.ticketsOf(2, players[0].address)).to.equal(2);
    });

    it("12. refuse le tirage manuel avant la fin du temps", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      await expect(lottery.drawWinner()).to.be.revertedWithCustomError(lottery, "NoPlayers");
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      await expect(lottery.drawWinner()).to.be.revertedWithCustomError(lottery, "RoundNotOver");
    });

    it("13. permet à n'importe qui de lancer le tirage une fois le temps écoulé", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      await lottery.connect(players[1]).buyTicket({ value: PRICE });
      await time.increase(DURATION);

      await expect(lottery.connect(players[2]).buyTicket({ value: PRICE })).to.be.revertedWithCustomError(
        lottery,
        "RoundOver"
      );

      await expect(lottery.connect(players[9]).drawWinner()).to.emit(lottery, "WinnerPicked");
      expect([players[0].address, players[1].address]).to.include(await lottery.lastWinner());
      expect(await lottery.lastPrize()).to.equal(PRICE * 2n);
      expect(await lottery.roundId()).to.equal(2);
    });

    it("14. choisit toujours le gagnant parmi les participants (10 parties)", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      const five = players.slice(0, MAX_PLAYERS).map((p) => p.address);
      for (let round = 0; round < 10; round++) {
        for (const p of players.slice(0, MAX_PLAYERS)) await lottery.connect(p).buyTicket({ value: PRICE });
        expect(five).to.include(await lottery.lastWinner());
      }
      expect(await lottery.roundId()).to.equal(11);
    });
  });

  describe("Lecture paginée (prévue pour 10 000 joueurs)", function () {
    it("15. renvoie les joueurs et les tickets page par page", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      await lottery.connect(players[1]).buyTicket({ value: PRICE });
      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      await lottery.connect(players[2]).buyTicket({ value: PRICE });

      const [page1, counts1] = await lottery.getPlayers(0, 2);
      expect(page1).to.deep.equal([players[0].address, players[1].address]);
      expect(counts1).to.deep.equal([2n, 1n]);
      const [page2, counts2] = await lottery.getPlayers(2, 2);
      expect(page2).to.deep.equal([players[2].address]);
      expect(counts2).to.deep.equal([1n]);
      const [empty] = await lottery.getPlayers(10, 5);
      expect(empty).to.deep.equal([]);

      expect(await lottery.getTickets(1, 2)).to.deep.equal([players[1].address, players[0].address]);
      expect(await lottery.MAX_PAGE_SIZE()).to.equal(500);
    });
  });

  describe("Sécurité", function () {
    it("16. ne bloque pas la loterie si le gagnant refuse le paiement (retrait différé)", async function () {
      const { lottery, players } = await loadFixture(deployFixture);
      const Rejecting = await ethers.getContractFactory("RejectingPlayer");
      const rejecter = await Rejecting.deploy(await lottery.getAddress());

      await rejecter.buy({ value: PRICE });
      await time.increase(DURATION);
      await expect(lottery.drawWinner())
        .to.emit(lottery, "PrizeDeferred")
        .withArgs(await rejecter.getAddress(), PRICE);

      expect(await lottery.pendingWithdrawals(await rejecter.getAddress())).to.equal(PRICE);
      expect(await lottery.getPot()).to.equal(0);

      await lottery.connect(players[0]).buyTicket({ value: PRICE });
      expect(await lottery.getPot()).to.equal(PRICE);

      await expect(lottery.connect(players[1]).withdraw()).to.be.revertedWithCustomError(lottery, "NothingToWithdraw");

      await rejecter.setAcceptPayments(true);
      await expect(rejecter.claim()).to.changeEtherBalance(rejecter, PRICE);
      expect(await lottery.pendingWithdrawals(await rejecter.getAddress())).to.equal(0);
      expect(await lottery.getPot()).to.equal(PRICE);
    });
  });
});
