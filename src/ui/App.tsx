import { Component, type ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { effect } from '@preact/signals';
import { chapterById } from '../content';
import { progress, settings, storeReady, storageNotice, update } from '../engine/store';
import { setLastRoute } from '../engine/progress';
import { arrivalEvent, arrivalSuggestion, confirmArrival, startNavigationEngine } from '../engine/navigation';
import { locationStatus, startLocation, stopLocation } from '../platform/location';
import { compassStatus, startCompass, stopCompass } from '../platform/compass';
import { setWakeLock } from '../platform/wakelock';
import { online } from '../platform/network';
import { applyUpdate, swState, updateReady } from '../platform/pwa';
import { haptic } from '../platform/haptics';
import { sfx, preloadSfx } from '../audio/sfx';
import '../audio/ambience';
import { route, routeKey, navigate, href, type Route } from './router';
import { chapterLabel, revelation } from './shared';
import { Icon } from './components/Icon';
import { MiniPlayer } from './components/Player';
import { Button, ToastHost } from './components/ui';
import { IntroScreen } from './screens/Intro';
import { HomeScreen } from './screens/Home';
import { NavigateScreen } from './screens/Navigate';
import { ChapterScreen } from './screens/Chapter';
import { PuzzleScreen } from './screens/Puzzle';
import { RouteScreen } from './screens/RouteOverview';
import { JournalScreen } from './screens/Journal';
import { SettingsScreen } from './screens/Settings';
import { HelpScreen } from './screens/Help';
import { FinaleScreen } from './screens/Finale';

class ErrorBoundary extends Component<{ children: ComponentChildren; resetKey: string }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static override getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error) {
    console.error('[ui] screen crashed', error);
  }
  override componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div class="card stack" role="alert" style={{ marginTop: '16px' }}>
        <h3>This screen hit a snag</h3>
        <p class="muted">Your progress is saved. Go back to the current chapter, or reload the app.</p>
        <div class="row row--wrap">
          <Button onClick={() => navigate('')}>Back to the tour</Button>
          <Button variant="secondary" onClick={() => location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
}

function Screen({ r }: { r: Route }) {
  switch (r.name) {
    case 'intro':
      return <IntroScreen />;
    case 'home':
      return <HomeScreen />;
    case 'go':
      return <NavigateScreen chapterId={r.chapterId} />;
    case 'chapter':
      return <ChapterScreen chapterId={r.chapterId} />;
    case 'puzzle':
      return <PuzzleScreen puzzleId={r.puzzleId} />;
    case 'route':
      return <RouteScreen />;
    case 'journal':
      return <JournalScreen tab={r.tab} />;
    case 'settings':
      return <SettingsScreen />;
    case 'help':
      return <HelpScreen topic={r.topic} />;
    case 'finale':
      return <FinaleScreen />;
  }
}

