export type AdminRewardCatalogItem = {
  itemId: string;
  slug: string;
  displayName: string;
  itemKind: string;
};

export type AdminRewardCatalogCurrency = {
  currencyId: string;
  slug: string;
  displayName: string;
  allowsNegative: boolean;
};

export type AdminRewardCatalogSpecies = {
  speciesId: string;
  nationalDex: number;
  slug: string;
  displayName: string;
};

export type AdminRewardCatalogForm = {
  formId: string;
  speciesId: string;
  nationalDex: number;
  speciesSlug: string;
  formSlug: string;
  displayName: string;
  abilityIds: string[];
};

export type AdminRewardCatalogAbility = {
  abilityId: string;
  slug: string;
};

export type AdminRewardCatalogNature = {
  natureId: string;
  slug: string;
};

export type AdminRewardCatalogEffect = {
  effectId: string;
  slug: string;
  scope: 'PLAYER' | 'POKEMON' | 'BATTLE_PARTICIPANT' | 'AREA';
};

export type AdminRewardCatalogRelease = {
  releaseId: string;
  releaseNo: string;
  name: string;
  status: 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED';
  revision: string;
  parentReleaseId: string | null;
  defaultRulesetId: string;
  active: boolean;
  createdAt: string;
  publishedAt: string | null;
};

export type AdminRewardCatalogResult =
  | {
      status: 'ok';
      items: AdminRewardCatalogItem[];
      currencies: AdminRewardCatalogCurrency[];
      species: AdminRewardCatalogSpecies[];
      forms: AdminRewardCatalogForm[];
      abilities: AdminRewardCatalogAbility[];
      natures: AdminRewardCatalogNature[];
      effects: AdminRewardCatalogEffect[];
      releases: AdminRewardCatalogRelease[];
    }
  | { status: 'unauthenticated' | 'forbidden' };

type Fetcher = typeof fetch;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isItem(value: unknown): value is AdminRewardCatalogItem {
  return (
    isRecord(value) &&
    typeof value.itemId === 'string' &&
    UUID_PATTERN.test(value.itemId) &&
    typeof value.slug === 'string' &&
    value.slug.length > 0 &&
    typeof value.displayName === 'string' &&
    value.displayName.length > 0 &&
    typeof value.itemKind === 'string' &&
    value.itemKind.length > 0
  );
}

function isCurrency(value: unknown): value is AdminRewardCatalogCurrency {
  return (
    isRecord(value) &&
    typeof value.currencyId === 'string' &&
    UUID_PATTERN.test(value.currencyId) &&
    typeof value.slug === 'string' &&
    value.slug.length > 0 &&
    typeof value.displayName === 'string' &&
    value.displayName.length > 0 &&
    typeof value.allowsNegative === 'boolean'
  );
}

function isSpecies(value: unknown): value is AdminRewardCatalogSpecies {
  return (
    isRecord(value) &&
    typeof value.speciesId === 'string' &&
    UUID_PATTERN.test(value.speciesId) &&
    typeof value.nationalDex === 'number' &&
    Number.isSafeInteger(value.nationalDex) &&
    value.nationalDex > 0 &&
    typeof value.slug === 'string' &&
    value.slug.length > 0 &&
    typeof value.displayName === 'string' &&
    value.displayName.length > 0
  );
}

function isForm(value: unknown): value is AdminRewardCatalogForm {
  return (
    isRecord(value) &&
    typeof value.formId === 'string' &&
    UUID_PATTERN.test(value.formId) &&
    typeof value.speciesId === 'string' &&
    UUID_PATTERN.test(value.speciesId) &&
    typeof value.nationalDex === 'number' &&
    Number.isSafeInteger(value.nationalDex) &&
    value.nationalDex > 0 &&
    typeof value.speciesSlug === 'string' &&
    value.speciesSlug.length > 0 &&
    typeof value.formSlug === 'string' &&
    value.formSlug.length > 0 &&
    typeof value.displayName === 'string' &&
    value.displayName.length > 0 &&
    (value.abilityIds === undefined ||
      (Array.isArray(value.abilityIds) &&
        value.abilityIds.every((abilityId) => typeof abilityId === 'string' && UUID_PATTERN.test(abilityId))))
  );
}

