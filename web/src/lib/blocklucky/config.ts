export const CONTRACT_ADDRESS = '0xAc719CD58E537Cde7c7dA732496622eE1E9B1981';
export const CHAIN_ID = 11155111;
export const CHAIN_HEX = '0xaa36a7';
export const EXPLORER = 'https://sepolia.etherscan.io';
export const FAUCET = 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia';
export const ABI = [
  'function ticketPrice() view returns (uint256)', 'function maxPlayers() view returns (uint256)',
  'function roundDuration() view returns (uint256)', 'function maxTicketsPerPlayer() view returns (uint256)',
  'function roundId() view returns (uint256)', 'function roundEndTime() view returns (uint256)',
  'function ticketsOf(uint256 round, address player) view returns (uint256)',
  'function lastWinner() view returns (address)', 'function lastPrize() view returns (uint256)',
  'function pendingWithdrawals(address) view returns (uint256)', 'function getPlayers(uint256 offset, uint256 limit) view returns (address[] players, uint256[] tickets)',
  'function getTickets(uint256 offset, uint256 limit) view returns (address[] owners)', 'function MAX_PAGE_SIZE() view returns (uint256)', 'function getPlayerCount() view returns (uint256)',
  'function getTicketCount() view returns (uint256)', 'function getPot() view returns (uint256)',
  'function timeLeft() view returns (uint256)', 'function buyTicket() payable', 'function drawWinner()',
  'function withdraw()',
  'event TicketPurchased(uint256 indexed roundId, address indexed player, uint256 ticketsOwned, uint256 pot)',
  'event WinnerPicked(uint256 indexed roundId, address indexed winner, uint256 prize, uint256 ticketsSold)',
  'event PrizeDeferred(address indexed winner, uint256 amount)', 'event Withdrawal(address indexed player, uint256 amount)',
  'error WrongTicketPrice(uint256 sent, uint256 expected)', 'error TicketLimitReached()',
  'error RoundOver()', 'error RoundNotOver()', 'error NoPlayers()', 'error NothingToWithdraw()',
  'error TransferFailed()', 'error Reentrancy()',
];
// Le site ne lit jamais toute la liste (jusqu'à 10 000 joueurs) : seulement les derniers arrivés.
export const PLAYERS_PAGE = 50;
export const TICKETS_WINDOW = 60;
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
