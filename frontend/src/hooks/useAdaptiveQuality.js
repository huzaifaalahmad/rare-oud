import { useEffect, useMemo, useState } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function connectionSaver() {
  return typeof navigator !== 'undefined' && Boolean(navigator.connection?.saveData);
}

function deviceProfile() {
  if (typeof navigator === 'undefined') return { lowEnd: false, memory: 4, cores: 4, touch: false, saveData: false };
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const touch = navigator.maxTouchPoints > 0;
  const saveData = connectionSaver();
  const ua = navigator.userAgent || '';
  const mobileSafari = /iP(hone|ad|od)/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
  return { lowEnd: cores <= 4 || memory <= 3 || touch || saveData || mobileSafari, memory, cores, touch, saveData, mobileSafari };
}

export default function useAdaptiveQuality() {
  const profile = useMemo(deviceProfile, []);
  const initialReducedMotion = prefersReducedMotion();
  const initialLowPower = profile.lowEnd || initialReducedMotion || profile.saveData;
  const [quality, setQuality] = useState(() => ({
    reducedMotion: initialReducedMotion,
    lowEnd: initialLowPower,
    lowPower: initialLowPower,
    dpr: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, initialLowPower ? 1 : 1.5) : 1,
    fps: 60,
    renderMode: initialLowPower ? 'static' : 'adaptive',
    paused: typeof document !== 'undefined' ? document.hidden : false,
    particleBudget: initialLowPower ? 0 : 80,
    shadowBudget: initialLowPower ? 0 : 1,
    postprocess: !initialLowPower
  }));

  useEffect(() => {
    let frame = 0;
    let frames = 0;
    let last = performance.now();
    let poorFrames = 0;
    let excellentFrames = 0;
    let disposed = false;

    const apply = partial => setQuality(prev => {
      const next = { ...prev, ...partial };
      if (Object.keys(partial).every(key => Object.is(prev[key], next[key]))) return prev;
      return next;
    });

    const computeBudget = lowPower => ({
      dpr: Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5),
      renderMode: lowPower || prefersReducedMotion() ? 'static' : 'adaptive',
      particleBudget: lowPower ? 0 : 80,
      shadowBudget: lowPower ? 0 : 1,
      postprocess: !lowPower && !prefersReducedMotion()
    });

    const tick = now => {
      frames += 1;
      if (now - last >= 1000) {
        const fps = Math.round((frames * 1000) / (now - last));
        poorFrames = fps < 45 ? poorFrames + 1 : Math.max(0, poorFrames - 1);
        excellentFrames = fps > 56 ? excellentFrames + 1 : 0;
        const lowPower = profile.lowEnd || poorFrames >= 2 || prefersReducedMotion() || connectionSaver();
        const canUpgrade = !profile.lowEnd && !prefersReducedMotion() && !connectionSaver() && excellentFrames >= 8;
        apply({ fps, lowEnd: lowPower && !canUpgrade, lowPower: lowPower && !canUpgrade, ...computeBudget(lowPower && !canUpgrade) });
        frames = 0;
        last = now;
      }
      if (!disposed) frame = requestAnimationFrame(tick);
    };

    const onVisibility = () => apply({ paused: document.hidden, renderMode: document.hidden ? 'paused' : (profile.lowEnd ? 'static' : 'adaptive') });
    const motionMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMotion = () => apply({ reducedMotion: prefersReducedMotion(), lowPower: prefersReducedMotion() || profile.lowEnd, ...computeBudget(prefersReducedMotion() || profile.lowEnd) });
    const onMemoryPressure = () => apply({ lowEnd: true, lowPower: true, ...computeBudget(true) });

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onMemoryPressure);
    motionMedia?.addEventListener?.('change', onMotion);
    frame = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onMemoryPressure);
      motionMedia?.removeEventListener?.('change', onMotion);
    };
  }, [profile.lowEnd]);

  return quality;
}