function isAbility(value: unknown): value is AdminRewardCatalogAbility {
  return (
    isRecord(value) &&
    typeof value.abilityId === 'string' &&
    UUID_PATTERN.test(value.abilityId) &&
    typeof value.slug === 'string' &&
    value.slug.length > 0
  );
}

function isNature(value: unknown): value is AdminRewardCatalogNature {
  return (
    isRecord(value) &&
    typeof value.natureId === 'string' &&
    UUID_PATTERN.test(value.natureId) &&
    typeof value.slug === 'string' &&
    value.slug.length > 0
  );
}

function isEffect(value: unknown): value is AdminRewardCatalogEffect {
  return (
    isRecord(value) &&
    typeof value.effectId === 'string' &&
    UUID_PATTERN.test(value.effectId) &&
    typeof value.slug === 'string' &&
    value.slug.length > 0 &&
    (value.scope === 'PLAYER' ||
      value.scope === 'POKEMON' ||
      value.scope === 'BATTLE_PARTICIPANT' ||
      value.scope === 'AREA')
  );
}

function isRelease(value: unknown): value is AdminRewardCatalogRelease {
  return (
    isRecord(value) &&
    typeof value.releaseId === 'string' &&
    UUID_PATTERN.test(value.releaseId) &&
    typeof value.releaseNo === 'string' &&
    /^\d+$/.test(value.releaseNo) &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    (value.status === 'DRAFT' ||
      value.status === 'VALIDATED' ||
      value.status === 'PUBLISHED' ||
      value.status === 'ARCHIVED') &&
    typeof value.revision === 'string' &&
    /^\d+$/.test(value.revision) &&
    (value.parentReleaseId === null ||
      (typeof value.parentReleaseId === 'string' && UUID_PATTERN.test(value.parentReleaseId))) &&
    typeof value.defaultRulesetId === 'string' &&
    UUID_PATTERN.test(value.defaultRulesetId) &&
    typeof value.active === 'boolean' &&
    typeof value.createdAt === 'string' &&
    (value.publishedAt === null || typeof value.publishedAt === 'string')
  );
}

export async function getAdminRewardCatalog(
  fetcher: Fetcher = fetch,
): Promise<AdminRewardCatalogResult> {
  const response = await fetcher('/api/hub/admin/reward-catalog', {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (!response.ok) throw new Error(`Admin reward catalog failed (${response.status})`);

  const body = (await response.json()) as unknown;
  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    !body.items.every(isItem) ||
    !Array.isArray(body.currencies) ||
    !body.currencies.every(isCurrency) ||
    (body.species !== undefined &&
      (!Array.isArray(body.species) || !body.species.every(isSpecies))) ||
    (body.forms !== undefined &&
      (!Array.isArray(body.forms) || !body.forms.every(isForm))) ||
    (body.abilities !== undefined &&
      (!Array.isArray(body.abilities) || !body.abilities.every(isAbility))) ||
    (body.natures !== undefined &&
      (!Array.isArray(body.natures) || !body.natures.every(isNature))) ||
    (body.effects !== undefined &&
      (!Array.isArray(body.effects) || !body.effects.every(isEffect))) ||
    (body.releases !== undefined &&
      (!Array.isArray(body.releases) || !body.releases.every(isRelease)))
  ) {
    throw new Error('Invalid admin reward catalog response');
  }

  return {
    status: 'ok',
    items: body.items,
    currencies: body.currencies,
    species: Array.isArray(body.species) ? body.species : [],
    forms: Array.isArray(body.forms)
      ? body.forms.map((form) => ({ ...form, abilityIds: form.abilityIds ?? [] }))
      : [],
    abilities: Array.isArray(body.abilities) ? body.abilities : [],
    natures: Array.isArray(body.natures) ? body.natures : [],
    effects: Array.isArray(body.effects) ? body.effects : [],
    releases: Array.isArray(body.releases) ? body.releases : [],
  };
}
