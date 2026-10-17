import { useMemo, useState } from 'react';
import {
  changeAdminPlayerWhatsAppIdentity,
  type AdminPlayerIdentityChangeResult,
} from '../../player-api/playerPortalAdminIdentityClient';
import type { AdminPlayer360 } from '../../player-api/playerPortalAdminPlayersClient';
import { maskedWhatsAppDigits } from './adminPremiumSearch';
import './admin-premium-identity.css';

interface AdminPremiumIdentityPanelProps {
  readonly player: AdminPlayer360 | null;
  readonly onChanged: () => Promise<void>;
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; replayed: boolean; refreshFailed: boolean }
  | { status: 'error'; message: string };

function activeWhatsApp(player: AdminPlayer360): string {
  const identity = player.identities.find(
    (candidate) => candidate.provider === 'baileys' && candidate.status === 'ACTIVE',
  );
  if (identity?.externalId === null || identity?.externalId === undefined) return 'OCULTO';
  const digits = identity.externalId.split('@', 1)[0] ?? '';
  return maskedWhatsAppDigits(digits);
}

function rejectionMessage(result: Extract<AdminPlayerIdentityChangeResult, { status: 'rejected' }>) {
  switch (result.code) {
    case 'ADMIN_REVISION_CONFLICT':
      return 'O jogador mudou desde que foi carregado. Recarregue o Player 360 antes de tentar novamente.';
    case 'ADMIN_DOMAIN_OPERATION_REJECTED':
      return 'A troca foi recusada por conflito de identidade ou estado inconsistente. Confira o jogador e o número antes de repetir.';
    case 'ADMIN_IDEMPOTENCY_CONFLICT':
      return 'Esta tentativa não corresponde mais à operação preparada. Altere o formulário para iniciar uma nova tentativa.';
    default:
      return `A operação foi recusada pelo backend (${result.code}).`;
  }
}

