# Portrait in Motion

A personal profile page built around an interactive 3D particle portrait. Your photo is sampled into tens of thousands of glowing particles that assemble into your face, scatter when you hover over them and snap back into place. Next to the portrait sits a short profile with tabs for About, Work, Journey and Contact.

This repository is a template. Swap in your own photo and text and you have your own profile page.

## Features

- **Particle portrait:** 20,000 to 60,000 particles sampled from your photo, keeping the colours of the original photo.
- **Hover to scatter:** moving the mouse or dragging a finger over the face pushes particles away like magnetic dust, and they drift back.
- **Disperse and form:** blow the portrait apart into swirling 3D noise and bring it back together. It can loop on its own.
- **Orbit:** drag to tilt and pan the camera around the portrait.
- **Settings panel:** particle size, dispersion force, speed, turbulence, bloom glow, density and colour themes.
- **Photo switching:** load any other image into the particle field, by button or by dropping it onto the page.
- **Ambient sound:** an optional soft pulse that the particles react to.
- **Fullscreen mode.**
- **Profile tabs:** keyboard-accessible tabs that work on desktop and mobile.

## Quick start

You need [bun](https://bun.sh). Node.js with npm works too.

```sh
bun install
bun run dev
```

Then open the local address it prints in your browser.

## Make it yours

### 1. Your text

All the words on the page live in one file: `src/content/profile.ts`.

| Field | What it is |
| --- | --- |
| `greeting`, `name` | The headline above the portrait. |
| `roles` | Short labels shown under your name, such as your title, field and city. |
| `email`, `availability` | Shown on the Contact tab. |
| `about.bio` | Two or three sentences about you. |
| `about.focus` | Skills or topics, shown as tags. |
| `about.stats` | Three numbers with labels, such as years of experience. |
| `work` | Projects or highlights. Each has a year, title, summary, tags and an optional link (`href`; use `"#"` for none). |
| `journey` | Your roles over time: period, role and organisation. |
| `links` | Buttons on the Contact tab, such as LinkedIn or GitHub. |

### 2. Your photo

Replace `src/assets/portrait.png` with your own picture and keep the same file name. For the best result:

- Use a head-and-shoulders shot with your face filling most of the frame.
- Choose a plain, darker background. Dark pixels become empty space, so the face stands out.
- Use good, even lighting. Square or portrait images of around 1000 px work well.

### 3. Page title

Update the `title` and `description` meta tags in `src/routes/index.tsx` and `src/routes/__root.tsx`. These are what browsers and link previews show.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the local dev server. |
| `bun run build` | Build for production. |
| `bun run preview` | Preview the production build. |
| `bun run test` | Run the tests. |
| `bun run lint` | Check the code with ESLint. |
| `bun run format` | Format the code with Prettier. |

## Deploying

`bun run build` produces a Cloudflare-ready build (via Nitro) in `.output/`. You can deploy it with `npx nitro deploy --prebuilt`, or import the repository into any host that supports Vite or TanStack Start apps.

## Project structure

```
src/
  assets/portrait.png        your photo
  content/profile.ts         all page text
  components/ParticleFace.tsx  the page: portrait, controls and profile
  components/ProfileTabs.tsx   the About / Work / Journey / Contact tabs
  lib/particle-engine.ts     the Three.js particle engine
  lib/ambient-audio.ts       the optional ambient sound
  routes/                    pages and page metadata
```

## Built with

TanStack Start, React 19, Three.js, Tailwind CSS 4 and Vite.

## Creator

Made by Bilal. If you'd like to get in touch, reach out on [LinkedIn](https://www.linkedin.com/in/bilalfl/).

## License

MIT. See [LICENSE](LICENSE).
