# Portrait in Motion (template)

A personal profile page with an interactive WebGL particle portrait. The portrait image is sampled into tens of thousands of particles that form the face, scatter on hover, and can be dispersed and re-formed.

Built with TanStack Start, React 19, Three.js, Tailwind 4 and Vite.

## Make it yours

1. **Text:** edit `src/content/profile.ts`. All page copy (name, roles, about, work, journey, links) lives there.
2. **Photo:** replace `src/assets/portrait.png` with your own portrait. A clear, well-lit head-and-shoulders shot on a plain background works best.
3. **Page title:** update the `title` and `description` meta tags in `src/routes/index.tsx` and `src/routes/__root.tsx`.

## Controls

- **Settings:** particle size, dispersion, speed, turbulence, density and colour themes.
- **Disperse / Form:** scatter the particles or bring them back into the portrait.
- **Photo:** load a different image into the particle field.
- **Full:** fullscreen mode.

## Development

Requires [bun](https://bun.sh) (or Node.js with npm).

```sh
bun install
bun run dev
```

Other scripts: `bun run build`, `bun run test`, `bun run lint`.
