import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUpRight, ShieldCheck, Sparkles } from './icons';
import playground from '@/assets/digital-playground.jpg';
import laptop from '@/assets/digital-laptop.png';
import headphones from '@/assets/digital-headphones.png';
import tokens from '@/assets/digital-tokens.png';

export function DigitalIntro({ onPlay, onDemo, demo, busy }: { onPlay: () => void; onDemo: () => void; demo: boolean; busy: boolean }) {
  const reduced = useReducedMotion();
  const pointer = useMotionValue(0);
  const smooth = useSpring(pointer, { stiffness: 40, damping: 28 });
  const x = useTransform(smooth, [-1, 1], [-6, 6]);
  return <>
    <section className="digital-intro" aria-labelledby="digital-title" onPointerMove={event => {
      if (reduced || event.pointerType === 'touch') return;
      const rect = event.currentTarget.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    }} onPointerLeave={() => pointer.set(0)}>
      <motion.img style={{ x: reduced ? 0 : x }} src={playground} width={1536} height={1024} alt="Composition tech : ordinateur argenté, casque, manette et jetons crypto dorés" className="digital-cover" />
      <div className="digital-intro-content">
        <motion.div className="digital-edition" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>LA TOMBOLA D’ETHERBAY</motion.div>
        <motion.h1 id="digital-title" aria-label="BlockLucky" initial={{ opacity: 0, y: reduced ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .9, ease: [.22, 1, .36, 1], delay: .1 }}><span className="digital-block">Block</span><span className="digital-lucky">Lucky<span className="digital-heading-period">.</span></span></motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .35 }}>Un ticket. Une chance.<br /><strong>Le prochain gagnant, c’est peut-être toi.</strong></motion.p>
        <div className="digital-intro-actions"><Button variant="gold" onClick={onPlay}>À toi de jouer <ArrowUpRight size={20} /></Button><Button variant="outline" onClick={onDemo} disabled={busy}>{demo ? 'Quitter la démo' : 'Essayer la démo'} <Sparkles size={17} /></Button></div>
        <span className="digital-testnet"><ShieldCheck size={13} /> Sepolia · Ethers fictifs · Aucune valeur réelle</span>
      </div>
      <div className="digital-intro-bottom"><span>EPITECH DIGITAL SCHOOL</span><Button variant="nav" onClick={onPlay} aria-label="Découvrir la tombola"><ArrowDown size={18} /></Button></div>
    </section>
  </>;
}

export function DigitalUniverse() {
  const reduced = useReducedMotion();
  return <section className="digital-universe" aria-label="L’univers tech de BlockLucky">
    <div className="digital-universe-heading"><span>LE DIGITAL A SON TERRAIN DE JEU.</span><h2>Tech dans l’âme.<br /><em>Chance</em> entre les mains.</h2><p>L’univers BlockLucky. La culture tech, l’énergie du jeu.</p></div>
    <div className="digital-objects">
      {[{ src: laptop, name: 'BUILD', alt: 'Ordinateur portable argenté et écran violet' }, { src: tokens, name: 'PLAY', alt: 'Jetons Ethereum en or' }, { src: headphones, name: 'CONNECT', alt: 'Casque audio blanc et argenté' }].map((item, i) => <motion.figure key={item.name} initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: reduced ? 0 : .85, ease: [.22, 1, .36, 1], delay: i * .08 }}><span className="digital-object-index">0{i + 1} /</span><img src={item.src} width={1024} height={1024} alt={item.alt} loading="lazy" /><figcaption>{item.name}</figcaption></motion.figure>)}
    </div>
  </section>;
}
