import { useState } from 'preact/hooks';
import { progress, settings, update, updateSettings, requestPersistence } from '../../engine/store';
import { startTour } from '../../engine/progress';
import { rememberPositionFor } from '../../engine/navigation';
import { waypointById } from '../../content';
import { geolocationSupported, startLocation, locationStatus } from '../../platform/location';
import { canPromptInstall, isStandalone, offlinePack, promptInstall, swState } from '../../platform/pwa';
import { unlockAudio } from '../../audio/context';
import { sfx } from '../../audio/sfx';
import { haptic } from '../../platform/haptics';
import { navigate } from '../router';
import { Art } from '../components/Art';
import { Button, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

/**
 * First launch: an opening title sequence, then a short briefing. Nothing is
 * requested at launch: location is offered here with an explanation, and only
 * asked for when the players switch it on.
 */
export function IntroScreen() {
  const [step, setStep] = useState<'title' | 'brief' | 'ready'>(progress.value.started ? 'brief' : 'title');
  const s = settings.value;

  if (step === 'title') {
    return (
      <div class="intro-title" onClick={() => unlockAudio()}>
        <div class="intro-title__art">
          <Art id="river" />
        </div>
        <p class="kicker intro-title__kicker">Buenos Aires</p>
        <h1 class="intro-title__h">The Hidden City</h1>
        <p class="intro-title__sub">A mystery for two, told by someone who was here first.</p>
        <div class="intro-title__cta">
          <Button
            size="lg"
            block
            iconRight="chevronRight"
            onClick={() => {
              unlockAudio();
              void sfx('page', 0.7);
              setStep('brief');
            }}
          >
            Open the journal
          </Button>
          <p class="xsmall faint center">Works offline once installed · no account · nothing leaves your phone</p>
        </div>
      </div>
    );
  }

  const pack = offlinePack.value;
  const sw = swState.value;
  const offlineLine =
    sw === 'ready'
      ? 'Everything is saved on this phone: the tour works with no connection.'
      : sw === 'installing'
        ? `Saving the tour for offline use${pack ? ` (${pack.cached} of ${pack.total} files)` : ''}… keep this page open on Wi-Fi for a moment.`
        : sw === 'dev'
          ? 'Development preview: offline mode is off.'
          : sw === 'unsupported'
            ? 'This browser can’t save the tour for offline use. Keep a connection, or use Chrome on Android.'
            : 'Preparing offline mode…';

  return (
    <div class="stack stack--lg" style={{ paddingTop: 'calc(var(--safe-top) + 20px)' }}>
      <div class="hero reveal-1">
        <div class="hero__art">
          <Art id="corner" />
        </div>
        <p class="kicker center">The briefing</p>
        <h2 class="center">Nine places, one voice, one question</h2>
        <p class="center muted" style={{ marginTop: '8px' }}>
          A narrator who won’t give their name will guide you across Buenos Aires today. At every stop you’ll solve one challenge
          and collect one true thing about them. Back at your starting corner tonight, you’ll name the voice.
        </p>
      </div>

      <div class="card stack reveal-2">
        <h3>How it works</h3>
        <ul class="howto">
          <li>
            <Icon name="route" /> <span>The app always shows <b>where you’re going</b>, <b>how to get there</b> (walk or taxi), and <b>what to do when you arrive</b>.</span>
          </li>
          <li>
            <Icon name="hint" /> <span>Stuck? Take a <b>hint</b>. Stop closed or too crowded? <b>Skip it</b> — the story continues.</span>
          </li>
          <li>
            <Icon name="coffee" /> <span><b>Pause</b> any time for lunch or rest. Everything is saved automatically.</span>
          </li>
          <li>
            <Icon name="shield" /> <span><b>The city comes first.</b> Look up, cross only on green, and never use the phone while crossing.</span>
          </li>
        </ul>
      </div>

      <div class="card stack reveal-3">
        <h3>Before you set off</h3>
        <div class="setting">
          <Icon name="download" />
          <div class="setting__text">
            <div class="setting__title">Offline</div>
            <div class="setting__desc">{offlineLine}</div>
          </div>
        </div>
        {!isStandalone.value ? (
          <div class="setting">
            <Icon name="phone" />
            <div class="setting__text">
              <div class="setting__title">Install the app</div>
              <div class="setting__desc">
                {canPromptInstall.value
                  ? 'Add it to your home screen: it opens full-screen and works offline.'
                  : 'In Chrome on Android: menu ⋮ → “Add to Home screen” or “Install app”.'}
              </div>
            </div>
            {canPromptInstall.value ? (
              <Button size="sm" variant="secondary" onClick={() => void promptInstall()}>
                Install
              </Button>
            ) : null}
          </div>
        ) : null}
        <div class="setting">
          <Icon name="pin" />
          <div class="setting__text">
            <div class="setting__title">Use location</div>
            <div class="setting__desc">
              {geolocationSupported()
                ? 'Shows distance and direction to each stop and notices when you arrive. Your position never leaves this phone. Without it, everything still works: you confirm arrivals yourself.'
                : 'This browser has no location access: you’ll confirm arrivals yourself.'}
              {locationStatus.value === 'denied' ? ' Location was blocked; you can allow it in the browser’s site settings.' : ''}
            </div>
          </div>
          {geolocationSupported() ? (
            <Switch
              label="Use location"
              checked={s.location}
              onChange={(v) => {
                updateSettings({ location: v });
                if (v) startLocation();
              }}
            />
          ) : null}
        </div>
        <div class="setting">
          <Icon name="volume" />
          <div class="setting__text">
            <div class="setting__title">Sound check</div>
            <div class="setting__desc">The narration is recorded and works offline. Turn your volume up and tap to test.</div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              unlockAudio();
              void sfx('success');
              haptic('success');
            }}
          >
            Test
          </Button>
        </div>
      </div>

      <div class="stack">
        <Button
          size="lg"
          block
          iconRight="chevronRight"
          onClick={() => {
            unlockAudio();
            requestPersistence();
            if (!progress.value.started) {
              update((p, now) => startTour(p, now));
              rememberPositionFor(waypointById('start'));
            }
            haptic('reveal');
            navigate('chapter/prologue');
          }}
        >
          {progress.value.started ? 'Back to the tour' : 'We’re at Córdoba y Gallo — begin'}
        </Button>
        {!progress.value.started ? (
          <p class="xsmall faint center">The tour starts at 9:15 on the corner of Avenida Córdoba and Gallo. Times are a guide, never a race.</p>
        ) : null}
      </div>
    </div>
  );
}
