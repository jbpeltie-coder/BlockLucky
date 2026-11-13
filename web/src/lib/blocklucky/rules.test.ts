import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Interface, parseEther } from 'ethers';
import { ABI, CHAIN_ID, CHAIN_HEX, CONTRACT_ADDRESS } from './config';
import { DEMO_RULES, canDraw, chance, frenchError, purchaseRestriction } from './rules';
describe('Sepolia lottery rules', () => {
  it('uses only the specified Sepolia contract and chain', () => { expect(CHAIN_ID).toBe(11155111); expect(CHAIN_HEX).toBe('0xaa36a7'); const deployed = JSON.parse(readFileSync(resolve(process.cwd(), '../deployments/sepolia.json'), 'utf8')) as { address: string }; expect(CONTRACT_ADDRESS).toBe(deployed.address); });
  it('simulates tickets at exactly 0.01 ETH', () => expect(DEMO_RULES.price).toBe(parseEther('0.01')));
  it('simulates at most five distinct players', () => expect(DEMO_RULES.maxPlayers).toBe(5));
  it('starts the demo with a 600-second round duration', () => expect(DEMO_RULES.duration).toBe(600));
  it('rejects a third ticket per player', () => { expect(purchaseRestriction(DEMO_RULES, 2, 0, 100, parseEther('1'))).toContain('2 tickets'); expect(purchaseRestriction(DEMO_RULES, 1, 0, 100, parseEther('1'))).toBe(''); });
  it('blocks purchases at the deadline, not a second earlier', () => { expect(purchaseRestriction(DEMO_RULES, 0, 600, 600, parseEther('1'))).toContain('Temps écoulé'); expect(purchaseRestriction(DEMO_RULES, 0, 600, 599, parseEther('1'))).toBe(''); });
  it('reserves exactly 0.002 ETH for fees', () => { expect(purchaseRestriction(DEMO_RULES, 0, 0, 100, parseEther('0.011999'))).toContain('Solde insuffisant'); expect(purchaseRestriction(DEMO_RULES, 0, 0, 100, parseEther('0.012'))).toBe(''); });
  it('reads supplied contract limits rather than hardcoding demo limits', () => { expect(purchaseRestriction({ ...DEMO_RULES, maxTickets: 3 }, 2, 0, 0, parseEther('1'))).toBe(''); });
  it('allows public drawing only when there are players and time has elapsed', () => { expect(canDraw(600, 600, 1)).toBe(true); expect(canDraw(600, 599, 1)).toBe(false); expect(canDraw(0, 1000, 0)).toBe(false); });
  it('computes chances by ticket count not player count', () => { expect(chance(2, 5)).toBe(40); expect(chance(1, 5)).toBe(20); expect(chance(0, 0)).toBe(0); });
  it('maps the contract error and wallet rejection to French', () => { expect(frenchError({ data: new Interface(ABI).encodeErrorResult('WrongTicketPrice', [1n, 2n]) })).toBe('Montant incorrect.'); expect(frenchError({ code: 4001 })).toBe('Transaction annulée.'); });
});
