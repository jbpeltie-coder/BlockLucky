import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import logo from '@/assets/blocklucky-logo.png';
import cover from '@/assets/digital-playground.jpg';

export function ExperienceMotion() {
  const [opening, setOpening] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpening(false);
      return;
    }
    let active = true;
    const image = new Image();
    image.src = cover;
    const deadline = window.setTimeout(() => setOpening(false), 2400);
    const minimum = new Promise<void>(resolve => window.setTimeout(resolve, 650));
    void Promise.all([image.decode().catch(() => undefined), document.fonts.ready, minimum]).then(() => {
      if (active) setOpening(false);
    });
    return () => { active = false; window.clearTimeout(deadline); };
  }, []);

  useEffect(() => {
    if (opening || reduced) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const animation = entry.target.animate([
          { opacity: .2, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 900, easing: 'cubic-bezier(.22,1,.36,1)' });
        animations.push(animation);
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('.hero-heading, .section-heading, .step, .transparency-intro, .guarantee, .digital-universe-heading').forEach(element => observer.observe(element));
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [opening, reduced]);

  return <AnimatePresence>
    {opening && <motion.div className="opening-screen" key="opening" role="status" aria-label="Chargement de BlockLucky" initial={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: reduced ? 0 : .8, ease: [.76, 0, .24, 1] }}>
      <div className="opening-identity">
        <motion.img src={logo} width={72} height={72} alt="" animate={reduced ? {} : { rotate: [0, 90, 90] }} transition={{ duration: 1.6, ease: [.22, 1, .36, 1], repeat: Infinity }} />
        <div className="opening-name">Block<em>Lucky</em><span>.</span></div>
        <span className="opening-caption">La chance prend place.</span>
        <div className="opening-track" aria-hidden="true"><motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.2, ease: [.22, 1, .36, 1] }} /></div>
      </div>
      <Button variant="ghost" className="opening-skip" onClick={() => setOpening(false)}>Passer l’introduction</Button>
      <span className="opening-footer">ETHERBAY / EPITECH DIGITAL</span>
    </motion.div>}
  </AnimatePresence>;
}