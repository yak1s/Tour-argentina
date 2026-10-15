import { render } from 'preact';
import './ui/styles/fonts.css';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/components.css';
import './ui/styles/screens.css';
import './ui/styles/motion.css';
import { App } from './ui/App';
import { initStore, progress } from './engine/store';
import { registerServiceWorker } from './platform/pwa';
import { queryLocationPermission } from './platform/location';
import { navigate } from './ui/router';

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  render(<App />, root);
  registerServiceWorker();
  void queryLocationPermission();
  try {
    await initStore();
  } catch (err) {
    console.error('[boot] storage failed; continuing with a fresh session', err);
  }
  // Restore the last screen after a reload or when reopening the installed app.
  const p = progress.value;
  // Only when opened without a route (e.g. from the home-screen icon): an
  // explicit "#/" still means the home screen.
  if (!location.hash) {
    if (!p.started) navigate('intro', { replace: true });
    else if (p.lastRoute && p.lastRoute !== 'home') navigate(p.lastRoute, { replace: true });
  }
  document.getElementById('boot-fallback')?.remove();
}

void boot();
