/**
 * A CSS mesh gradient in the brand hue, plus film grain.
 *
 * Layered radial gradients rather than an image: it ships no asset, scales to
 * any viewport, and follows the theme. The grain is the part that matters —
 * a clean gradient reads flat and digital; a faintly grained one reads
 * printed, which is what makes the technique look expensive.
 */

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E";

export function MeshBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the mesh — four bleeding pools of the brand family */}
      <div
        className="mesh-drift absolute -inset-1/4"
        style={{
          background: [
            "radial-gradient(at 18% 22%, oklch(0.55 0.11 178 / 0.55) 0px, transparent 55%)",
            "radial-gradient(at 78% 12%, oklch(0.62 0.10 168 / 0.38) 0px, transparent 50%)",
            "radial-gradient(at 62% 72%, oklch(0.48 0.09 192 / 0.48) 0px, transparent 55%)",
            "radial-gradient(at 12% 82%, oklch(0.42 0.07 200 / 0.42) 0px, transparent 55%)",
          ].join(","),
          filter: "blur(48px)",
        }}
      />

      {/* a hairline grid, so the pools sit on structure rather than on nothing */}
      <div className="dot-grid absolute inset-0 opacity-35" />

      {/* grain */}
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN}")`, backgroundRepeat: "repeat" }}
      />

      {/* a vignette, so the panel edge does not cut the mesh off mid-pool */}
      <div className="absolute inset-0 bg-gradient-to-t from-canvas/70 via-transparent to-canvas/30" />
    </div>
  );
}
