import type { Player360Overview } from '../../lib/api/admin-api';
import { parsePlayer360Economy } from './player360-economy';

export interface PlayerContextualAction {
  readonly operationType:
    | 'inventory.adjust'
    | 'wallet.adjust'
    | 'progression.trainer.adjust'
    | 'pokemon.create'
    | 'battle.force_cancel'
    | 'battle.correct_state'
    | 'encounter.close';
  readonly label: string;
  readonly description: string;
  readonly capability: string;
  readonly riskTier: 2 | 3;
  readonly targetKind: 'PLAYER';
  readonly requiresReason: true;
  readonly requiresExpectedRevision: boolean;
  readonly requiresConfirmation: boolean;
  readonly context: 'PLAYER' | 'ACTIVE_BATTLE' | 'ACTIVE_ENCOUNTER';
}

const PLAYER_ACTIONS: readonly PlayerContextualAction[] = [
  {
    operationType: 'inventory.adjust',
    label: 'Corrigir inventário',
    description: 'Preparar ajuste de quantidade de item pelo owner de inventário.',
    capability: 'inventory.adjust',
    riskTier: 2,
    targetKind: 'PLAYER',
    requiresReason: true,
    requiresExpectedRevision: false,
    requiresConfirmation: false,
    context: 'PLAYER',
  },
  {
    operationType: 'wallet.adjust',
    label: 'Corrigir saldo',
    description: 'Preparar ajuste de moeda pelo owner de economia.',
    capability: 'wallet.adjust',
    riskTier: 2,
    targetKind: 'PLAYER',
    requiresReason: true,
    requiresExpectedRevision: false,
    requiresConfirmation: false,
    context: 'PLAYER',
  },
  {
    operationType: 'progression.trainer.adjust',
    label: 'Corrigir progressão',
    description: 'Preparar ajuste de progressão do treinador pelo owner canônico.',
    capability: 'progression.adjust',
    riskTier: 2,
    targetKind: 'PLAYER',
    requiresReason: true,
    requiresExpectedRevision: false,
    requiresConfirmation: false,
    context: 'PLAYER',
  },
  {
    operationType: 'pokemon.create',
    label: 'Criar Pokémon',
    description: 'Preparar criação administrativa vinculada ao jogador selecionado.',
    capability: 'pokemon.create',
    riskTier: 3,
    targetKind: 'PLAYER',
    requiresReason: true,
    requiresExpectedRevision: false,
    requiresConfirmation: true,
    context: 'PLAYER',
  },
  {
    operationType: 'battle.force_cancel',
    label: 'Cancelar batalha',
    description: 'Disponível somente enquanto existe batalha ativa para o jogador.',
    capability: 'battle.force_cancel',
    riskTier: 3,
    targetKind: 'PLAYER',
    requiresReason: true,
    requiresExpectedRevision: true,
    requiresConfirmation: true,
    context: 'ACTIVE_BATTLE',
  },
  {
    operationType: 'battle.correct_state',
    label: 'Corrigir estado da batalha',
    description: 'Preparar correção mecânica somente sobre batalha ativa.',
    capability: 'battle.correct_state',
    riskTier: 3,
    targetKind: 'PLAYER',
    requiresReason: true,
    requiresExpectedRevision: true,
    requiresConfirmation: true,
    context: 'ACTIVE_BATTLE',
  },
  {
    operationType: 'encounter.close',
    label: 'Fechar encounter',
    description: 'Disponível somente enquanto existe encounter ativo para o jogador.',
    capability: 'encounter.force_close',
    riskTier: 3,
    targetKind: 'PLAYER',
    requiresReason: true,
    requiresExpectedRevision: true,
    requiresConfirmation: true,
    context: 'ACTIVE_ENCOUNTER',
  },
] as const;

function hasValidEconomyTarget(
  player: Player360Overview,
  kind: 'inventory' | 'wallets',
): boolean {
  try {
    return parsePlayer360Economy(player)[kind].length > 0;
  } catch {
    return false;
  }
}

function contextAvailable(action: PlayerContextualAction, player: Player360Overview): boolean {
  if (action.operationType === 'inventory.adjust') return hasValidEconomyTarget(player, 'inventory');
  if (action.operationType === 'wallet.adjust') return hasValidEconomyTarget(player, 'wallets');
  if (action.context === 'ACTIVE_BATTLE') return player.activeBattle !== null;
  if (action.context === 'ACTIVE_ENCOUNTER') return player.activeEncounter !== null;
  return true;
}

export function contextualPlayerActions(
  capabilities: ReadonlySet<string>,
  player: Player360Overview,
): readonly PlayerContextualAction[] {
  return PLAYER_ACTIONS.filter(
    (action) => capabilities.has(action.capability) && contextAvailable(action, player),
  );
}
