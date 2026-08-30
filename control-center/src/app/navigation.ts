export type ControlCenterSectionId =
  | 'today'
  | 'players'
  | 'game'
  | 'liveops'
  | 'operations'
  | 'administration';

export type SectionAvailability = 'backend-ready' | 'foundation' | 'planned';

export interface ControlCenterSection {
  id: ControlCenterSectionId;
  label: string;
  shortLabel: string;
  description: string;
  glyph: string;
  availability: SectionAvailability;
  requiredAnyCapability: readonly string[];
}

export const CONTROL_CENTER_SECTIONS: readonly ControlCenterSection[] = [
  {
    id: 'today',
    label: 'Hoje',
    shortLabel: 'Hoje',
    description: 'Saúde do RPG, pendências e trabalho prioritário.',
    glyph: '◉',
    availability: 'foundation',
    requiredAnyCapability: [],
  },
  {
    id: 'players',
    label: 'Jogadores',
    shortLabel: 'Players',
    description: 'Player 360, suporte, Pokémon, economia e histórico.',
    glyph: '◎',
    availability: 'backend-ready',
    requiredAnyCapability: ['player.read'],
  },
  {
    id: 'game',
    label: 'Jogo',
    shortLabel: 'Jogo',
    description: 'Conteúdo, drafts, validação, releases e balanceamento.',
    glyph: '◇',
    availability: 'backend-ready',
    requiredAnyCapability: [
      'content.draft.create',
      'content.draft.edit',
      'content.validate',
      'content.publish',
    ],
  },
  {
    id: 'liveops',
    label: 'LiveOps',
    shortLabel: 'LiveOps',
    description: 'Eventos, segmentos, agenda, overrides e batches.',
    glyph: '✦',
    availability: 'planned',
    requiredAnyCapability: [],
  },
  {
    id: 'operations',
    label: 'Operações',
    shortLabel: 'Ops',
    description: 'Runtime, filas, incidentes, batalhas e recuperação.',
    glyph: '△',
    availability: 'foundation',
    requiredAnyCapability: ['audit.read', 'battle.read', 'admin_operation.read'],
  },
  {
    id: 'administration',
    label: 'Administração',
    shortLabel: 'Admin',
    description: 'Equipe, permissões, aprovações, auditoria e segurança.',
    glyph: '⬡',
    availability: 'backend-ready',
    requiredAnyCapability: [
      'audit.read',
      'admin_operation.read',
      'admin.role.manage',
      'admin.role.assign',
    ],
  },
] as const;

export function canSeeSection(
  section: ControlCenterSection,
  effectiveCapabilities: ReadonlySet<string>,
): boolean {
  if (section.requiredAnyCapability.length === 0) return true;
  return section.requiredAnyCapability.some((capability) => effectiveCapabilities.has(capability));
}

export function visibleSections(
  effectiveCapabilities: ReadonlySet<string>,
): readonly ControlCenterSection[] {
  return CONTROL_CENTER_SECTIONS.filter((section) => canSeeSection(section, effectiveCapabilities));
}
