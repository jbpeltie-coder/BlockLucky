import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { formatEther } from 'ethers';
import { ArrowUpRight, Check, Ticket as TicketIcon, Trophy, X } from '@/components/blocklucky/icons';
import { Button } from '@/components/ui/button';
import { CONTRACT_ADDRESS, EXPLORER, shortAddress } from '@/lib/blocklucky/config';
import type { Ticket, Win } from '@/lib/blocklucky/use-lottery';

export function Identicon({ address, size = 32 }: { address: string; size?: number }) {
  const hash = Array.from(address.toLowerCase()).reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const palette = ['var(--primary)', 'var(--gold)', 'var(--cyan)', 'var(--pink)'];
  const cells = Array.from({ length: 25 }, (_, i) => { const x = i % 5; const y = Math.floor(i / 5); const mirror = x > 2 ? 4 - x : x; return ((hash >>> ((y * 3 + mirror) % 28)) & 1) ? <rect key={i} x={x} y={y} width="1" height="1" fill={palette[hash % palette.length]} /> : null; });
  return <svg role="img" aria-label={`Avatar de ${shortAddress(address)}`} width={size} height={size} viewBox="-1 -1 7 7" className="identicon"><rect x="-1" y="-1" width="7" height="7" rx="1.2" fill="var(--avatar-background)" />{cells}</svg>;
}
export function AnimatedAmount({ value }: { value: bigint }) {
  const [shown, setShown] = useState(0); const reduced = useReducedMotion(); const current = useRef(0);
  useEffect(() => {
    const target = Number(formatEther(value)); const start = current.current; const time = performance.now(); let frame = 0;
    const tick = (t: number) => { const p = reduced ? 1 : Math.min((t - time) / 900, 1); current.current = start + (target - start) * (1 - (1 - p) ** 3); setShown(current.current); if (p < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <>{shown.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</>;
}
export function Ring({ progress, kind, children }: { progress: number; kind: 'players' | 'time'; children: React.ReactNode }) {
  return <div className={`stat-ring ring-${kind}`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" className="ring-track" /><circle cx="50" cy="50" r="45" className="ring-fill" strokeDasharray={`${Math.max(0, Math.min(1, progress)) * 283} 283`} /></svg><div>{children}</div></div>;
}
export function LotteryGlobe({ tickets, drawing = false }: { tickets: string[]; drawing?: boolean }) {
  const reduced = useReducedMotion();
  return <div className={`lottery-machine ${drawing ? 'is-drawing' : ''}`} aria-label={`Boule de loterie : ${tickets.length} billets`}>
    <div className="machine-orbit orbit-one" /><div className="machine-orbit orbit-two" />
    <div className="globe"><div className="globe-reflection" /><div className="globe-reflection-small" /><div className="globe-equator" />
      {!tickets.length && !drawing && <div className="empty-globe"><TicketIcon size={40} strokeWidth={1} /><span>Ta chance commence ici</span><strong>Sois le premier !</strong><div className="empty-ball ball-one" /><div className="empty-ball ball-two" /><div className="empty-ball ball-three" /></div>}
      <AnimatePresence>{tickets.map((address, i) => {
        const angle = i * 2.399; const radius = 38 + (i % 3) * 19; const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius + 24;
        return <motion.div key={`${address}-${i}`} className={`lottery-ball ball-color-${i % 4}`} initial={{ x, y: -210, opacity: 0, scale: .5 }} animate={reduced ? { x, y, opacity: 1, scale: 1 } : drawing ? { x: [x, -y, -x, y, x], y: [y, x, -y, -x, y], rotate: [0, 360], opacity: 1, scale: 1 } : { x: [x, x + 14, x - 8, x], y: [y, y - 22, y + 7, y], opacity: 1, scale: 1 }} transition={drawing ? { duration: .55, repeat: Infinity, ease: 'linear' } : { x: { duration: 6 + i % 3, repeat: Infinity }, y: { duration: 5 + i % 4, repeat: Infinity }, opacity: { duration: .3 }, scale: { type: 'spring', bounce: .5 } }}><Identicon address={address} size={33} /></motion.div>;
      })}</AnimatePresence>
      <div className="globe-rim" />
    </div><div className="machine-neck" /><div className="machine-base"><div className="base-top" /><div className="base-face"><span>BLOCKLUCKY</span><div className="base-light" /></div><div className="base-bottom" /></div><div className="machine-shadow" />
    <span className="machine-spark spark-one">✦</span><span className="machine-spark spark-two">✧</span><span className="machine-spark spark-three">✦</span>
  </div>;
}
export function TicketCard({ ticket }: { ticket: Ticket }) {
  return <motion.div className="physical-ticket" initial={{ y: -35, opacity: 0, rotate: -4 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', bounce: .35 }}><div className="ticket-main"><div className="ticket-brand"><TicketIcon size={16} /> BlockLucky <span>PARTIE #{ticket.round}</span></div><div className="ticket-owner"><Identicon address={ticket.address} /><span>{shortAddress(ticket.address)}</span></div>{ticket.hash ? <a href={`${EXPLORER}/tx/${ticket.hash}`} target="_blank" rel="noreferrer" className="ticket-stamp"><Check size={12} /> VALIDÉ SUR LA BLOCKCHAIN <ArrowUpRight size={12} /></a> : <span className="ticket-stamp"><Check size={12} /> {ticket.demo ? 'TICKET DE DÉMONSTRATION' : 'VALIDÉ SUR LA BLOCKCHAIN'}</span>}</div><div className="ticket-stub"><span>TICKET</span><strong>#{ticket.number.toString().padStart(2, '0')}</strong><div className="ticket-barcode" /></div></motion.div>;
}
export function WinnerCelebration({ win, account, onClose }: { win: Win; account: string; onClose: () => void }) {
  const [revealed, setRevealed] = useState(false); const [extracted, setExtracted] = useState(false); const reduced = useReducedMotion();
  useEffect(() => { const timer = setTimeout(() => { setRevealed(true); if (!reduced) { const styles = getComputedStyle(document.documentElement); const colors = ['--gold', '--primary', '--pink', '--cyan'].map(c => styles.getPropertyValue(c).trim()); void confetti({ particleCount: 160, spread: 100, origin: { y: .5 }, colors }); setTimeout(() => { void confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: .65 } }); void confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: .65 } }); }, 400); } }, reduced ? 100 : 3900); const extraction = setTimeout(() => setExtracted(true), reduced ? 50 : 3000); return () => { clearTimeout(timer); clearTimeout(extraction); }; }, [reduced]);
  useEffect(() => { const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null; const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') { const controls = Array.from(document.querySelectorAll<HTMLElement>('.winner-content button, .winner-content a')); const first = controls[0]; const last = controls.at(-1); if (e.shiftKey && document.activeElement === first && last) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last && first) { e.preventDefault(); first.focus(); } } }; document.addEventListener('keydown', handler); return () => { document.removeEventListener('keydown', handler); previous?.focus(); }; }, [onClose]);
  return <div className="winner-overlay" role="dialog" aria-modal="true" aria-labelledby="winner-title"><div className="winner-content"><Button variant="ghost" size="icon" className="winner-close" aria-label="Fermer le résultat" onClick={onClose} autoFocus><X /></Button>{!revealed ? <><div className="eyebrow text-gold">LE GRAND MOMENT</div><h2 id="winner-title">La chance fait son tour…</h2><div className="draw-scene"><LotteryGlobe tickets={win.tickets} drawing={!extracted} />{extracted && <motion.div className="extracted-ball" initial={{ y: 80, scale: .3, opacity: 0 }} animate={{ y: -30, scale: 1.5, opacity: 1, rotate: 360 }} transition={{ duration: .8, ease: "easeOut" }}><Identicon address={win.address} size={48} /></motion.div>}</div></> : <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="winner-reveal"><div className="winner-avatar"><Identicon address={win.address} size={88} /><Trophy size={32} /></div><div className="eyebrow text-gold">{win.demo ? 'RÉSULTAT SIMULÉ' : 'LE CONTRAT A DÉSIGNÉ LE GAGNANT'}</div><h2 id="winner-title">{win.address.toLowerCase() === account.toLowerCase() ? "🎉 C’est toi !" : 'La chance a choisi !'}</h2><p className="font-mono">{shortAddress(win.address)}</p><div className="winner-prize"><AnimatedAmount value={win.prize} /><span>ETH</span></div><p>{win.demo ? 'Une pluie de confettis. Zéro argent réel.' : 'La cagnotte a été attribuée par le contrat.'}</p>{!win.demo && <Button variant="gold" asChild><a href={win.hash ? `${EXPLORER}/tx/${win.hash}` : `${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Voir la preuve sur Etherscan <ArrowUpRight /></a></Button>}<Button variant="outline" onClick={onClose}>Retour à la nouvelle partie <ArrowUpRight /></Button></motion.div>}</div></div>;
}

