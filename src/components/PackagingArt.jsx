import { Sparkles, Droplets, ShieldCheck, Sun } from "lucide-react";

export default function PackagingArt({ colors, category }) {
  const Icon = category === "Cleanser" ? Droplets : category === "Sunscreen" ? Sun : category === "Serum" ? Sparkles : ShieldCheck;
  return (
    <div
      className="ss-pack"
      style={{ background: `linear-gradient(160deg, ${colors[0]}, ${colors[1]})`, width: "100%", height: "100%" }}
    >
      <Icon size={34} color="#fff" strokeWidth={1.6} style={{ opacity: 0.85, zIndex: 1 }} />
    </div>
  );
}
