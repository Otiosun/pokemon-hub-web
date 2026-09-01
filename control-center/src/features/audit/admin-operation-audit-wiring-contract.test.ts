import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cardPath = fileURLToPath(new URL('./AdminOperationAuditCard.tsx', import.meta.url));
const appPath = fileURLToPath(new URL('../../App.tsx', import.meta.url));

describe('AdminOperation audit reconstruction wiring', () => {
  it('keeps audit lookup explicit, read-only, allowlisted and free of lifecycle controls', async () => {
    const card = await readFile(cardPath, 'utf8');

    expect(card).toContain('getAdminOperationAudit');
    expect(card).toContain('Consultar auditoria');
    expect(card).toContain('operationId');
    expect(card).toContain('correlationId');
    expect(card).toContain('reasonRecorded');
    expect(card).toContain('timeline');
    expect(card).toContain('Política registrada');
    expect(card).toContain('Linha do tempo');
    expect(card).not.toContain('useEffect');
    expect(card).not.toContain('setInterval');
    expect(card).not.toContain('prepareOperation');
    expect(card).not.toMatch(/simulateOperation|confirmOperation|approveOperation|applyOperation/i);
    expect(card).not.toMatch(/retry|replay|requeue|compensar/i);
    expect(card).not.toMatch(/operation\.input|operation\.result|requestFingerprint|idempotencyKey/i);
    expect(card).not.toMatch(/\bpayload\b|\bmetadata\b|beforeData|afterData/i);
  });

  it('wires audit.read capability to the authenticated card without broadening HTTP authority', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain("import { AdminOperationAuditCard }");
    expect(app).toContain("capabilities.has('audit.read')");
    expect(app).toContain('<AdminOperationAuditCard');
    expect(app).toContain('client={client}');
    expect(app).toContain('READ + PREPARE · ADMIN API');
  });
});
