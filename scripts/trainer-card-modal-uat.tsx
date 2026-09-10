import { createRoot } from 'react-dom/client';
import type { JourneyProfilePreview } from '/src/features/journey/journeyProfilePreview';
import { ShareTrainerCardZhoulia } from '/src/features/journey/ShareTrainerCardZhoulia';
import '/src/features/journey/journey-trainer-card-v2.css';

function buildPortraitDataUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('modal-uat-portrait-canvas-unavailable');

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

const profile: JourneyProfilePreview = {
  trainerName: 'Ana Clara',
  trainerTitle: '',
  trainerId: 'ZHO-NEW-001',
  publicVerificationId: null,
  originRegion: 'Zhoulia',
  currentLocation: '—',
  featuredFeat: null,
  leadPokemon: {
    instanceId: 'uat-growlithe-1',
    dex: 58,
    species: 'Growlithe',
    nickname: 'Brasa',
    level: 5,
    types: ['Fogo'],
    sex: 'M',
    favorite: false,
    shiny: false,
    box: 'UAT',
    teamSlot: 1,
  },
  badges: Array.from({ length: 8 }, (_, index) => ({
    key: `uat-${index + 1}`,
    name: `Badge ${index + 1}`,
    earned: false,
    assetUrl: null,
  })),
  ownedPokemonCount: 1,
  registeredSpeciesCount: 1,
  personal: { age: null, height: null, appearance: null, bio: null },
};

const query = new URLSearchParams(window.location.search);
const expectedWidth = Number(query.get('expectedWidth') || 0);
const expectedHeight = Number(query.get('expectedHeight') || 0);

function fail(message: string) {
  document.documentElement.dataset.modalError = message;
  console.error(message);
}

function assertMobileLayout() {
  const image = document.querySelector<HTMLImageElement>('.journey-zhoulia-card-png');
  const download = document.querySelector<HTMLButtonElement>('.journey-zhoulia-card-download');
  const dismiss = document.querySelector<HTMLButtonElement>('.journey-zhoulia-card-dismiss');
  const close = document.querySelector<HTMLButtonElement>('.journey-zhoulia-card-close');
  const dialog = document.querySelector<HTMLElement>('.journey-zhoulia-card-dialog');
  const actions = document.querySelector<HTMLElement>('.journey-zhoulia-card-actions');
  if (!image || !download || !dismiss || !close || !dialog || !actions || !image.complete) return false;

  if (expectedWidth > 0 && window.innerWidth !== expectedWidth) {
    throw new Error(`modal-uat-wrong-viewport-width-${window.innerWidth}-expected-${expectedWidth}`);
  }
  if (expectedHeight > 0 && window.innerHeight !== expectedHeight) {
    throw new Error(`modal-uat-wrong-viewport-height-${window.innerHeight}-expected-${expectedHeight}`);
  }

  const viewportWidth = window.innerWidth;
  const horizontalTargets = [image, download, dismiss, close, dialog];
  for (const target of horizontalTargets) {
    const rect = target.getBoundingClientRect();
    if (rect.left < -1 || rect.right > viewportWidth + 1) {
      throw new Error(`modal-uat-horizontal-overflow-${target.className}`);
    }
  }

  if (document.documentElement.scrollWidth > viewportWidth + 1) {
    throw new Error(`modal-uat-document-overflow-${document.documentElement.scrollWidth}-${viewportWidth}`);
  }
  if (download.getBoundingClientRect().height < 42 || dismiss.getBoundingClientRect().height < 42) {
    throw new Error('modal-uat-action-target-too-small');
  }
  if (close.getBoundingClientRect().width < 34 || close.getBoundingClientRect().height < 34) {
    throw new Error('modal-uat-close-target-too-small');
  }

  const contentGap = actions.getBoundingClientRect().top - image.getBoundingClientRect().bottom;
  if (contentGap > 24) {
    throw new Error(`modal-uat-card-actions-gap-${Math.round(contentGap)}`);
  }

  document.documentElement.dataset.modalReady = 'true';
  document.documentElement.dataset.modalViewport = `${window.innerWidth}x${window.innerHeight}`;
  document.documentElement.dataset.modalFresh = 'true';
  document.documentElement.dataset.modalActionsGap = String(Math.round(contentGap));
  return true;
}

const root = document.querySelector('#root');
if (!root) throw new Error('modal-uat-root-missing');

createRoot(root).render(
  <ShareTrainerCardZhoulia
    profile={profile}
    avatarUrl={buildPortraitDataUrl()}
    onClose={() => undefined}
  />,
);

const startedAt = Date.now();
const timer = window.setInterval(() => {
  try {
    if (assertMobileLayout()) window.clearInterval(timer);
    else if (Date.now() - startedAt > 25000) {
      window.clearInterval(timer);
      fail('modal-uat-timeout');
    }
  } catch (error) {
    window.clearInterval(timer);
    fail(error instanceof Error ? error.message : String(error));
  }
}, 100);
