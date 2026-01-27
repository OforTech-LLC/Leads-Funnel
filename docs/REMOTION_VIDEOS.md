# Remotion Hero Videos

This document explains how to render and update the hero videos for each service landing page.

## Overview

Each service landing page displays a full-viewport hero video on initial load. These videos are:

- Pre-rendered during build time using Remotion
- Stored in `/public/videos/` as MP4 files
- Loaded and played by the `<HeroVideo>` component

## Prerequisites

1. **Node.js 18+**
2. **ffmpeg** - Required for video encoding

   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt install ffmpeg

   # Windows
   choco install ffmpeg
   ```

3. **Remotion dependencies**
   ```bash
   cd apps/web
   npm install @remotion/bundler @remotion/renderer @remotion/cli remotion
   ```

## Project Structure

```
apps/web/src/remotion/
├── index.ts              # Remotion entry point
├── Root.tsx              # Composition registry
├── render.ts             # Rendering script
└── compositions/
    └── ServiceHeroVideo.tsx   # Main video template
```

## Rendering Videos

### Render All Videos

```bash
cd apps/web
npx ts-node src/remotion/render.ts
```

This will render all 47 service videos to `/public/videos/hero-{service}.mp4`.

**Note:** Rendering all videos takes approximately 15-30 minutes depending on your hardware.

### Render a Single Video

Use the Remotion CLI:

```bash
npx remotion render src/remotion/index.ts hero-real-estate --output public/videos/hero-real-estate.mp4
```

### Preview Videos in Studio

```bash
npx remotion studio src/remotion/index.ts
```

This opens Remotion Studio where you can preview and test compositions.

## Video Specifications

| Property   | Value                                 |
| ---------- | ------------------------------------- |
| Resolution | 1920x1080 (Full HD)                   |
| Frame Rate | 30 fps                                |
| Duration   | 3 seconds (90 frames)                 |
| Codec      | H.264                                 |
| Quality    | CRF 23 (good balance of quality/size) |
| Format     | MP4                                   |

## Customizing Videos

### Per-Service Theming

Each service has custom theming defined in `ServiceHeroVideo.tsx`:

```typescript
const SERVICE_THEMES: Record<string, { icon: string; gradient: string; accent: string }> = {
  'real-estate': {
    icon: '🏠',
    gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    accent: '#818cf8',
  },
  // ... more services
};
```

To customize a service's video:

1. Edit `SERVICE_THEMES` in `ServiceHeroVideo.tsx`
2. Re-render that service's video

### Animation Timing

The video composition uses Remotion's `spring()` and `interpolate()` for animations:

- **0-15 frames**: Icon animation
- **15-30 frames**: Title reveal
- **30-45 frames**: Subtitle reveal
- **45-90 frames**: Accent line animation

### Adding New Services

1. Add the service ID to the array in `Root.tsx`
2. Add theming in `ServiceHeroVideo.tsx`
3. Run the render script

## Frontend Integration

The `<HeroVideo>` component handles video playback:

```tsx
import { HeroVideo } from '@/components/HeroVideo';

export default function ServicePage() {
  const [showContent, setShowContent] = useState(false);

  return (
    <>
      <HeroVideo
        serviceId="real-estate"
        onComplete={() => setShowContent(true)}
        autoSkipDelay={3000}
        showSkipButton={true}
      />
      {showContent && <LandingContent />}
    </>
  );
}
```

### Props

| Prop             | Type     | Default  | Description                          |
| ---------------- | -------- | -------- | ------------------------------------ |
| `serviceId`      | string   | required | Service identifier                   |
| `onComplete`     | function | -        | Called when video ends or is skipped |
| `autoSkipDelay`  | number   | 3000     | Ms before auto-transition            |
| `showSkipButton` | boolean  | true     | Show skip intro button               |
| `posterImage`    | string   | -        | Fallback image URL                   |

### Accessibility

- **Reduced Motion**: Video is skipped entirely if `prefers-reduced-motion` is enabled
- **Keyboard Navigation**: Press Escape, Enter, or Space to skip
- **Scroll/Touch**: Any scroll or touch interaction skips the video
- **Screen Readers**: Skip button is focusable and labeled

## Fallback Strategy

If the video fails to load:

1. Component shows a loading spinner briefly
2. Automatically transitions to the page content
3. Uses poster image if available

## File Size Optimization

To reduce video file sizes:

1. **Lower CRF value** in `render.ts` (23 is default, 28+ for smaller files)
2. **Reduce resolution** if needed (e.g., 1280x720)
3. **Shorten duration** by reducing `durationInFrames`

Current estimated file size: ~500KB - 1MB per video

## Troubleshooting

### "ffmpeg not found"

Install ffmpeg and ensure it's in your PATH.

### "Out of memory during render"

Render fewer videos at once or increase Node memory:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npx ts-node src/remotion/render.ts
```

### Videos not updating

Clear the `/public/videos/` directory and re-render.

## CI/CD Integration

To render videos in CI:

```yaml
# GitHub Actions example
- name: Install ffmpeg
  run: sudo apt-get install -y ffmpeg

- name: Render videos
  run: |
    cd apps/web
    npx ts-node src/remotion/render.ts
```

**Note:** Consider caching rendered videos to avoid re-rendering on every build.
