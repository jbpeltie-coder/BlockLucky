import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther, type TransactionReceipt } from 'ethers';
import { ABI, CHAIN_HEX, CHAIN_ID, CONTRACT_ADDRESS, PLAYERS_PAGE, TICKETS_WINDOW, shortAddress } from './config';
import { DEMO_RULES, frenchError, type Rules } from './rules';
import { existingWallet, injectedWallet, isMobile, openInMetaMaskApp, requestWallet, usingSdk, type Ethereum } from './wallet';

export interface LotteryState { rules: Rules; round: number; end: number; tickets: string[]; ticketOffset: number; players: string[]; counts: Record<string, number>; playerCount: number; ticketCount: number; pot: bigint; winner: string; prize: bigint; owned: number; pending: bigint; balance: bigint }
export interface FeedItem { id: string; kind: 'ticket' | 'winner' | 'withdraw'; address: string; value: string; time: number; hash?: string | undefined; demo: boolean }
export interface Win { address: string; prize: bigint; tickets: string[]; hash?: string | undefined; demo: boolean }
export interface Ticket { round: number; number: number; address: string; hash?: string | undefined; demo: boolean }
const emptyState = (): LotteryState => ({ rules: { price: 0n, maxPlayers: 0, duration: 0, maxTickets: 0 }, round: 0, end: 0, tickets: [], ticketOffset: 0, players: [], counts: {}, playerCount: 0, ticketCount: 0, pot: 0n, winner: '', prize: 0n, owned: 0, pending: 0n, balance: 0n });
const demoAccount = '0x9D309Ba72b96dF12Cc7B1Eb0942927Ae24219d1F';
const createAddress = () => `0x${Array.from(crypto.getRandomValues(new Uint8Array(20)), b => b.toString(16).padStart(2, '0')).join('')}`;
export function useLottery() {
  const [demo, setDemo] = useState(false);
  const [account, setAccount] = useState('');
  const [network, setNetwork] = useState<number | null>(null);
  const [state, setState] = useState<LotteryState>(emptyState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [missingWallet, setMissingWallet] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'sent' | 'validated'>('idle');
  const [txHash, setTxHash] = useState('');
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [win, setWin] = useState<Win | null>(null);
  const [ticketCards, setTicketCards] = useState<Ticket[]>([]);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [wallet, setWallet] = useState<Ethereum | undefined>(undefined);
  const [mobile, setMobile] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);
  const walletRef = useRef(wallet); walletRef.current = wallet;
  const stateRef = useRef(state); stateRef.current = state;
  const accountRef = useRef(account); accountRef.current = account;
  const contractRef = useRef<Contract | null>(null);
  const providerRef = useRef<BrowserProvider | null>(null);
  const seen = useRef(new Set<string>());
  const generation = useRef(0);
  const modeRef = useRef(demo); modeRef.current = demo;
  const previousTickets = useRef<string[]>([]);
  const feedEntry = useCallback((item: FeedItem) => { if (seen.current.has(item.id)) return; seen.current.add(item.id); setFeed(f => [item, ...f].slice(0, 30)); }, []);
  const celebrate = useCallback((result: Win, id: string) => {
    if (seen.current.has(`win:${id}`)) return;
    seen.current.add(`win:${id}`); setWin(result);
    feedEntry({ id, kind: 'winner', address: result.address, value: formatEther(result.prize), time: Date.now(), hash: result.hash, demo: result.demo });
  }, [feedEntry]);
  const refresh = useCallback(async () => {
    const c = contractRef.current; const p = providerRef.current;
    if (!c || !p || modeRef.current) return;
    const epoch = generation.current;
    try {
      const [price, maxPlayers, duration, maxTickets, round, end, playerCountRaw, ticketCountRaw, pot, winner, prize, timeLeft] = await Promise.all([
        c.getFunction('ticketPrice')(), c.getFunction('maxPlayers')(), c.getFunction('roundDuration')(), c.getFunction('maxTicketsPerPlayer')(), c.getFunction('roundId')(), c.getFunction('roundEndTime')(), c.getFunction('getPlayerCount')(), c.getFunction('getTicketCount')(), c.getFunction('getPot')(), c.getFunction('lastWinner')(), c.getFunction('lastPrize')(), c.getFunction('timeLeft')(),
      ]);
      const playerCount = Number(playerCountRaw); const ticketCount = Number(ticketCountRaw);
      const playerOffset = Math.max(0, playerCount - PLAYERS_PAGE); const ticketOffset = Math.max(0, ticketCount - TICKETS_WINDOW);
      const [[players, playerTickets], tickets] = await Promise.all([
        c.getFunction('getPlayers')(playerOffset, PLAYERS_PAGE) as Promise<[string[], bigint[]]>,
        c.getFunction('getTickets')(ticketOffset, TICKETS_WINDOW) as Promise<string[]>,
      ]);
      const counts: Record<string, number> = {};
      players.forEach((address, i) => { counts[address.toLowerCase()] = Number(playerTickets[i] ?? 0n); });
      const owner = accountRef.current;
      const [owned, pending, balance, block] = await Promise.all([owner ? c.getFunction('ticketsOf')(round, owner) : 0n, owner ? c.getFunction('pendingWithdrawals')(owner) : 0n, owner ? p.getBalance(owner) : 0n, p.getBlock('latest')]);
      if (epoch !== generation.current || modeRef.current) return;
      const old = stateRef.current;
      const next: LotteryState = { rules: { price, maxPlayers: Number(maxPlayers), duration: Number(duration), maxTickets: Number(maxTickets) }, round: Number(round), end: Number(end), players: [...players].reverse(), counts, playerCount, ticketCount, tickets: [...tickets], ticketOffset, pot, winner: /^0x0{40}$/i.test(winner) ? '' : winner, prize, owned: Number(owned), pending, balance };
      if (old.round > 0 && next.round > old.round && next.winner) celebrate({ address: next.winner, prize, tickets: old.tickets.length ? old.tickets : previousTickets.current, demo: false }, `round-${old.round}`);
      if (old.round !== next.round) setTicketCards([]);
      stateRef.current = next; setState(next); previousTickets.current = next.tickets;
      if (block) setNow(Number(end) > 0 ? Number(end) - Number(timeLeft) : block.timestamp);
      setError('');
    } catch (e) { if (epoch === generation.current) setError(frenchError(e)); }
  }, [celebrate]);
  const processReceipt = useCallback((receipt: TransactionReceipt, before: LotteryState) => {
    const c = contractRef.current; if (!c) return;
    for (const log of receipt.logs) {
      try {
        const parsed = c.interface.parseLog(log); if (!parsed) continue;
        const a = parsed.args;
        if (parsed.name === 'TicketPurchased') {
          feedEntry({ id: `${receipt.hash}-${log.index}`, kind: 'ticket', address: a['player'], value: '1', time: Date.now(), hash: receipt.hash, demo: false });
          if (a['player'].toLowerCase() === accountRef.current.toLowerCase()) setTicketCards(t => [...t, { round: Number(a['roundId']), number: before.ticketCount + 1, address: a['player'], hash: receipt.hash, demo: false }]);
        }
        if (parsed.name === 'WinnerPicked') celebrate({ address: a['winner'], prize: a['prize'], tickets: before.tickets.length ? [...before.tickets, ...(before.playerCount === Number(before.rules.maxPlayers) - 1 ? [accountRef.current] : [])] : previousTickets.current, hash: receipt.hash, demo: false }, `round-${Number(a['roundId'])}`);
      } catch { continue; }
    }
  }, [celebrate, feedEntry]);
  const attach = useCallback(async (ethereum: Ethereum, chain: number) => {
    setNetwork(chain);
    const p = new BrowserProvider(ethereum); providerRef.current = p;
    if (chain === CHAIN_ID) { contractRef.current = new Contract(CONTRACT_ADDRESS, ABI, p); await refresh(); }
    else contractRef.current = null;
  }, [refresh]);
  const connect = useCallback(async (change = false) => {
    if (modeRef.current) return;
    setLoading(true); setError(''); setMissingWallet(false);
    try {
      const ethereum = await requestWallet();
      walletRef.current = ethereum; setWallet(ethereum);
      if (change) await ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      const addresses = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const chain = Number(await ethereum.request({ method: 'eth_chainId' }));
      setAccount(addresses[0] || ''); accountRef.current = addresses[0] || '';
      await attach(ethereum, chain);
      if (chain !== CHAIN_ID) {
        try { await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] }); }
        catch (switchError) { setError(frenchError(switchError)); }
      }
    } catch (e) {
      if (!injectedWallet()) setMissingWallet(true);
      setError(frenchError(e));
    } finally { setLoading(false); }
  }, [attach]);
  const switchNetwork = async () => {
    try { await walletRef.current?.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] }); }
    catch (e) { setError(frenchError(e)); }
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setMobile(isMobile());
    let active = true;
    void existingWallet().then(w => { if (!active) return; if (w) setWallet(w); else setWalletChecked(true); }).catch(() => { if (active) setWalletChecked(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (demo || !wallet) return;
    const ethereum = wallet;
    let active = true;
    const accountsChanged = (...args: unknown[]) => {
      const addresses = args[0] as string[]; generation.current++; const owner = addresses[0] || '';
      setAccount(owner); accountRef.current = owner; setTicketCards([]); setPhase('idle'); setTxHash('');
      if (!owner) { setState(emptyState()); } else void refresh();
    };
    const chainChanged = (...args: unknown[]) => {
      if (!usingSdk()) { window.location.reload(); return; }
      generation.current++; void attach(ethereum, Number(args[0]));
    };
    ethereum.on?.('accountsChanged', accountsChanged); ethereum.on?.('chainChanged', chainChanged);
    void (async () => {
      try {
        const chain = Number(await ethereum.request({ method: 'eth_chainId' }));
        const addresses = await ethereum.request({ method: 'eth_accounts' }) as string[];
        if (!active) return;
        setAccount(addresses[0] || ''); accountRef.current = addresses[0] || ''; setWalletChecked(true);
        setLoading(true); await attach(ethereum, chain); if (active) setLoading(false);
      } catch (e) { if (active) { setError(frenchError(e)); setLoading(false); setWalletChecked(true); } }
    })();
    return () => { active = false; ethereum.removeListener?.('accountsChanged', accountsChanged); ethereum.removeListener?.('chainChanged', chainChanged); };
  }, [demo, wallet, refresh, attach]);
  useEffect(() => {
    const c = contractRef.current;
    if (demo || network !== CHAIN_ID || !c) return;
    const purchased = (round: bigint, player: string, _owned: bigint, _pot: bigint, event: { log: { transactionHash: string; index: number } }) => {
      const hash = event.log.transactionHash;
      feedEntry({ id: `${hash}-${event.log.index}`, kind: 'ticket', address: player, value: '1', time: Date.now(), hash, demo: false }); void refresh();
    };
    const picked = (round: bigint, winner: string, prize: bigint, _sold: bigint, event: { log: { transactionHash: string } }) => {
      celebrate({ address: winner, prize, tickets: stateRef.current.tickets.length ? stateRef.current.tickets : previousTickets.current, hash: event.log.transactionHash, demo: false }, `round-${Number(round)}`); void refresh();
    };
    const update = () => void refresh();
    void c.on('TicketPurchased', purchased).catch(() => {}); void c.on('WinnerPicked', picked).catch(() => {});
    void c.on('PrizeDeferred', update).catch(() => {}); void c.on('Withdrawal', update).catch(() => {});
    const timer = setInterval(update, 10000);
    return () => { clearInterval(timer); void c.removeAllListeners().catch(() => {}); };
  }, [demo, network, account, state.rules.price, celebrate, feedEntry, refresh]);
  const toggleDemo = (enabled: boolean) => {
    generation.current++; modeRef.current = enabled; setDemo(enabled); setError(''); setWin(null); setFeed([]); seen.current.clear(); setTicketCards([]); setPhase('idle'); setTxHash(''); setLoading(false);
    if (contractRef.current) void contractRef.current.removeAllListeners().catch(() => {});
    contractRef.current = null; providerRef.current = null; previousTickets.current = [];
    setAccount(enabled ? demoAccount : ''); setNetwork(null); setNow(Math.floor(Date.now() / 1000));
    const next = enabled ? { ...emptyState(), rules: DEMO_RULES, round: 1, balance: parseEther('1') } : emptyState(); stateRef.current = next; setState(next);
  };
  const demoDraw = (s = stateRef.current) => {
    if (!s.ticketCount) { setError('Aucun participant.'); return; }
    const winner = s.tickets[(crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % s.tickets.length];
    if (!winner) return;
    celebrate({ address: winner, prize: s.pot, tickets: s.tickets, demo: true }, `demo-round-${s.round}`);
    const next = { ...s, round: s.round + 1, tickets: [], ticketOffset: 0, players: [], counts: {}, playerCount: 0, ticketCount: 0, pot: 0n, owned: 0, end: 0, winner, prize: s.pot }; stateRef.current = next; setState(next); setTicketCards([]);
  };
  const demoBuy = (player = account) => {
    const s = stateRef.current; const owned = s.tickets.filter(a => a === player).length;
    if (owned >= s.rules.maxTickets) { setError('Tu as déjà tes 2 tickets pour cette partie.'); return; }
    if (s.end > 0 && now >= s.end) { setError('Temps écoulé : lance le tirage !'); return; }
    const tickets = [...s.tickets, player]; const players = [...new Set(tickets)].reverse();
    const counts = { ...s.counts, [player.toLowerCase()]: owned + 1 };
    const next = { ...s, tickets, players, counts, playerCount: players.length, ticketCount: tickets.length, pot: s.pot + s.rules.price, end: s.end || now + s.rules.duration, owned: tickets.filter(a => a === account).length };
    feedEntry({ id: `demo-${s.round}-${tickets.length}`, kind: 'ticket', address: player, value: '1', time: Date.now(), demo: true });
    if (player === account) setTicketCards(t => [...t, { round: s.round, number: tickets.length, address: player, demo: true }]);
    setPhase('validated'); stateRef.current = next; setState(next);
    if (players.length >= s.rules.maxPlayers) demoDraw(next);
  };
  const transact = async (method: 'buyTicket' | 'drawWinner' | 'withdraw') => {
    if (modeRef.current) { if (method === 'buyTicket') demoBuy(); else if (method === 'drawWinner') demoDraw(); return; }
    if (!account) { await connect(); return; }
    const p = providerRef.current; if (!p || network !== CHAIN_ID) return;
    const epoch = generation.current;
    setError(''); setPhase('confirm'); setTxHash(''); const before = stateRef.current;
    try {
      const signer = await p.getSigner(); const c = new Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = method === 'buyTicket' ? await c.getFunction('buyTicket')({ value: before.rules.price }) : method === 'drawWinner' ? await c.getFunction('drawWinner')() : await c.getFunction('withdraw')();
      if (epoch !== generation.current) return;
      setTxHash(tx.hash); setPhase('sent'); const receipt = await tx.wait();
      if (epoch !== generation.current) return;
      if (receipt && receipt.status === 1) { processReceipt(receipt, before); setPhase('validated'); await refresh(); }
      else { setPhase('idle'); setError('La transaction a échoué. Réessaie.'); }
    } catch (e) { if (epoch === generation.current) { setError(frenchError(e)); setPhase('idle'); } }
  };
  return { mobile, walletChecked, openInApp: openInMetaMaskApp, demo, toggleDemo, state, account, network, loading, error, missingWallet, phase, txHash, feed, win, dismissWin: () => setWin(null), ticketCards, now, connect, switchNetwork, refresh, buy: () => transact('buyTicket'), draw: () => transact('drawWinner'), withdraw: () => transact('withdraw'), addPlayer: () => demoBuy(createAddress()), busy: phase === 'confirm' || phase === 'sent', shortAddress };
}
