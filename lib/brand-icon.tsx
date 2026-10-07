/** JSX for generated PNG icons (next/og). Mirrors the LogoMark ruled-ledger design. */
export function BrandIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const pad = maskable ? size * 0.2 : 0;
  const inner = size - pad * 2;
  const line = Math.max(2, inner * 0.07);
  const rows = [0.33, 0.5, 0.67];
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#166534",
        borderRadius: maskable ? 0 : size * 0.22,
      }}
    >
      <div style={{ width: inner, height: inner, position: "relative", display: "flex" }}>
        {rows.map((y, i) => (
          <div key={y} style={{ position: "absolute", top: inner * y - line / 2, left: inner * 0.28, display: "flex", gap: inner * 0.09 }}>
            <div style={{ width: inner * 0.1, height: line, borderRadius: line, background: "#f4fbf6" }} />
            <div style={{ width: i === 2 ? inner * 0.16 : inner * 0.26, height: line, borderRadius: line, background: "#f4fbf6" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
