const params = new URLSearchParams(window.location.search);
const width = Number(params.get('width') || 0);
const height = Number(params.get('height') || 0);
const root = document.documentElement;
const frame = document.querySelector('#viewport');

function fail(message) {
  root.dataset.viewportError = message;
  console.error(message);
}

if (!(frame instanceof HTMLIFrameElement)) {
  fail('viewport-uat-frame-missing');
} else if (!Number.isInteger(width) || width < 240 || width > 1200 || !Number.isInteger(height) || height < 320 || height > 2000) {
  fail(`viewport-uat-invalid-size-${width}x${height}`);
} else {
  frame.width = String(width);
  frame.height = String(height);
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  frame.src = `/scripts/trainer-card-modal-uat.html?expectedWidth=${width}&expectedHeight=${height}`;

  const startedAt = Date.now();
  const timer = window.setInterval(() => {
    try {
      const childWindow = frame.contentWindow;
      const childRoot = frame.contentDocument?.documentElement;
      if (!childWindow || !childRoot) return;

      const childError = childRoot.dataset.modalError;
      if (childError) {
        window.clearInterval(timer);
        fail(`viewport-uat-child-${childError}`);
        return;
      }

      if (childRoot.dataset.modalReady !== 'true' || childRoot.dataset.modalFresh !== 'true') {
        if (Date.now() - startedAt > 30000) {
          window.clearInterval(timer);
          fail('viewport-uat-timeout');
        }
        return;
      }

      if (childWindow.innerWidth !== width || childWindow.innerHeight !== height) {
        throw new Error(`viewport-uat-size-mismatch-${childWindow.innerWidth}x${childWindow.innerHeight}-expected-${width}x${height}`);
      }

      root.dataset.viewportReady = 'true';
      root.dataset.viewportFresh = childRoot.dataset.modalFresh;
      root.dataset.viewportChild = childRoot.dataset.modalViewport ?? '';
      root.dataset.viewportActionsGap = childRoot.dataset.modalActionsGap ?? '';
      root.dataset.viewportWidth = String(childWindow.innerWidth);
      root.dataset.viewportHeight = String(childWindow.innerHeight);
      window.clearInterval(timer);
    } catch (error) {
      window.clearInterval(timer);
      fail(error instanceof Error ? error.message : String(error));
    }
  }, 100);
}
