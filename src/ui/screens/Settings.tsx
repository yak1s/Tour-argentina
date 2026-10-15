import { useEffect, useState } from 'preact/hooks';
import { progress, resetProgress, settings, update, updateSettings } from '../../engine/store';
import { pause, resume } from '../../engine/progress';
import { geolocationSupported, locationPermission, locationStatus, position, queryLocationPermission, startLocation, stopLocation } from '../../platform/location';
import { compassStatus, startCompass, stopCompass } from '../../platform/compass';
import { hapticsSupported, haptic } from '../../platform/haptics';
import { wakeLockSupported } from '../../platform/wakelock';
import { checkOfflinePack, offlinePack, swState, isStandalone, canPromptInstall, promptInstall, updateReady, applyUpdate } from '../../platform/pwa';
import { clearMemories, storageEstimate } from '../../platform/db';
import { stop } from '../../audio/narrator';
import { sfx } from '../../audio/sfx';
import { online } from '../../platform/network';
import { navigate, href } from '../router';
import { Button, ConfirmDialog, Segmented, Switch, toast } from '../components/ui';
import { Icon } from '../components/Icon';

function Row({ title, desc, children }: { title: string; desc?: string; children?: preact.ComponentChildren }) {
  return (
    <div class="setting">
      <div class="setting__text">
        <div class="setting__title">{title}</div>
        {desc ? <div class="setting__desc">{desc}</div> : null}
      </div>
      {children}
    </div>
  );
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function SettingsScreen() {
  const s = settings.value;
  const p = progress.value;
  const [checking, setChecking] = useState(false);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmPhotos, setConfirmPhotos] = useState(false);

  useEffect(() => {
    void queryLocationPermission();
    void storageEstimate().then(setEstimate);
  }, []);

  const pack = offlinePack.value;
  const sw = swState.value;
  const ready = sw === 'ready' || (pack !== null && pack.total > 0 && pack.cached >= pack.total);
  const locText =
    locationStatus.value === 'active'
      ? `On · ±${Math.round(position.value?.accuracy ?? 0)} m`
      : locationStatus.value === 'denied' || locationPermission.value === 'denied'
        ? 'Blocked in browser settings'
        : locationStatus.value === 'unsupported'
          ? 'Not available on this browser'
          : locationStatus.value === 'unavailable'
            ? 'On, waiting for a GPS fix'
            : s.location
              ? 'On when the tour is running'
              : 'Off — manual arrival';

  return (
    <div class="stack stack--lg">
      <section class="stack stack--sm">
        <p class="kicker">Settings</p>
        <h2>Your preferences</h2>
      </section>

      <section class="card" aria-label="Sound">
        <p class="kicker">Sound</p>
        <Row title="Narration volume">
          <div style={{ width: '45%' }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.volume}
              aria-label="Narration volume"
              onInput={(e) => updateSettings({ volume: Number((e.currentTarget as HTMLInputElement).value) })}
            />
          </div>
        </Row>
        <Row title="Mute everything" desc="Narration, effects and ambience.">
          <Switch label="Mute everything" checked={s.muted} onChange={(v) => updateSettings({ muted: v })} />
        </Row>
        <Row title="Play the story on arrival" desc="Starts a chapter’s narration automatically once you’ve arrived. Off by default.">
          <Switch label="Play the story on arrival" checked={s.autoplayStory} onChange={(v) => updateSettings({ autoplayStory: v })} />
        </Row>
        <Row title="Sound effects" desc="Soft chimes for clues, arrivals and solved challenges.">
          <Switch
            label="Sound effects"
            checked={s.sfx}
            onChange={(v) => {
              updateSettings({ sfx: v });
              if (v) void sfx('reveal');
            }}
          />
        </Row>
        <Row title="Ambience" desc="A quiet, generated river sound that fades under the narration.">
          <Switch label="Ambience" checked={s.ambience} onChange={(v) => updateSettings({ ambience: v })} />
        </Row>
        {s.ambience ? (
          <Row title="Ambience volume">
            <div style={{ width: '45%' }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s.ambienceVolume}
                aria-label="Ambience volume"
                onInput={(e) => updateSettings({ ambienceVolume: Number((e.currentTarget as HTMLInputElement).value) })}
              />
            </div>
          </Row>
        ) : null}
        <Row title="Stop narration">
          <Button size="sm" variant="secondary" icon="stop" onClick={() => stop()}>
            Stop
          </Button>
        </Row>
      </section>

      <section class="card" aria-label="Location and sensors">
        <p class="kicker">Location &amp; sensors</p>
        <Row title="Location" desc={`${locText}. Used only on this phone, for distance, direction and arrival.`}>
          {geolocationSupported() ? (
            <Switch
              label="Location"
              checked={s.location}
              onChange={(v) => {
                updateSettings({ location: v });
                if (v) startLocation();
                else stopLocation();
              }}
            />
          ) : null}
        </Row>
        <Row
          title="Compass"
          desc={
            compassStatus.value === 'active'
              ? 'On: the arrow turns with your phone.'
              : compassStatus.value === 'unavailable'
                ? 'No compass on this device: arrows point north-up.'
                : compassStatus.value === 'needs-permission'
                  ? 'Needs permission: switch on again to allow it.'
                  : 'Turns the direction arrow with your phone.'
          }
        >
          <Switch
            label="Compass"
            checked={s.compass}
            onChange={(v) => {
              updateSettings({ compass: v });
              if (v) void startCompass();
              else stopCompass();
            }}
          />
        </Row>
        {wakeLockSupported() ? (
          <Row title="Keep screen on while navigating" desc="Handy when following directions; uses more battery.">
            <Switch label="Keep screen on" checked={s.keepAwake} onChange={(v) => updateSettings({ keepAwake: v })} />
          </Row>
        ) : null}
        {hapticsSupported() ? (
          <Row title="Vibration" desc="Subtle feedback for arrivals and solved challenges.">
            <Switch
              label="Vibration"
              checked={s.haptics}
              onChange={(v) => {
                updateSettings({ haptics: v });
                if (v) haptic('success');
              }}
            />
          </Row>
        ) : null}
        <Row title="Camera" desc="Only opens when you start a camera extra. Photos stay on this phone." />
      </section>

      <section class="card" aria-label="Display">
        <p class="kicker">Display</p>
        <Row title="Theme" desc="Sunlight mode is brighter and higher-contrast for outdoors.">
          <Segmented
            label="Theme"
            value={s.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: 'night', label: 'Night' },
              { value: 'sun', label: 'Sunlight' },
            ]}
          />
        </Row>
        <Row title="Text size">
          <Segmented
            label="Text size"
            value={s.textScale}
            onChange={(v) => updateSettings({ textScale: v })}
            options={[
              { value: 1, label: 'A' },
              { value: 1.12, label: 'A+' },
              { value: 1.25, label: 'A++' },
            ]}
          />
        </Row>
        <Row title="Motion" desc="“Device” follows your phone’s reduced-motion setting.">
          <Segmented
            label="Motion"
            value={s.motion}
            onChange={(v) => updateSettings({ motion: v })}
            options={[
              { value: 'system', label: 'Device' },
              { value: 'reduce', label: 'Less' },
              { value: 'full', label: 'Full' },
            ]}
          />
        </Row>
      </section>

      <section class="card" aria-label="Offline">
        <p class="kicker">Offline &amp; install</p>
        <Row
          title={ready ? 'Ready to work offline' : sw === 'installing' ? 'Saving for offline use…' : sw === 'dev' ? 'Offline disabled in development' : 'Offline status'}
          desc={
            pack
              ? `${pack.cached} of ${pack.total} files saved on this phone${pack.missing.length ? ` · missing: ${pack.missing.slice(0, 3).join(', ')}` : ''}.`
              : sw === 'unsupported'
                ? 'This browser cannot save the app for offline use.'
                : 'Tap “Check” to verify every file of the tour is stored.'
          }
        >
          <Button
            size="sm"
            variant="secondary"
            disabled={checking}
            onClick={async () => {
              setChecking(true);
              const res = await checkOfflinePack();
              setChecking(false);
              toast(res ? (res.cached >= res.total ? `All ${res.total} files are stored — you can go offline.` : `${res.cached} of ${res.total} files stored. Stay online a little longer.`) : 'The offline service isn’t running yet. Reload once while online.');
            }}
          >
            {checking ? 'Checking…' : 'Check'}
          </Button>
        </Row>
        <Row title="Connection" desc={online.value ? 'Online (the tour doesn’t need it).' : 'Offline — everything keeps working.'} />
        {estimate ? <Row title="Storage used" desc={`${mb(estimate.usage)} of ${mb(estimate.quota)} available to this app.`} /> : null}
        {!isStandalone.value ? (
          <Row title="Install on your phone" desc="Opens full-screen from your home screen and starts without a connection.">
            {canPromptInstall.value ? (
              <Button size="sm" onClick={() => void promptInstall()}>
                Install
              </Button>
            ) : (
              <a class="btn btn--secondary btn--sm" href={href('help/install')}>
                How
              </a>
            )}
          </Row>
        ) : (
          <Row title="Installed" desc="Running as an app." />
        )}
        {updateReady.value ? (
          <Row title="Update available" desc="Your progress is kept.">
            <Button size="sm" onClick={() => applyUpdate()}>
              Update now
            </Button>
          </Row>
        ) : null}
      </section>

      <section class="card" aria-label="Tour">
        <p class="kicker">Tour</p>
        <Row title={p.paused ? 'Tour is paused' : 'Pause the tour'} desc="Stops GPS and keeps everything as it is.">
          <Button size="sm" variant="secondary" icon={p.paused ? 'play' : 'coffee'} onClick={() => update((prev, now) => (prev.paused ? resume(prev, now) : pause(prev, 'Break', now)))}>
            {p.paused ? 'Resume' : 'Pause'}
          </Button>
        </Row>
        <Row title="Replay the opening" desc="See the title sequence and briefing again.">
          <Button size="sm" variant="secondary" onClick={() => navigate('intro')}>
            Open
          </Button>
        </Row>
        <Row title="Delete photo memories" desc="Removes the photos saved in your journal.">
          <Button size="sm" variant="secondary" onClick={() => setConfirmPhotos(true)}>
            Delete
          </Button>
        </Row>
        <Row title="Start over" desc="Erases all game progress on this phone. Settings are kept.">
          <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>
            Reset
          </Button>
        </Row>
      </section>

      <section class="stack stack--sm center">
        <a class="btn btn--ghost" href={href('help')}>
          <Icon name="help" /> Help, safety, privacy &amp; sources
        </a>
      </section>

      {confirmReset ? (
        <ConfirmDialog
          title="Start over?"
          body="All progress, threads and answers on this phone will be erased. This can’t be undone."
          confirmLabel="Erase progress"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => {
            setConfirmReset(false);
            stop();
            await resetProgress();
            toast('Progress erased.');
            navigate('intro', { replace: true });
          }}
        />
      ) : null}
      {confirmPhotos ? (
        <ConfirmDialog
          title="Delete all photos?"
          body="Photos are only on this phone; deleting them can’t be undone."
          confirmLabel="Delete photos"
          danger
          onCancel={() => setConfirmPhotos(false)}
          onConfirm={async () => {
            setConfirmPhotos(false);
            await clearMemories();
            toast('Photos deleted.');
          }}
        />
      ) : null}
    </div>
  );
}
