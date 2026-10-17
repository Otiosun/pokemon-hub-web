export type AdminPremiumSearchKind = 'empty' | 'uuid' | 'whatsapp' | 'name';

export type AdminPremiumSearchQuery =
  | { kind: 'empty'; raw: string }
  | { kind: 'uuid'; raw: string; playerId: string }
  | { kind: 'whatsapp'; raw: string; digits: string; externalId: string }
  | { kind: 'name'; raw: string; trainerNamePrefix: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WHATSAPP_JID_PATTERN = /^(\d{10,15})@s\.whatsapp\.net$/i;

export function normalizeAdminPremiumWhatsApp(value: string): {
  digits: string;
  externalId: string;
} | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const jidMatch = trimmed.match(WHATSAPP_JID_PATTERN);
  if (jidMatch?.[1]) {
    return {
      digits: jidMatch[1],
      externalId: `${jidMatch[1]}@s.whatsapp.net`,
    };
  }

  const digits = trimmed.replace(/\D+/g, '');
  const looksPhoneLike = /^[+\d() .-]+$/.test(trimmed);
  if (!looksPhoneLike || digits.length < 10 || digits.length > 15) return null;

  return { digits, externalId: `${digits}@s.whatsapp.net` };
}

export function classifyAdminPremiumSearch(rawValue: string): AdminPremiumSearchQuery {
  const raw = rawValue.trim();
  if (raw.length === 0) return { kind: 'empty', raw };
  if (UUID_PATTERN.test(raw)) return { kind: 'uuid', raw, playerId: raw };

  const whatsapp = normalizeAdminPremiumWhatsApp(raw);
  if (whatsapp !== null) {
    return {
      kind: 'whatsapp',
      raw,
      digits: whatsapp.digits,
      externalId: whatsapp.externalId,
    };
  }

  return { kind: 'name', raw, trainerNamePrefix: raw };
}

export function maskedWhatsAppDigits(digits: string): string {
  if (digits.length <= 4) return '••••';
  const visibleTail = digits.slice(-4);
  return `${'•'.repeat(Math.min(8, digits.length - 4))}${visibleTail}`;
}
