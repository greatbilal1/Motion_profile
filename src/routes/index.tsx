import { createFileRoute } from "@tanstack/react-router";
import { ParticleFace } from "@/components/ParticleFace";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Personal Profile — Particle Portrait" },
      {
        name: "description",
        content: "Personal profile page with an interactive 3D particle portrait.",
      },
      { property: "og:title", content: "Personal Profile — Particle Portrait" },
      {
        property: "og:description",
        content: "Scatter, orbit and reassemble a portrait made of glowing particles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ParticleFace,
});
