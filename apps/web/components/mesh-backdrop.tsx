/**
 * A CSS mesh gradient in the brand hue, plus film grain.
 *
 * Layered radial gradients rather than an image: it ships no asset, scales to
 * any viewport, and follows the theme. The grain is the part that matters —
 * a clean gradient reads flat and digital; a faintly grained one reads
 * printed, which is what makes the technique look expensive.
 *
 * Deliberately no `filter: blur()`. A large blurred layer is re-composited on
 * every frame, which is affordable while nothing else moves and ruinous during
 * a page-wide transition. Radial gradients are already soft, so the softness is
 * baked into the stops instead and the whole backdrop costs nothing to animate.
 */

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E";

const POOLS = [
  "radial-gradient(60% 55% at 16% 20%, oklch(0.55 0.11 178 / 0.50) 0%, transparent 70%)",
  "radial-gradient(55% 50% at 82% 10%, oklch(0.62 0.10 168 / 0.34) 0%, transparent 72%)",
  "radial-gradient(65% 60% at 64% 74%, oklch(0.48 0.09 192 / 0.44) 0%, transparent 70%)",
  "radial-gradient(60% 55% at 8% 86%, oklch(0.42 0.07 200 / 0.38) 0%, transparent 72%)",
].join(",");

export function MeshBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ contain: "paint" }}
    >
      <div className="mesh-drift absolute -inset-1/4" style={{ background: POOLS }} />

      {/* a hairline grid, so the pools sit on structure rather than on nothing */}
      <div className="dot-grid absolute inset-0 opacity-35" />

      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN}")`, backgroundRepeat: "repeat" }}
      />

      {/* a vignette, so the panel edge does not cut the mesh off mid-pool */}
      <div className="absolute inset-0 bg-gradient-to-t from-canvas/70 via-transparent to-canvas/30" />
    </div>
  );
}
