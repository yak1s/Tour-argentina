import { useState } from 'preact/hooks';
import { AUDIO_MANIFEST, clipById, transcriptOf } from '../../content';
import {
  deviceVoiceAvailable,
  nowPlaying,
  pause,
  play,
  replay,
  resume,
  skip,
  speakWithDeviceVoice,
  stop,
} from '../../audio/narrator';
import { settings, updateSettings } from '../../engine/store';
import { Icon } from './Icon';
import { formatDuration } from './ui';

/** Big "Listen" control for a narration clip, with its transcript. */
export function ListenCard({ clipId, showTranscript = true }: { clipId: string; showTranscript?: boolean }) {
  const clip = clipById(clipId);
  const [open, setOpen] = useState(false);
  if (!clip) return null;
  const np = nowPlaying.value;
  const isThis = np?.clipId === clipId;
  const playing = isThis && (np.status === 'playing' || np.status === 'loading');
  const duration = AUDIO_MANIFEST[clipId]?.durationSec ?? 0;
  const err = isThis && np.status === 'error' ? np.error : undefined;
  const label = playing ? 'Pause' : isThis && np.status === 'paused' ? 'Resume' : 'Listen';
  return (
    <div class="stack stack--sm">
      <div class={`listen${playing ? ' is-playing' : ''}`}>
        <button
          type="button"
          class="listen__main"
          aria-label={`${label}: ${clip.title}`}
          onClick={() => {
            if (playing) pause();
            else if (isThis && np.status === 'paused') void resume();
            else void play(clipId);
          }}
        >
          <span class="listen__play">{playing ? <Icon name="pause" /> : <Icon name="play" />}</span>
          <span class="grow">
            <span class="listen__title">{clip.title}</span>
            <span class="listen__meta" style={{ display: 'block' }}>
              {playing ? (
                <span class="row" style={{ gap: '6px' }}>
                  <span class="eq" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  {np.status === 'loading' ? 'Loading…' : 'Playing'}
                </span>
              ) : (
                <>
                  {label} · {formatDuration(duration) || 'narration'}
                </>
              )}
            </span>
          </span>
        </button>
        {isThis && np.status !== 'idle' ? (
          <button type="button" class="btn btn--ghost btn--icon" aria-label="Replay from the start" onClick={() => replay()}>
            <Icon name="replay" />
          </button>
        ) : null}
      </div>
      {err ? (
        <div class="feedback feedback--wrong" role="status">
          {err}
          {deviceVoiceAvailable() ? (
            <>
              {' '}
              <button type="button" class="btn btn--ghost btn--sm" onClick={() => speakWithDeviceVoice(clipId)}>
                Read aloud with the phone’s voice
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {showTranscript ? (
        <details class="disclosure" open={open || Boolean(err)} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>
            <Icon name="chevronRight" size="sm" class="chev" />
            Transcript
          </summary>
          <div class="transcript">{transcriptOf(clip.script)}</div>
        </details>
      ) : null}
    </div>
  );
}

/** Persistent mini-player docked above the tab bar while a narration is loaded. */
export function MiniPlayer() {
  const np = nowPlaying.value;
  if (!np) return null;
  const s = settings.value;
  const pct = np.duration > 0 ? Math.min(100, (np.position / np.duration) * 100) : 0;
  const playing = np.status === 'playing' || np.status === 'loading';
  const sub =
    np.status === 'error'
      ? 'Unavailable — see transcript'
      : np.status === 'ended'
        ? 'Finished'
        : np.deviceVoice
          ? 'Device voice'
          : `${formatDuration(np.position) || '0:00'} / ${formatDuration(np.duration) || '–'}`;
  return (
    <div class="player" role="region" aria-label="Narration player">
      <div class="player__inner">
        <div class="player__meta">
          <div class="player__title">{np.title}</div>
          <div class="player__sub">{sub}</div>
        </div>
        <button type="button" class="btn btn--icon" aria-label="Back 10 seconds" onClick={() => skip(-10)} disabled={np.deviceVoice}>
          <Icon name="back10" />
        </button>
        <button
          type="button"
          class="btn btn--icon is-main"
          aria-label={playing ? 'Pause narration' : 'Play narration'}
          onClick={() => (playing ? pause() : np.status === 'ended' ? replay() : void resume())}
        >
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
        <button
          type="button"
          class="btn btn--icon"
          aria-label={s.muted ? 'Unmute' : 'Mute'}
          onClick={() => updateSettings({ muted: !s.muted })}
        >
          <Icon name={s.muted ? 'mute' : 'volume'} />
        </button>
        <button type="button" class="btn btn--icon" aria-label="Close player" onClick={() => stop()}>
          <Icon name="close" />
        </button>
        <i class="player__bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
