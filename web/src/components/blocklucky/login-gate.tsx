import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, LoaderCircle, ShieldCheck, Sparkles, Wallet } from './icons';
import logo from '@/assets/blocklucky-logo.png';
import cover from '@/assets/digital-playground.jpg';

interface LoginGateProps {
  open: boolean;
  loading: boolean;
  mobile: boolean;
  error: string;
  missingWallet: boolean;
  onConnect: () => void;
  onDemo: () => void;
  onBrowse: () => void;
  onOpenInApp: () => void;
}

/** Écran de connexion affiché à l'arrivée, tant qu'aucun portefeuille n'est connecté. */
export function LoginGate({ open, loading, mobile, error, missingWallet, onConnect, onDemo, onBrowse, onOpenInApp }: LoginGateProps) {
  const reduced = useReducedMotion();
  return <AnimatePresence>
    {open && <motion.div key="login" className="login-gate" role="dialog" aria-modal="true" aria-labelledby="login-title"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: reduced ? 0 : -40 }} transition={{ duration: reduced ? 0 : .5, ease: [.22, 1, .36, 1] }}>
      <img src={cover} alt="" className="login-cover" />
      <motion.div className="login-card" initial={{ opacity: 0, y: reduced ? 0 : 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : .15, ease: [.22, 1, .36, 1] }}>
        <img src={logo} width={64} height={64} alt="" className="login-logo" />
        <span className="login-eyebrow">LA GRANDE TOMBOLA D’ETHERBAY</span>
        <h1 id="login-title" className="login-title">Block<em>Lucky</em><span>.</span></h1>
        <p className="login-text">Connecte ton portefeuille et prends ta place dans la boule.</p>
        <Button variant="gold" size="lg" className="login-connect" onClick={onConnect} disabled={loading} autoFocus>
          {loading ? <LoaderCircle className="animate-spin" /> : <Wallet />}
          <span>{loading ? (mobile ? 'Ouverture de MetaMask…' : 'Connexion…') : 'Se connecter avec MetaMask'}</span>
        </Button>
        <p className="login-hint">{mobile ? 'L’appli MetaMask va s’ouvrir : valide, puis reviens ici.' : 'MetaMask va te demander de valider la connexion.'}</p>
        {error && <p className="login-error" role="alert">
          {error}
          {missingWallet && <> {mobile && <><button type="button" onClick={onOpenInApp}>Ouvrir dans l’appli MetaMask</button> · </>}<a href="https://metamask.io/download" target="_blank" rel="noreferrer">Installer MetaMask <ArrowUpRight size={12} /></a></>}
        </p>}
        <div className="login-secondary">
          <Button variant="outline" onClick={onDemo}><Sparkles size={16} /> Essayer la démo sans portefeuille</Button>
          <button type="button" className="login-browse" onClick={onBrowse}>Juste regarder la tombola</button>
        </div>
        <span className="login-footnote"><ShieldCheck size={13} /> Réseau de test Sepolia · ethers fictifs · aucune valeur réelle</span>
        <span className="login-footnote">Réservé aux 18 ans et plus · Jeu responsable : 09 74 75 13 13</span>
      </motion.div>
    </motion.div>}
  </AnimatePresence>;
}
