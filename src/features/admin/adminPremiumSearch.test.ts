import { describe, expect, it } from 'vitest';
import {
  classifyAdminPremiumSearch,
  maskedWhatsAppDigits,
  normalizeAdminPremiumWhatsApp,
} from './adminPremiumSearch';

describe('premium support search', () => {
  it('recognizes exact player UUIDs before other query kinds', () => {
    expect(classifyAdminPremiumSearch('8d4b4a82-bdc9-4e64-8dbe-f2b524c61019')).toEqual({
      kind: 'uuid',
      raw: '8d4b4a82-bdc9-4e64-8dbe-f2b524c61019',
      playerId: '8d4b4a82-bdc9-4e64-8dbe-f2b524c61019',
    });
  });

  it('normalizes Brazilian-style phone input to the Baileys player identity', () => {
    expect(normalizeAdminPremiumWhatsApp('+55 (79) 99999-1234')).toEqual({
      digits: '5579999991234',
      externalId: '5579999991234@s.whatsapp.net',
    });
  });

  it('accepts an already canonical WhatsApp JID', () => {
    expect(classifyAdminPremiumSearch('5579999991234@s.whatsapp.net')).toEqual({
      kind: 'whatsapp',
      raw: '5579999991234@s.whatsapp.net',
      digits: '5579999991234',
      externalId: '5579999991234@s.whatsapp.net',
    });
  });

  it('treats ordinary text as a trainer-name prefix', () => {
    expect(classifyAdminPremiumSearch('  Ash Ketchum ')).toEqual({
      kind: 'name',
      raw: 'Ash Ketchum',
      trainerNamePrefix: 'Ash Ketchum',
    });
  });

  it('does not misclassify short numeric trainer names as phone numbers', () => {
    expect(classifyAdminPremiumSearch('12345')).toEqual({
      kind: 'name',
      raw: '12345',
      trainerNamePrefix: '12345',
    });
  });

  it('masks all but the final four digits for UI summaries', () => {
    expect(maskedWhatsAppDigits('5579999991234')).toBe('••••••••1234');
  });
});
