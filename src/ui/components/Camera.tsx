import { useEffect, useRef, useState } from 'preact/hooks';
import type { ChapterId } from '../../content/types';
import { CameraError, captureFrame, openCamera, setHardwareZoom, type CameraSession } from '../../platform/camera';
import { addMemory } from '../../platform/db';
import { elevationDeg, estimateHeight, startTilt, stopTilt, tiltStatus } from '../../platform/tilt';
import { position } from '../../platform/location';
import { distanceM } from '../../geo/math';
import { haptic } from '../../platform/haptics';
import { sfx } from '../../audio/sfx';
import { Button } from './ui';
import { Icon } from './Icon';

export type CameraMode = 'memory' | 'loupe' | 'survey';

const TITLES: Record<CameraMode, string> = {
  memory: 'Photo memory',
  loupe: 'Look closer',
  survey: 'Surveyor’s challenge',
};

/**
 * Full-screen camera. Opened only when the players ask for it; the stream is
 * stopped as soon as it closes. Photos are stored on this device only.
 */
export function CameraOverlay({
  mode,
  chapterId,
  target,
  onClose,
}: {
  mode: CameraMode;
  chapterId: ChapterId;
  /** For the survey: the point whose height is measured (the Obelisco). */
  target?: { lat: number; lng: number; heightM: number; name: string };
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [session, setSession] = useState<CameraSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saved, setSaved] = useState(0);
  const [distanceInput, setDistanceInput] = useState('');
  const [measured, setMeasured] = useState<{ angle: number; distance: number; height: number } | null>(null);

  useEffect(() => {
    let s: CameraSession | null = null;
    let cancelled = false;
    openCamera()
      .then((sess) => {
        if (cancelled) {
          sess.stop();
          return;
        }
        s = sess;
        setSession(sess);
        if (videoRef.current) {
          videoRef.current.srcObject = sess.stream;
          void videoRef.current.play().catch(() => undefined);
        }
      })
      .catch((e: unknown) => setError(e instanceof CameraError ? e.message : 'The camera could not be opened.'));
    if (mode === 'survey') void startTilt();
    return () => {
      cancelled = true;
      s?.stop();
      if (mode === 'survey') stopTilt();
    };
  }, [mode]);

  // GPS distance suggestion for the survey.
  const fix = position.value;
  const gpsDistance = target && fix && fix.accuracy <= 25 ? Math.round(distanceM(fix, target)) : null;

  const applyZoom = async (z: number) => {
    setZoom(z);
    if (session?.zoom) {
      const hw = Math.min(session.zoom.max, Math.max(session.zoom.min, z));
      await setHardwareZoom(session, hw);
    }
  };
  const digital = session?.zoom ? 1 : zoom;

  const shoot = async () => {
    if (!videoRef.current) return;
    try {
      const { blob, width, height } = await captureFrame(videoRef.current, digital);
      await addMemory({ id: `m-${Date.now()}`, chapter: chapterId, createdAt: Date.now(), blob, width, height });
      setSaved((n) => n + 1);
      haptic('tap');
      void sfx('page', 0.6);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the photo.');
    }
  };

  const measure = () => {
    const angle = elevationDeg.value;
    const d = Number(distanceInput) || gpsDistance || 0;
    if (angle === null || d <= 0) return;
    const height = estimateHeight(d, angle);
    setMeasured({ angle, distance: d, height });
    haptic('success');
  };

  return (
    <div class="camera" role="dialog" aria-modal="true" aria-label={TITLES[mode]}>
      <div class="camera__view">
        <video ref={videoRef} playsInline muted autoPlay style={{ transform: digital > 1 ? `scale(${digital})` : undefined }} />
        {mode === 'survey' ? (
          <svg class="camera__cross" viewBox="0 0 60 60" aria-hidden="true">
            <g stroke="currentColor" stroke-width="1.6" fill="none">
              <circle cx="30" cy="30" r="12" />
              <path d="M30 0v20M30 40v20M0 30h20M40 30h20" />
            </g>
          </svg>
        ) : (
          <div class="camera__frame" aria-hidden="true" />
        )}
        <div class="camera__hud">
          <div class="row row--between">
            <strong>{TITLES[mode]}</strong>
            <button type="button" class="btn btn--icon" style={{ color: '#fff', background: 'rgba(0,0,0,.35)' }} aria-label="Close camera" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          <p class="small" style={{ marginTop: '6px', opacity: 0.9 }}>
            {mode === 'memory'
              ? 'Photos are saved only on this phone, in your journal. Please don’t photograph strangers.'
              : mode === 'loupe'
                ? 'Zoom in on the detail. Nothing is recorded unless you press the shutter.'
                : 'Stay on the pedestrian plaza. Put the cross on the very tip, hold still, then measure.'}
          </p>
          {error ? (
            <p class="small" style={{ marginTop: '6px', color: '#ffd1c4' }}>
              {error} You can close this and carry on — nothing in the game needs the camera.
            </p>
          ) : null}
          {saved > 0 ? <p class="small" style={{ marginTop: '6px', color: '#c7f0d6' }}>Saved {saved} photo{saved > 1 ? 's' : ''} to your journal.</p> : null}
        </div>
      </div>
      <div class="camera__controls">
        {mode === 'survey' ? (
          <div class="stack stack--sm grow">
            <div class="small">
              Angle:{' '}
              <strong>{tiltStatus.value === 'active' && elevationDeg.value !== null ? `${elevationDeg.value.toFixed(1)}°` : tiltStatus.value === 'unavailable' ? 'no tilt sensor' : '…'}</strong>
              {gpsDistance ? <span> · GPS distance ≈ {gpsDistance} m</span> : null}
            </div>
            <label class="small row" style={{ gap: '8px' }}>
              Distance to the base (m)
              <input
                class="input"
                style={{ minHeight: '40px', width: '90px', fontSize: '1rem' }}
                inputMode="numeric"
                value={distanceInput}
                placeholder={gpsDistance ? String(gpsDistance) : 'e.g. 40'}
                onInput={(e) => setDistanceInput((e.currentTarget as HTMLInputElement).value.replace(/[^\d.]/g, ''))}
              />
            </label>
            <span class="xsmall" style={{ opacity: 0.75 }}>
              No GPS? Pace it out: one normal step is about 0.75 m.
            </span>
            {measured && target ? (
              <div class="small" style={{ color: '#f0dcb0' }}>
                Your estimate: <strong>{Math.round(measured.height)} m</strong> (angle {measured.angle.toFixed(1)}°, {measured.distance} m away). The real height is{' '}
                {target.heightM} m —{' '}
                {Math.abs(measured.height - target.heightM) / target.heightM <= 0.15 ? 'surveyor’s accuracy!' : 'not bad for a phone.'}
              </div>
            ) : null}
            <Button variant="primary" onClick={measure} disabled={elevationDeg.value === null || (!distanceInput && !gpsDistance)}>
              Measure
            </Button>
          </div>
        ) : (
          <>
            <div class="grow">
              {mode === 'loupe' || session?.zoom ? (
                <label class="small" style={{ display: 'block' }}>
                  Zoom {zoom.toFixed(1)}×
                  <input
                    type="range"
                    min={1}
                    max={session?.zoom ? Math.min(10, session.zoom.max) : 4}
                    step={0.1}
                    value={zoom}
                    onInput={(e) => void applyZoom(Number((e.currentTarget as HTMLInputElement).value))}
                  />
                </label>
              ) : (
                <span class="small" style={{ opacity: 0.8 }}>
                  Fit the view inside the frame.
                </span>
              )}
            </div>
            <button type="button" class="shutter" aria-label="Take photo" onClick={() => void shoot()} disabled={!session} />
          </>
        )}
      </div>
    </div>
  );
}