function TabBar({ r }: { r: Route }) {
  const tabs: { key: string; label: string; icon: 'home' | 'route' | 'journal' | 'sliders'; to: string; active: boolean }[] = [
    { key: 'now', label: 'Now', icon: 'home', to: '', active: ['home', 'go', 'chapter', 'puzzle', 'finale'].includes(r.name) },
    { key: 'route', label: 'Route', icon: 'route', to: 'route', active: r.name === 'route' },
    { key: 'journal', label: 'Journal', icon: 'journal', to: 'journal', active: r.name === 'journal' },
    { key: 'more', label: 'Settings', icon: 'sliders', to: 'settings', active: r.name === 'settings' || r.name === 'help' },
  ];
  return (
    <nav class="tabbar" aria-label="Main">
      <div class="tabbar__inner">
        {tabs.map((t) => (
          <a class="tab" href={href(t.to)} aria-current={t.active ? 'page' : undefined}>
            <Icon name={t.icon} />
            {t.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function StatusPills() {
  const isOnline = online.value;
  const loc = locationStatus.value;
  const sw = swState.value;
  return (
    <div class="row" style={{ gap: '6px' }}>
      <span
        class={`pill${isOnline ? '' : ' pill--warn'}`}
        title={isOnline ? 'Online' : 'Offline — the tour keeps working'}
        aria-label={isOnline ? 'Online' : 'Offline. The tour keeps working.'}
      >
        <Icon name={isOnline ? 'online' : 'offline'} size="sm" />
        {isOnline ? (sw === 'ready' ? 'Ready offline' : sw === 'installing' ? 'Saving…' : 'Online') : 'Offline'}
      </span>
      {loc === 'active' ? (
        <span class="pill pill--ok" aria-label="GPS on">
          <Icon name="pin" size="sm" />
          GPS
        </span>
      ) : loc === 'requesting' ? (
        <span class="pill" aria-label="Finding your position">
          <Icon name="pin" size="sm" />…
        </span>
      ) : null}
    </div>
  );
}

function ArrivalBanner() {
  const ev = arrivalEvent.value;
  const sug = arrivalSuggestion.value;
  if (ev && Date.now() - ev.at < 60_000 && progress.value.current === ev.chapterId) {
    const ch = chapterById(ev.chapterId);
    return (
      <div class="banner banner--ok screen" role="status" style={{ marginBottom: '12px' }}>
        <Icon name="flag" />
        <div class="grow">
          <strong>You’ve arrived: {ch.place.split(' · ')[0]}</strong>
          <div class="small muted">{ch.arrival.whereToStand}</div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            arrivalEvent.value = null;
            navigate(`chapter/${ev.chapterId}`);
          }}
        >
          Begin
        </Button>
      </div>
    );
  }
  if (sug && progress.value.current === sug) {
    const st = progress.value.chapters[sug].status;
    if (st !== 'active' && st !== 'upcoming') return null;
    const ch = chapterById(sug);
    return (
      <div class="banner screen" role="status" style={{ marginBottom: '12px' }}>
        <Icon name="pin" />
        <div class="grow">
          <strong>Looks like you’re close to {ch.place.split(' · ')[0]}</strong>
          <div class="small muted">This stop’s position is approximate. Confirm when you see it.</div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            confirmArrival(sug);
            haptic('arrival');
            void sfx('arrival');
            navigate(`chapter/${sug}`);
          }}
        >
          We’re here
        </Button>
      </div>
    );
  }
  return null;
}

/** Applies theme, motion and text size preferences to the document. */
effect(() => {
  const s = settings.value;
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.motion = s.motion;
  root.style.setProperty('--text-scale', String(s.textScale));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.theme === 'sun' ? '#f4ecda' : '#0b1121');
});

/** Sensors run only while useful: location on, tour started, not paused or suspended. */
effect(() => {
  const s = settings.value;
  const p = progress.value;
  const wantLocation = storeReady.value && s.location && p.started && !p.paused && !p.navSuspended && !p.envelopeOpened;
  if (wantLocation) startLocation();
  else stopLocation();
  setWakeLock(Boolean(wantLocation && s.keepAwake));
  if (wantLocation && s.compass && compassStatus.value === 'off') void startCompass();
  if ((!wantLocation || !s.compass) && compassStatus.value === 'active') stopCompass();
});

/** Arrival feedback (sound + vibration) when GPS confirms a stop. */
let lastArrival = 0;
effect(() => {
  const ev = arrivalEvent.value;
  if (ev && ev.at !== lastArrival) {
    lastArrival = ev.at;
    haptic('arrival');
    void sfx('arrival');
  }
});

export function App() {
  useEffect(() => {
    const stopNav = startNavigationEngine();
    const onFirstTap = () => {
      preloadSfx();
      window.removeEventListener('pointerdown', onFirstTap);
    };
    window.addEventListener('pointerdown', onFirstTap);
    return () => {
      stopNav();
      window.removeEventListener('pointerdown', onFirstTap);
    };
  }, []);

  const r = route.value;
  const key = routeKey(r);
  const p = progress.value;

  // Remember where the players are, so a reload or reopening restores the same screen.
  useEffect(() => {
    if (storeReady.value && r.name !== 'intro') update((prev, now) => setLastRoute(prev, key, now));
  }, [key]);

  if (!storeReady.value) {
    return (
      <div class="boot" aria-busy="true">
        <div class="stack">
          <p class="kicker">Buenos Aires</p>
          <h1>The Hidden City</h1>
          <p class="muted">Opening your journal…</p>
        </div>
      </div>
    );
  }

  const bare = r.name === 'intro';
  const ch = chapterById(p.current);
  return (
    <div class="app">
      {!bare ? (
        <header class="topbar">
          <a href={href('')} class="topbar__title" style={{ color: 'inherit', textDecoration: 'none' }}>
            <small>{p.started ? chapterLabel(ch.number) : 'Buenos Aires'}</small>
            {p.started ? ch.title : 'The Hidden City'}
          </a>
          <StatusPills />
          <a class="btn btn--ghost btn--icon" href={href('help')} aria-label="Help: what if something goes wrong">
            <Icon name="help" />
          </a>
        </header>
      ) : null}
      <main class={`main${bare ? ' main--bare' : ''}`} id="main">
        {!bare && storageNotice.value ? (
          <div class="banner banner--warn" role="status" style={{ marginBottom: '12px' }}>
            <Icon name="info" />
            <div class="grow small">{storageNotice.value}</div>
            <button type="button" class="btn btn--ghost btn--sm" onClick={() => (storageNotice.value = null)}>
              OK
            </button>
          </div>
        ) : null}
        {!bare && updateReady.value ? (
          <div class="banner" role="status" style={{ marginBottom: '12px' }}>
            <Icon name="download" />
            <div class="grow small">A new version is ready. Your progress is kept.</div>
            <Button size="sm" variant="secondary" onClick={() => applyUpdate()}>
              Update
            </Button>
          </div>
        ) : null}
        {!bare ? <ArrivalBanner /> : null}
        <ErrorBoundary resetKey={key}>
          <div key={key} class="screen">
            <Screen r={r} />
          </div>
        </ErrorBoundary>
      </main>
      {!bare ? <MiniPlayer /> : null}
      {!bare ? <TabBar r={r} /> : null}
      <ToastHost />
      {revelation.value ? <div class="revelation" aria-hidden="true" /> : null}
    </div>
  );
}
