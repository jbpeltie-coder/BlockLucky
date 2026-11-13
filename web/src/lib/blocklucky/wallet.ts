// Choix du portefeuille, séparé de la logique de la loterie.
// 1. Extension MetaMask (ordinateur) ou navigateur intégré de l'appli MetaMask : window.ethereum, utilisé directement.
// 2. Sinon : MetaMask SDK. Sur téléphone, il ouvre l'appli MetaMask pour valider puis ramène sur le site ;
//    sur ordinateur sans extension, il affiche un QR code à scanner avec l'appli.
import type { Eip1193Provider } from 'ethers';
import type { MetaMaskSDK } from '@metamask/sdk';

export type Ethereum = Eip1193Provider & {
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
};
declare global { interface Window { ethereum?: Ethereum } }

const SESSION_KEY = 'blocklucky:metamask-sdk';
let sdkPromise: Promise<MetaMaskSDK> | null = null;
let sdkWallet: Ethereum | null = null;

export const isMobile = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const injectedWallet = (): Ethereum | undefined => (typeof window === 'undefined' ? undefined : window.ethereum);
/** True quand la connexion passe par l'appli MetaMask (SDK) et non par une extension. */
export const usingSdk = () => !injectedWallet() && !!sdkWallet;
/** Ouvre le site dans le navigateur intégré de l'appli MetaMask (solution de secours sur téléphone). */
export const openInMetaMaskApp = () => { window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`; };

const hasSdkSession = () => { try { return localStorage.getItem(SESSION_KEY) === '1'; } catch { return false; } };
const rememberSdkSession = (on: boolean) => { try { if (on) localStorage.setItem(SESSION_KEY, '1'); else localStorage.removeItem(SESSION_KEY); } catch { /* stockage indisponible */ } };

function loadSdk(): Promise<MetaMaskSDK> {
  if (!sdkPromise) {
    sdkPromise = import('@metamask/sdk').then(async ({ MetaMaskSDK }) => {
      const sdk = new MetaMaskSDK({
        dappMetadata: { name: 'BlockLucky', url: window.location.origin },
        checkInstallationImmediately: false,
        injectProvider: false,
        enableAnalytics: false,
        preferDesktop: false,
      });
      await sdk.init();
      return sdk;
    }).catch(err => { sdkPromise = null; throw err; });
  }
  return sdkPromise;
}

/** Portefeuille déjà disponible sans rien demander (extension, appli MetaMask, ou session SDK précédente). */
export async function existingWallet(): Promise<Ethereum | undefined> {
  const injected = injectedWallet();
  if (injected) return injected;
  if (sdkWallet) return sdkWallet;
  if (!hasSdkSession()) return undefined;
  try {
    const provider = (await loadSdk()).getProvider();
    if (provider) sdkWallet = provider as unknown as Ethereum;
    return sdkWallet ?? undefined;
  } catch {
    rememberSdkSession(false);
    return undefined;
  }
}

/** Demande la connexion : extension si présente, sinon appli MetaMask (redirection sur téléphone, QR code sur ordinateur). */
export async function requestWallet(): Promise<Ethereum> {
  const injected = injectedWallet();
  if (injected) return injected;
  const sdk = await loadSdk();
  await sdk.connect();
  const provider = sdk.getProvider();
  if (!provider) throw new Error('MetaMask indisponible');
  sdkWallet = provider as unknown as Ethereum;
  rememberSdkSession(true);
  return sdkWallet;
}
