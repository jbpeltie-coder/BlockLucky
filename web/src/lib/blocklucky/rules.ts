import { Interface, parseEther } from 'ethers';
import { ABI } from './config';
export interface Rules { price: bigint; maxPlayers: number; duration: number; maxTickets: number }
export const DEMO_RULES: Rules = { price: parseEther('0.01'), maxPlayers: 5, duration: 600, maxTickets: 2 };
export function purchaseRestriction(rules: Rules, owned: number, end: number, now: number, balance: bigint) {
  if (end > 0 && now >= end) return 'Temps écoulé : lance le tirage !';
  if (owned >= rules.maxTickets) return `Tu as déjà tes ${rules.maxTickets} tickets pour cette partie.`;
  if (balance < rules.price + parseEther('0.002')) return 'Solde insuffisant pour le ticket et les frais.';
  return '';
}
export function canDraw(end: number, now: number, playerCount: number) { return playerCount > 0 && end > 0 && now >= end; }
export function chance(owned: number, total: number) { return total > 0 ? owned / total * 100 : 0; }
const errors: Record<string, string> = {
  WrongTicketPrice: 'Montant incorrect.', TicketLimitReached: 'Tu as déjà tes 2 tickets pour cette partie.',
  RoundOver: 'Temps écoulé : lance le tirage !', RoundNotOver: "La partie n’est pas encore terminée.",
  NoPlayers: 'Aucun participant.', NothingToWithdraw: 'Aucun gain à récupérer.', TransferFailed: 'Le transfert a échoué. Réessaie.', Reentrancy: 'Transaction déjà en cours.',
};
export function frenchError(error: unknown) {
  const e = error as { code?: string | number; data?: string; error?: { data?: string; code?: number }; info?: { error?: { code?: number; data?: string } }; shortMessage?: string; message?: string; reason?: string };
  if (e.code === 'ACTION_REJECTED' || e.code === 4001 || e.error?.code === 4001 || e.info?.error?.code === 4001) return 'Transaction annulée.';
  if (e.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(e.message || '')) return 'Solde insuffisant : il faut un peu plus que 0,01 ETH pour couvrir les frais. Récupère des SepoliaETH gratuits avec le lien ci-dessous.';
  const data = e.data || e.error?.data || e.info?.error?.data;
  if (data) { try { const parsed = new Interface(ABI).parseError(data); if (parsed && errors[parsed.name]) return errors[parsed.name] ?? "Erreur du contrat."; } catch { /* RPC sometimes supplies non-ABI data. */ } }
  for (const [name, message] of Object.entries(errors)) if ((e.message || e.reason || '').includes(name)) return message;
  return 'Impossible de terminer cette opération. Vérifie MetaMask et ta connexion à Sepolia, puis réessaie.';
}
