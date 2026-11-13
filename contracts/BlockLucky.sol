// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BlockLucky - loterie décentralisée pour la ville d'EtherBay
/// @notice Les participants achètent des tickets en ETH (fictifs sur Sepolia).
///         Un gagnant est tiré au sort quand le nombre de joueurs maximum est atteint
///         OU quand la durée de la partie est écoulée. Il remporte toute la cagnotte.
/// @dev    Conçu pour accueillir 10 000 participants et plus : aucune boucle ni aucun effacement
///         de liste. Le coût d'un achat et d'un tirage est le même avec 5 ou 10 000 joueurs.
contract BlockLucky {
    // ---------------------------------------------------------------------
    // Paramètres fixés au déploiement (immutable = impossibles à modifier)
    // ---------------------------------------------------------------------
    address public immutable owner;
    uint256 public immutable ticketPrice;          // prix d'un ticket, en wei
    uint256 public immutable maxPlayers;           // nb de joueurs différents qui déclenche le tirage
    uint256 public immutable roundDuration;        // durée d'une partie, en secondes
    uint256 public immutable maxTicketsPerPlayer;  // limite de tickets par personne et par partie

    /// @notice Taille maximale d'une page pour les fonctions de lecture paginées.
    uint256 public constant MAX_PAGE_SIZE = 500;

    // ---------------------------------------------------------------------
    // État des parties
    // Chaque partie a ses propres "cases" (clé = numéro de partie). Une nouvelle partie
    // utilise simplement de nouvelles clés : rien à effacer, donc pas de coût qui grandit.
    // ---------------------------------------------------------------------
    uint256 public roundId = 1;    // numéro de la partie en cours
    uint256 public roundEndTime;   // fin de la partie (0 tant que personne n'a acheté)

    mapping(uint256 => mapping(uint256 => address)) private ticketOwner; // partie => n° ticket => joueur
    mapping(uint256 => mapping(uint256 => address)) private playerAt;    // partie => n° joueur => joueur
    mapping(uint256 => uint256) private ticketCountOf;                   // partie => nb de tickets
    mapping(uint256 => uint256) private playerCountOf;                   // partie => nb de joueurs différents
    mapping(uint256 => mapping(address => uint256)) public ticketsOf;    // partie => joueur => nb tickets

    // Résultat de la dernière partie
    address public lastWinner;
    uint256 public lastPrize;

    // Gains qui n'ont pas pu être envoyés automatiquement (sécurité)
    mapping(address => uint256) public pendingWithdrawals;
    uint256 private _totalPending; // somme des gains en attente (exclue de la cagnotte)

    bool private locked; // protection contre la réentrance

    // ---------------------------------------------------------------------
    // Événements : enregistrés sur la blockchain, visibles par tous
    // ---------------------------------------------------------------------
    event TicketPurchased(uint256 indexed roundId, address indexed player, uint256 ticketsOwned, uint256 pot);
    event WinnerPicked(uint256 indexed roundId, address indexed winner, uint256 prize, uint256 ticketsSold);
    event PrizeDeferred(address indexed winner, uint256 amount);
    event Withdrawal(address indexed player, uint256 amount);

    // ---------------------------------------------------------------------
    // Erreurs personnalisées (moins chères en gas que des messages texte)
    // ---------------------------------------------------------------------
    error InvalidParameters();
    error WrongTicketPrice(uint256 sent, uint256 expected);
    error TicketLimitReached();
    error RoundOver();
    error RoundNotOver();
    error NoPlayers();
    error NothingToWithdraw();
    error TransferFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }

    constructor(
        uint256 _ticketPrice,
        uint256 _maxPlayers,
        uint256 _roundDuration,
        uint256 _maxTicketsPerPlayer
    ) {
        if (_ticketPrice == 0 || _maxPlayers < 2 || _roundDuration == 0 || _maxTicketsPerPlayer == 0) {
            revert InvalidParameters();
        }
        owner = msg.sender;
        ticketPrice = _ticketPrice;
        maxPlayers = _maxPlayers;
        roundDuration = _roundDuration;
        maxTicketsPerPlayer = _maxTicketsPerPlayer;
    }

    // ---------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------

    /// @notice Acheter un ticket pour la partie en cours (envoyer exactement ticketPrice).
    function buyTicket() external payable nonReentrant {
        if (msg.value != ticketPrice) revert WrongTicketPrice(msg.value, ticketPrice);
        if (roundEndTime != 0 && block.timestamp >= roundEndTime) revert RoundOver();

        uint256 round = roundId;
        uint256 owned = ticketsOf[round][msg.sender];
        if (owned >= maxTicketsPerPlayer) revert TicketLimitReached();

        uint256 ticketNumber = ticketCountOf[round];
        // Le chronomètre démarre avec le premier ticket de la partie
        if (ticketNumber == 0) {
            roundEndTime = block.timestamp + roundDuration;
        }
        uint256 players = playerCountOf[round];
        if (owned == 0) {
            playerAt[round][players] = msg.sender;
            players += 1;
            playerCountOf[round] = players;
        }

        ticketsOf[round][msg.sender] = owned + 1;
        ticketOwner[round][ticketNumber] = msg.sender;
        ticketCountOf[round] = ticketNumber + 1;

        emit TicketPurchased(round, msg.sender, owned + 1, getPot());

        // Tirage automatique dès que le nombre de joueurs maximum est atteint
        if (players >= maxPlayers) {
            _pickWinner();
        }
    }

    /// @notice Lancer le tirage quand la durée de la partie est écoulée.
    ///         N'importe qui peut l'appeler : personne n'a de contrôle spécial.
    function drawWinner() external nonReentrant {
        if (ticketCountOf[roundId] == 0) revert NoPlayers();
        if (block.timestamp < roundEndTime) revert RoundNotOver();
        _pickWinner();
    }

    /// @notice Récupérer un gain qui n'a pas pu être envoyé automatiquement.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pendingWithdrawals[msg.sender] = 0;
        _totalPending -= amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawal(msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Lecture (gratuit, pas de transaction)
    // ---------------------------------------------------------------------

    /// @notice Joueurs de la partie en cours, page par page (offset = position de départ),
    ///         avec le nombre de tickets de chacun. Au plus MAX_PAGE_SIZE résultats par appel.
    function getPlayers(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory players, uint256[] memory tickets)
    {
        uint256 round = roundId;
        uint256 n = _pageLength(playerCountOf[round], offset, limit);
        players = new address[](n);
        tickets = new uint256[](n);
        for (uint256 i = 0; i < n; ++i) {
            address player = playerAt[round][offset + i];
            players[i] = player;
            tickets[i] = ticketsOf[round][player];
        }
    }

    /// @notice Propriétaires des tickets de la partie en cours, page par page (dans l'ordre d'achat).
    function getTickets(uint256 offset, uint256 limit) external view returns (address[] memory owners) {
        uint256 round = roundId;
        uint256 n = _pageLength(ticketCountOf[round], offset, limit);
        owners = new address[](n);
        for (uint256 i = 0; i < n; ++i) {
            owners[i] = ticketOwner[round][offset + i];
        }
    }

    function getPlayerCount() external view returns (uint256) {
        return playerCountOf[roundId];
    }

    function getTicketCount() external view returns (uint256) {
        return ticketCountOf[roundId];
    }

    function getPot() public view returns (uint256) {
        return address(this).balance - _totalPending;
    }

    /// @notice Secondes restantes avant la fin de la partie (0 si pas démarrée ou terminée).
    function timeLeft() external view returns (uint256) {
        if (roundEndTime == 0 || block.timestamp >= roundEndTime) return 0;
        return roundEndTime - block.timestamp;
    }

    // ---------------------------------------------------------------------
    // Logique interne
    // ---------------------------------------------------------------------

    function _pageLength(uint256 total, uint256 offset, uint256 limit) private pure returns (uint256) {
        if (offset >= total) return 0;
        if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;
        uint256 remaining = total - offset;
        return remaining < limit ? remaining : limit;
    }

    function _pickWinner() private {
        uint256 finishedRound = roundId;
        uint256 count = ticketCountOf[finishedRound];
        address winner = ticketOwner[finishedRound][_random(count) % count];
        uint256 prize = getPot();

        // 1) Mise à jour de l'état AVANT tout envoi d'argent (pattern Checks-Effects-Interactions).
        //    Passer à la partie suivante suffit : ses cases sont vides, rien à effacer.
        lastWinner = winner;
        lastPrize = prize;
        roundEndTime = 0;
        roundId = finishedRound + 1;

        emit WinnerPicked(finishedRound, winner, prize, count);

        // 2) Envoi de la cagnotte. Si le gagnant ne peut pas recevoir (contrat sans receive),
        //    le gain est mis de côté et récupérable via withdraw() : la loterie n'est jamais bloquée.
        (bool ok, ) = payable(winner).call{value: prize}("");
        if (!ok) {
            pendingWithdrawals[winner] += prize;
            _totalPending += prize;
            emit PrizeDeferred(winner, prize);
        }
    }

    /// @dev Pseudo-aléatoire basé sur des données du bloc. Suffisant pour un testnet et une démo
    ///      pédagogique, mais pas pour de vrais enjeux : en production, utiliser Chainlink VRF.
    function _random(uint256 count) private view returns (uint256) {
        return uint256(
            keccak256(abi.encodePacked(block.prevrandao, block.timestamp, count, msg.sender, roundId, address(this)))
        );
    }
}
