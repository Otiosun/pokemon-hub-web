import { useRef, useState } from 'react';
import type { PremiumOrder } from '../../player-api/playerPortalAdminPremiumReadClient';
import { submitManualPremiumAction } from '../../player-api/playerPortalAdminPremiumActionsClient';

export function AdminPremiumOrderActions({
  order,
  onUpdated,
}: {
  order: PremiumOrder;
  onUpdated: () => void;
}) {
  const mode = order.status === 'PENDING' ? 'approve' : order.status === 'PAID' ? 'deliver' : null;
  const eligible = order.items.length === 1 && order.items[0]?.sku === '2XP'
    && !order.items[0]?.fulfilled;
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [done, setDone] = useState(false);
  const requestId = useRef<string | null>(null);

  if (!mode || !eligible) return null;

  const reset = () => {
    requestId.current = null;
    setResult('');
    setConfirmed(false);
  };

  const submit = async () => {
    if (busy || done || !confirmed || reason.trim().length < 8) return;
    setBusy(true);
    setResult('');
    try {
      requestId.current ??= crypto.randomUUID();
      const response = await submitManualPremiumAction(order.id, mode, {
        requestId: requestId.current,
        humanId: order.humanId,
        expectedRevision: order.revision,
        reason,
        confirmed: true,
      });
      if (response.status === 'ok') {
        setDone(true);
        setResult(mode === 'approve'
          ? 'Pagamento aprovado e registrado. O XP 2× ainda não foi entregue.'
          : 'Entrega registrada. O XP 2× foi processado pelo serviço oficial.');
        onUpdated();
        return;
      }
      const messages = {
        unavailable: 'A API de aprovação ainda não foi publicada. Nada foi alterado.',
        unauthenticated: 'Sua sessão expirou. Entre novamente no Hub.',
        forbidden: 'Você não tem permissão de proprietário.',
        stale: 'O pedido mudou de estado. Atualize a consulta antes de agir.',
        error: 'A operação não foi confirmada pelo servidor. Confira o histórico e tente novamente.',
      } as const;
      setResult(messages[response.status]);
    } catch {
      setResult('Não foi possível confirmar a resposta do servidor. Confira o pedido antes de tentar novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="premium-order-admin-actions">
      <header>
        <strong>{mode === 'approve' ? 'APROVAÇÃO ADMINISTRATIVA' : 'ENTREGA DO XP 2×'}</strong>
        <span>{mode === 'approve' ? 'PEDIDO PENDENTE' : 'PAGAMENTO APROVADO'}</span>
      </header>
      <p>{mode === 'approve'
        ? 'Confirme somente depois de analisar a solicitação. O administrador é responsável pela aprovação; isto não cobra automaticamente.'
        : 'Esta é uma operação separada: o pedido já foi aprovado e a entrega será feita uma única vez pelo servidor.'}</p>
      <label>
        Motivo ou observação do administrador
        <textarea
          rows={2}
          minLength={8}
          maxLength={400}
          value={reason}
          disabled={busy || done}
          placeholder="Registre brevemente o que foi verificado."
          onChange={(event) => { reset(); setReason(event.currentTarget.value); }}
        />
      </label>
      <label className="premium-order-admin-confirm">
        <input type="checkbox" checked={confirmed} disabled={busy || done}
          onChange={(event) => { setConfirmed(event.currentTarget.checked); setResult(''); }}/>
        <span>{mode === 'approve'
          ? `Revisei o pedido ${order.humanId} e autorizo registrar o pagamento.`
          : `Revisei o pedido ${order.humanId} e autorizo entregar XP 2×.`}</span>
      </label>
      <button type="button" disabled={busy || done || !confirmed || reason.trim().length < 8}
        onClick={() => void submit()}>
        {busy ? 'PROCESSANDO…' : done ? 'REGISTRADO' : mode === 'approve' ? 'APROVAR PAGAMENTO' : 'ENTREGAR XP 2×'}
      </button>
      {result ? <p className={done ? 'is-success' : 'is-warning'} role="status">{result}</p> : null}
    </div>
  );
}
