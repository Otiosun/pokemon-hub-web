export const CATALOG_DRAFT_BACKEND_CONTRACT = Object.freeze({
  backendHead: '158e431aa3f31b0f3617476888fed7edaf552c44',
  draftContractsBlob: '0c0921b123c8fcb10f0fdaa464b2075152d1124e',
  catalogContractsBlob: 'dc27030d7a2da6557d0655cf0f6b901e1ffc1ba7',
  encounterContractsBlob: 'c681e56b04913a199eeb0c26341400f034e7d651',
  validationBlob: 'a8f81ce5a9ce8761ee74e11fcd6d04d9386bfc1f',
});

export type CatalogDraftResourceKind =
  | 'SPECIES'
  | 'MOVE'
  | 'ITEM'
  | 'AREA'
  | 'ENCOUNTER_TABLE'
  | 'REWARD'
  | 'EFFECT';

export type CatalogDraftFormMode = 'create' | 'replace';

export type CatalogDraftReferenceKind =
  | 'POKEMON_TYPE'
  | 'REGION'
  | 'AREA'
  | 'POKEMON_FORM'
  | 'ITEM'
  | 'CURRENCY';

export type HumanFieldControl =
  | 'text'
  | 'slug'
  | 'integer'
  | 'select'
  | 'reference'
  | 'token'
  | 'toggle'
  | 'structured-object'
  | 'effect-config'
  | 'move-flags'
  | 'encounter-conditions'
  | 'encounter-entry-list'
  | 'reward-program'
  | 'effect-program'
  | 'raw-json';

export interface HumanFieldDescriptor {
  readonly key: string;
  readonly label: string;
  readonly control: HumanFieldControl;
  readonly valueType?: 'string' | 'integer' | 'boolean' | 'uuid' | 'object' | 'array';
  readonly required: boolean;
  readonly nullable?: boolean;
  readonly options?: readonly string[];
  readonly referenceKind?: CatalogDraftReferenceKind;
  readonly fixedVersion?: 1;
  readonly rawJson?: false;
  readonly defaultValue?: unknown;
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly itemSchema?: Readonly<Record<string, unknown>>;
  readonly variants?: readonly string[];
  readonly variantSchemas?: Readonly<Record<string, unknown>>;
  readonly stepSchema?: Readonly<Record<string, unknown>>;
  readonly helper?: string;
}

export interface CatalogDraftHumanFormSchema {
  readonly resourceKind: CatalogDraftResourceKind;
  readonly mode: CatalogDraftFormMode;
  readonly fields: readonly HumanFieldDescriptor[];
  field(key: string): HumanFieldDescriptor;
}

const slugField: HumanFieldDescriptor = {
  key: 'slug',
  label: 'Identificador curto',
  control: 'slug',
  valueType: 'string',
  required: true,
  constraints: {
    minLength: 1,
    maxLength: 96,
    pattern: '^[a-z0-9][a-z0-9-]*$',
  },
  helper: 'Usado como identidade estável. Depois da criação, não é editável neste contrato.',
};

const displayNameField: HumanFieldDescriptor = {
  key: 'displayName',
  label: 'Nome exibido',
  control: 'text',
  valueType: 'string',
  required: true,
  constraints: { minLength: 1, maxLength: 160 },
};

const structuredDataField: HumanFieldDescriptor = {
  key: 'data',
  label: 'Dados adicionais',
  control: 'structured-object',
  valueType: 'object',
  required: true,
  rawJson: false,
  defaultValue: {},
  helper:
    'Extensão estruturada do backend. A Central não deve expor textarea JSON; sem sub-schema conhecido, preserve ou use o objeto vazio.',
};

const effectKeyOptions = [
  'heal-hp',
  'cure-status',
  'restore-pp',
  'catch-modifier',
  'apply-status',
  'apply-status-on-contact-received',
  'modify-stat-stage',
  'low-hp-type-boost',
  'prevent-accuracy-drop',
  'run-away',
] as const;

const statusOptions = ['BURN', 'POISON', 'PARALYSIS', 'SLEEP', 'FREEZE'] as const;
const statOptions = [
  'ATTACK',
  'DEFENSE',
  'SP_ATTACK',
  'SP_DEFENSE',
  'SPEED',
  'ACCURACY',
  'EVASION',
] as const;

export const EFFECT_PRIMITIVE_FORM_SCHEMAS = Object.freeze({
  'heal-hp': {
    amount: { control: 'integer', min: 1, max: 9999 },
  },
  'cure-status': {
    status: { control: 'select', options: statusOptions },
  },
  'restore-pp': {
    amount: { control: 'integer', min: 1, max: 99 },
  },
  'catch-modifier': {
    multiplierBasisPoints: { control: 'integer', min: 1, max: 100_000 },
  },
  'apply-status': {
    status: { control: 'select', options: statusOptions },
    chanceBasisPoints: { control: 'integer', min: 0, max: 10_000 },
  },
  'apply-status-on-contact-received': {
    status: { control: 'select', options: statusOptions },
    chanceBasisPoints: { control: 'integer', min: 0, max: 10_000 },
  },
  'modify-stat-stage': {
    stat: { control: 'select', options: statOptions },
    stages: { control: 'integer', min: -6, max: 6, disallow: [0] },
  },
  'low-hp-type-boost': {
    typeSlug: { control: 'text', minLength: 1, maxLength: 64 },
    multiplierBasisPoints: { control: 'integer', min: 10_001, max: 100_000 },
  },
  'prevent-accuracy-drop': {},
  'run-away': {},
});