export function AdminPremiumIdentityPanel({ player, onChanged }: AdminPremiumIdentityPanelProps) {
  const [newWhatsApp, setNewWhatsApp] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [attemptRequestId, setAttemptRequestId] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });

  const canSubmit = useMemo(
    () =>
      player !== null &&
      newWhatsApp.trim().length > 0 &&
      reason.trim().length > 0 &&
      confirmed &&
      submitState.status !== 'submitting',
    [confirmed, newWhatsApp, player, reason, submitState.status],
  );

  const resetAttempt = () => {
    setAttemptRequestId(null);
    if (submitState.status !== 'idle') setSubmitState({ status: 'idle' });
  };

  if (player === null) {
    return (
      <section className="premium-identity-empty">
        <span>GATE 4 · IDENTIDADE</span>
        <h3>Selecione um jogador primeiro.</h3>
        <p>
          Use a aba Resumo para localizar o treinador por nome, Player ID ou WhatsApp. A troca nunca
          cria outro jogador: ela move apenas o vínculo de identidade do Player ID selecionado.
        </p>
      </section>
    );
  }

  const submit = async () => {
    if (!canSubmit) return;
    const requestId = attemptRequestId ?? crypto.randomUUID();
    if (attemptRequestId === null) setAttemptRequestId(requestId);
    setSubmitState({ status: 'submitting' });

    try {
      const result = await changeAdminPlayerWhatsAppIdentity(player.player.id, {
        requestId,
        newWhatsApp: newWhatsApp.trim(),
        reason: reason.trim(),
        expectedRevision: player.player.revision,
        confirmed: true,
      });

      if (result.status === 'unauthenticated') {
        setSubmitState({ status: 'error', message: 'A sessão administrativa expirou.' });
        return;
      }
      if (result.status === 'forbidden') {
        setSubmitState({
          status: 'error',
          message: 'Esta sessão não possui o acesso owner necessário para trocar a identidade.',
        });
        return;
      }
      if (result.status === 'rejected') {
        setSubmitState({ status: 'error', message: rejectionMessage(result) });
        return;
      }

      setNewWhatsApp('');
      setReason('');
      setConfirmed(false);
      setAttemptRequestId(null);

      let refreshFailed = false;
      try {
        await onChanged();
      } catch {
        refreshFailed = true;
      }
      setSubmitState({ status: 'success', replayed: result.replayed, refreshFailed });
    } catch {
      setSubmitState({
        status: 'error',
        message:
          'Não foi possível confirmar a resposta da operação. Repita sem alterar o formulário: a mesma chave idempotente será reutilizada.',
      });
    }
  };

  return (
    <section className="premium-identity-panel" aria-labelledby="premium-identity-title">
      <header>
        <div>
          <span>GATE 4 · RISCO 4</span>
          <h3 id="premium-identity-title">Troca segura de número</h3>
          <p>
            Preserva o mesmo Player ID. O número completo só existe durante esta requisição e não é
            persistido no registro administrativo ou na auditoria.
          </p>
        </div>
        <strong>OWNER ONLY</strong>
      </header>

      <div className="premium-identity-target">
        <div>
          <span>TREINADOR</span>
          <strong>{player.profile.trainerName ?? 'Sem nome'}</strong>
        </div>
        <div>
          <span>WHATSAPP ATUAL</span>
          <strong>{activeWhatsApp(player)}</strong>
        </div>
        <div>
          <span>REVISION</span>
          <strong>{player.player.revision}</strong>
        </div>
        <div>
          <span>PLAYER ID</span>
          <code>{player.player.id}</code>
        </div>
      </div>

      <form
        className="premium-identity-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label>
          <span>NOVO WHATSAPP</span>
          <input
            type="tel"
            value={newWhatsApp}
            onChange={(event) => {
              setNewWhatsApp(event.currentTarget.value);
              resetAttempt();
            }}
            placeholder="+55 79 99999-9999"
            autoComplete="off"
            spellCheck={false}
            disabled={submitState.status === 'submitting'}
          />
          <small>O backend normaliza o número para a identidade Baileys canônica.</small>
        </label>

        <label>
          <span>MOTIVO</span>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.currentTarget.value);
              resetAttempt();
            }}
            maxLength={2000}
            rows={3}
            placeholder="Ex.: jogador confirmou perda do número anterior e solicitou migração."
            disabled={submitState.status === 'submitting'}
          />
        </label>

        <label className="premium-identity-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => {
              setConfirmed(event.currentTarget.checked);
              resetAttempt();
            }}
            disabled={submitState.status === 'submitting'}
          />
          <span>
            Confirmo que revisei o jogador selecionado e que esta troca deve preservar exatamente o
            Player ID acima.
          </span>
        </label>

        {submitState.status === 'success' ? (
          <div className="premium-identity-feedback is-success" role="status">
            <strong>TROCA APLICADA</strong>
            <span>
              {submitState.refreshFailed
                ? 'A troca foi aplicada, mas o Player 360 não pôde ser recarregado. Recarregue o jogador antes de outra ação.'
                : submitState.replayed
                  ? 'A operação já havia sido aplicada; o Player 360 foi atualizado.'
                  : 'O vínculo foi atualizado e o Player 360 foi recarregado.'}
            </span>
          </div>
        ) : null}

        {submitState.status === 'error' ? (
          <div className="premium-identity-feedback is-error" role="alert">
            <strong>OPERAÇÃO NÃO CONFIRMADA</strong>
            <span>{submitState.message}</span>
          </div>
        ) : null}

        <div className="premium-identity-actions">
          <p>
            Conflito com outro jogador, revision desatualizada ou drift de identidades interrompem a
            transação inteira.
          </p>
          <button type="submit" disabled={!canSubmit}>
            {submitState.status === 'submitting' ? 'APLICANDO…' : 'CONFIRMAR TROCA'}
          </button>
        </div>
      </form>
    </section>
  );
}
