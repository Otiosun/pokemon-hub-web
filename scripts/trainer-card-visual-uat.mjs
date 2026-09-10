import { emitZhouliaTrainerCard } from '/src/features/journey/trainerCardEmissionRuntime.ts';

function buildPortraitDataUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('uat-portrait-canvas-unavailable');

  context.fillStyle = '#d9e6ef';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#8fb1c4';
  context.fillRect(0, 760, canvas.width, 440);
  context.fillStyle = '#203241';
  context.beginPath();
  context.arc(450, 340, 145, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#405f72';
  context.fillRect(280, 485, 340, 430);
  context.fillStyle = '#17242f';
  context.fillRect(220, 850, 460, 350);

  return canvas.toDataURL('image/png');
}

async function readPngSize(blob) {
  const header = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (header.length < 24 || !pngSignature.every((byte, index) => header[index] === byte)) {
    throw new Error('uat-output-is-not-png');
  }
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

const profile = {
  trainerName: 'Enzo',
  trainerTitle: 'Explorador de Fronteiras',
  trainerId: 'ZHO-028419',
  publicVerificationId: null,
  originRegion: 'Zhoulia',
  currentLocation: '—',
  featuredFeat: 'Campeão — Copa da Primavera',
  leadPokemon: {
    instanceId: 'uat-growlithe-1',
    dex: 58,
    species: 'Growlithe',
    nickname: 'Brasa',
    level: 12,
    types: ['Fogo'],
    sex: 'M',
    favorite: true,
    shiny: false,
    box: 'UAT',
    teamSlot: 1,
  },
  badges: Array.from({ length: 8 }, (_, index) => ({
    key: `uat-${index + 1}`,
    name: `UAT Badge ${index + 1}`,
    earned: true,
    assetUrl: null,
  })),
  ownedPokemonCount: 1,
  registeredSpeciesCount: 1,
  personal: {
    age: null,
    height: null,
    appearance: null,
    bio: null,
  },
};

const status = document.querySelector('#status');
const card = document.querySelector('#card');

try {
  const result = await emitZhouliaTrainerCard({
    profile,
    avatarUrl: buildPortraitDataUrl(),
  });
  const size = await readPngSize(result.pngBlob);

  if (size.width !== 1448 || size.height !== 1086) {
    throw new Error(`uat-invalid-output-size-${size.width}x${size.height}`);
  }

  const rasterizedBadgeSlots = result.svgString.match(/data-slot="badge-[1-8]"/g) ?? [];
  const uniqueBadgeSlots = new Set(rasterizedBadgeSlots);
  if (rasterizedBadgeSlots.length !== 8 || uniqueBadgeSlots.size !== 8) {
    throw new Error(`uat-missing-canonical-badges-${uniqueBadgeSlots.size}-of-8`);
  }

  card.src = result.pngUrl;
  status.textContent = `READY ${size.width}x${size.height} BADGES 8/8`;
  document.documentElement.dataset.uatReady = 'true';
  document.documentElement.dataset.uatBadges = '8';
  document.documentElement.dataset.uatDownloadName = result.downloadName;
  void card.decode().catch(() => undefined);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  status.textContent = `ERROR ${message}`;
  document.documentElement.dataset.uatError = message;
  console.error(error);
}