const effectKeyField: HumanFieldDescriptor = {
  key: 'effectKey',
  label: 'Efeito',
  control: 'select',
  valueType: 'string',
  required: true,
  nullable: true,
  options: effectKeyOptions,
  helper: 'Sem efeito selecionado, a configuração deve permanecer como objeto vazio.',
};

const effectConfigField: HumanFieldDescriptor = {
  key: 'effectConfig',
  label: 'Configuração do efeito',
  control: 'effect-config',
  valueType: 'object',
  required: true,
  rawJson: false,
  defaultValue: {},
  helper:
    'Campos variam pelo efeito escolhido e são definidos por primitives allowlisted do backend.',
};

const encounterConditionsDescriptor = {
  control: 'encounter-conditions',
  fixedVersion: 1,
  constraints: {
    maxRequiredUnlockKeys: 32,
    maxBlockedUnlockKeys: 32,
    uniqueWithinEachList: true,
    requiredAndBlockedMustBeDisjoint: true,
  },
} as const;

const rewardVariantSchemas = {
  ITEM: {
    itemId: { control: 'reference', valueType: 'uuid', referenceKind: 'ITEM' },
    quantity: { control: 'integer', min: 1, max: 1_000_000_000 },
  },
  CURRENCY: {
    currencyId: { control: 'reference', valueType: 'uuid', referenceKind: 'CURRENCY' },
    amount: { control: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER },
  },
  TRAINER_POINTS: {
    amount: { control: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER },
  },
} as const;

const effectStepSchema = {
  effectKey: { control: 'select', options: effectKeyOptions },
  config: { control: 'effect-config', rawJson: false },
} as const;

function form(
  resourceKind: CatalogDraftResourceKind,
  mode: CatalogDraftFormMode,
  fields: readonly HumanFieldDescriptor[],
): CatalogDraftHumanFormSchema {
  return Object.freeze({
    resourceKind,
    mode,
    fields: Object.freeze([...fields]),
    field(key: string): HumanFieldDescriptor {
      const descriptor = fields.find((field) => field.key === key);
      if (descriptor === undefined) {
        throw new Error(`Unknown ${resourceKind} ${mode} form field: ${key}`);
      }
      return descriptor;
    },
  });
}

const speciesBody: readonly HumanFieldDescriptor[] = [
  displayNameField,
  {
    key: 'catchRate',
    label: 'Taxa de captura',
    control: 'integer',
    valueType: 'integer',
    required: true,
    nullable: true,
    constraints: { min: 0, max: 1_000_000 },
  },
  {
    key: 'baseExp',
    label: 'Experiência base',
    control: 'integer',
    valueType: 'integer',
    required: true,
    nullable: true,
    constraints: { min: 0, max: 1_000_000 },
  },
  structuredDataField,
];

const moveBody: readonly HumanFieldDescriptor[] = [
  displayNameField,
  {
    key: 'typeId',
    label: 'Tipo',
    control: 'reference',
    valueType: 'uuid',
    required: true,
    referenceKind: 'POKEMON_TYPE',
  },
  {
    key: 'category',
    label: 'Categoria',
    control: 'select',
    valueType: 'string',
    required: true,
    options: ['PHYSICAL', 'SPECIAL', 'STATUS'],
  },
  {
    key: 'power',
    label: 'Poder',
    control: 'integer',
    valueType: 'integer',
    required: true,
    nullable: true,
    constraints: { min: 0, max: 1_000_000 },
  },
  {
    key: 'accuracy',
    label: 'Precisão (%)',
    control: 'integer',
    valueType: 'integer',
    required: true,
    nullable: true,
    constraints: { min: 0, max: 100 },
  },
  {
    key: 'priority',
    label: 'Prioridade',
    control: 'integer',
    valueType: 'integer',
    required: true,
    constraints: { min: -32, max: 32 },
  },
  {
    key: 'maxPp',
    label: 'PP máximo',
    control: 'integer',
    valueType: 'integer',
    required: true,
    nullable: true,
    constraints: { min: 1, max: 255 },
  },
  effectKeyField,
  effectConfigField,
  {
    key: 'flags',
    label: 'Propriedades do golpe',
    control: 'move-flags',
    valueType: 'object',
    required: true,
    fixedVersion: 1,
    rawJson: false,
    defaultValue: {},
    constraints: { supportsEmptyObject: true, makesContact: 'boolean' },
  },
];

const itemBody: readonly HumanFieldDescriptor[] = [
  displayNameField,
  {
    key: 'itemKind',
    label: 'Categoria do item',
    control: 'token',
    valueType: 'string',
    required: true,
    constraints: {
      minLength: 1,
      maxLength: 96,
      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
    },
  },
  effectKeyField,
  effectConfigField,
];

