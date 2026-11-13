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
export const usingSdk = () => !injectedWallet() && !!sdkWallet;
export const openInMetaMaskApp = () => { window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`; };

const hasSdkSession = () => { try { return localStorage.getItem(SESSION_KEY) === '1'; } catch { return false; } };
const rememberSdkSession = (on: boolean) => { try { if (on) localStorage.setItem(SESSION_KEY, '1'); else localStorage.removeItem(SESSION_KEY); } catch { return; } };

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
