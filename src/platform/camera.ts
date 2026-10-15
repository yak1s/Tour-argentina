/**
 * Optional camera, used only after the players open a camera activity.
 * Frames never leave the device; photos are saved locally only when the
 * players press the shutter.
 */

export interface CameraSession {
  stream: MediaStream;
  track: MediaStreamTrack;
  /** Hardware zoom range when the camera supports it. */
  zoom: { min: number; max: number; step: number } | null;
  stop(): void;
}

export function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export class CameraError extends Error {
  constructor(
    message: string,
    readonly kind: 'denied' | 'unavailable' | 'unsupported',
  ) {
    super(message);
  }
}

export async function openCamera(): Promise<CameraSession> {
  if (!cameraSupported()) throw new CameraError('This browser has no camera access.', 'unsupported');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new CameraError('Camera permission was not granted.', 'denied');
    throw new CameraError('No camera is available right now.', 'unavailable');
  }
  const track = stream.getVideoTracks()[0]!;
  let zoom: CameraSession['zoom'] = null;
  try {
    const caps = track.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } };
    if (caps?.zoom && caps.zoom.max > caps.zoom.min) zoom = { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 };
  } catch {
    zoom = null;
  }
  return {
    stream,
    track,
    zoom,
    stop() {
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

/** Applies hardware zoom when available; returns false if the UI should zoom digitally instead. */
export async function setHardwareZoom(session: CameraSession, value: number): Promise<boolean> {
  if (!session.zoom) return false;
  try {
    await session.track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

/** Captures the current video frame as a JPEG (longest side ≤ 1600 px). */
export async function captureFrame(video: HTMLVideoElement, digitalZoom = 1): Promise<{ blob: Blob; width: number; height: number }> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new Error('The camera is not ready yet.');
  const cropW = vw / digitalZoom;
  const cropH = vh / digitalZoom;
  const scale = Math.min(1, 1600 / Math.max(cropW, cropH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cropW * scale);
  canvas.height = Math.round(cropH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not capture the photo.');
  ctx.drawImage(video, (vw - cropW) / 2, (vh - cropH) / 2, cropW, cropH, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  if (!blob) throw new Error('Could not capture the photo.');
  return { blob, width: canvas.width, height: canvas.height };
}