const areaBody: readonly HumanFieldDescriptor[] = [displayNameField, structuredDataField];

const encounterBody: readonly HumanFieldDescriptor[] = [
  {
    key: 'conditions',
    label: 'Condições de acesso',
    control: 'encounter-conditions',
    valueType: 'object',
    required: true,
    fixedVersion: encounterConditionsDescriptor.fixedVersion,
    rawJson: false,
    constraints: encounterConditionsDescriptor.constraints,
  },
  {
    key: 'entries',
    label: 'Pokémon possíveis',
    control: 'encounter-entry-list',
    valueType: 'array',
    required: true,
    constraints: { minItems: 1, maxItems: 512 },
    itemSchema: {
      formId: {
        control: 'reference',
        valueType: 'uuid',
        referenceKind: 'POKEMON_FORM',
      },
      weight: {
        control: 'text',
        pattern: '^[1-9][0-9]{0,17}$',
      },
      minLevel: { control: 'integer', min: 1, max: 100 },
      maxLevel: { control: 'integer', min: 1, max: 100 },
      active: { control: 'toggle', defaultValue: true },
      conditions: encounterConditionsDescriptor,
      invariants: ['minLevel <= maxLevel'],
    },
  },
];

const rewardBody: readonly HumanFieldDescriptor[] = [
  displayNameField,
  {
    key: 'program',
    label: 'Concessões',
    control: 'reward-program',
    valueType: 'object',
    required: true,
    fixedVersion: 1,
    rawJson: false,
    constraints: { minItems: 1, maxItems: 32 },
    variants: ['ITEM', 'CURRENCY', 'TRAINER_POINTS'],
    variantSchemas: rewardVariantSchemas,
  },
];

const effectBody: readonly HumanFieldDescriptor[] = [
  {
    key: 'scope',
    label: 'Escopo',
    control: 'select',
    valueType: 'string',
    required: true,
    options: ['PLAYER', 'POKEMON', 'BATTLE_PARTICIPANT', 'AREA'],
  },
  {
    key: 'stackingPolicy',
    label: 'Política de acumulação',
    control: 'token',
    valueType: 'string',
    required: true,
    constraints: {
      minLength: 1,
      maxLength: 96,
      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
    },
  },
  {
    key: 'durationModel',
    label: 'Modelo de duração',
    control: 'token',
    valueType: 'string',
    required: true,
    constraints: {
      minLength: 1,
      maxLength: 96,
      pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
    },
  },
  {
    key: 'rules',
    label: 'Regras do efeito',
    control: 'effect-program',
    valueType: 'object',
    required: true,
    fixedVersion: 1,
    rawJson: false,
    constraints: { minItems: 1, maxItems: 16 },
    stepSchema: effectStepSchema,
  },
];

export const CATALOG_DRAFT_FORM_SCHEMAS = Object.freeze({
  SPECIES: Object.freeze({
    create: form('SPECIES', 'create', [
      slugField,
      {
        key: 'nationalDex',
        label: 'Número da Pokédex Nacional',
        control: 'integer',
        valueType: 'integer',
        required: true,
        constraints: { min: 1, max: 65535 },
      },
      ...speciesBody,
    ]),
    replace: form('SPECIES', 'replace', speciesBody),
  }),
  MOVE: Object.freeze({
    create: form('MOVE', 'create', [slugField, ...moveBody]),
    replace: form('MOVE', 'replace', moveBody),
  }),
  ITEM: Object.freeze({
    create: form('ITEM', 'create', [slugField, ...itemBody]),
    replace: form('ITEM', 'replace', itemBody),
  }),
  AREA: Object.freeze({
    create: form('AREA', 'create', [
      {
        key: 'regionId',
        label: 'Região',
        control: 'reference',
        valueType: 'uuid',
        required: true,
        referenceKind: 'REGION',
      },
      slugField,
      ...areaBody,
    ]),
    replace: form('AREA', 'replace', areaBody),
  }),
  ENCOUNTER_TABLE: Object.freeze({
    create: form('ENCOUNTER_TABLE', 'create', [
      {
        key: 'areaId',
        label: 'Área',
        control: 'reference',
        valueType: 'uuid',
        required: true,
        referenceKind: 'AREA',
      },
      slugField,
      ...encounterBody,
    ]),
    replace: form('ENCOUNTER_TABLE', 'replace', encounterBody),
  }),
  REWARD: Object.freeze({
    create: form('REWARD', 'create', [slugField, ...rewardBody]),
    replace: form('REWARD', 'replace', rewardBody),
  }),
  EFFECT: Object.freeze({
    create: form('EFFECT', 'create', [slugField, ...effectBody]),
    replace: form('EFFECT', 'replace', effectBody),
  }),
});

export function catalogDraftFormSchema(
  resourceKind: CatalogDraftResourceKind,
  mode: CatalogDraftFormMode,
): CatalogDraftHumanFormSchema {
  return CATALOG_DRAFT_FORM_SCHEMAS[resourceKind][mode];
}
