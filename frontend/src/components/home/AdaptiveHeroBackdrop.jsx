import useAdaptiveQuality from '../../hooks/useAdaptiveQuality.js';

export default function AdaptiveHeroBackdrop() {
  const quality = useAdaptiveQuality();
  const mode = quality.reducedMotion || quality.lowPower || quality.paused ? 'static' : 'animated';
  return (
    <div
      className={`hero-backdrop hero-backdrop-${mode}`}
      aria-hidden="true"
      data-fps={quality.fps}
      data-dpr={quality.dpr}
      data-render-mode={quality.renderMode}
      data-particles={quality.particleBudget}
      data-postprocess={quality.postprocess ? 'on' : 'off'}
    />
  );
}
