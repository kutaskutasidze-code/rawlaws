# Utopia Tokyo — Next.js Conversion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the static HTML clone at `/tmp/v10-utopiatokyo/` into a Next.js 15 App Router project at `~/projects/utopiatokyo/`.

**Architecture:** Next.js App Router with 2 routes (`/` and `/minigame`). All animation logic (main-min.js, flip-min.js, GSAP, Lenis, Barba.js) is preserved as client-side scripts loaded via `next/script`. The 253KB of inline CSS is extracted into a single `globals.css`. All static assets (53 images, 5 fonts, 2 videos) move to `/public/`. jQuery and Webflow runtime are kept since main-min.js depends on them (11 jQuery refs, 13 Barba refs). The Spline 3D viewer loads as an ES module.

**Tech Stack:** Next.js 15, React 19, TypeScript, pnpm

**Key constraints:**
- main-min.js (78KB) is minified and tightly coupled to jQuery, Barba.js, GSAP, Lenis — cannot be refactored
- flip-min.js (22KB) depends on GSAP Flip plugin and the mask DOM structure
- Both scripts must run after the full DOM is rendered (no React hydration conflicts)
- The localStorage bypass + auto-click ENTER WEBSITE fix must be preserved

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `~/projects/utopiatokyo/` (via create-next-app)

- [ ] **Step 1: Create the Next.js project**

```bash
cd ~/projects
pnpm create next-app@latest utopiatokyo --typescript --tailwind=no --eslint --app --src-dir --import-alias="@/*" --turbopack
```

Select: No to Tailwind, Yes to ESLint, Yes to App Router, Yes to src dir.

- [ ] **Step 2: Clean boilerplate**

Delete these files:
- `src/app/page.tsx` (will recreate)
- `src/app/globals.css` (will replace)
- `src/app/page.module.css`
- `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

- [ ] **Step 3: Commit**

```bash
cd ~/projects/utopiatokyo
git add -A && git commit -m "chore: scaffold Next.js 15 project"
```

---

### Task 2: Move Static Assets to /public

**Files:**
- Create: `public/images/` (53 files)
- Create: `public/fonts/` (5 files)
- Create: `public/videos/` (2 files)
- Create: `public/js/` (14 files)

- [ ] **Step 1: Copy all assets from the clone**

```bash
cd ~/projects/utopiatokyo
cp -r /tmp/v10-utopiatokyo/images/ public/images/
cp -r /tmp/v10-utopiatokyo/fonts/ public/fonts/
cp -r /tmp/v10-utopiatokyo/videos/ public/videos/
cp -r /tmp/v10-utopiatokyo/js/ public/js/
```

- [ ] **Step 2: Verify file counts**

```bash
ls public/images/ | wc -l  # expect 53
ls public/fonts/ | wc -l   # expect 5
ls public/videos/ | wc -l  # expect 2
ls public/js/ | wc -l      # expect 14
```

- [ ] **Step 3: Add .gitattributes for LFS (optional but recommended)**

The spline-viewer.js is 2.2MB and videos total ~1.3MB. If pushing to GitHub:

```bash
echo "public/js/spline-viewer.js filter=lfs diff=lfs merge=lfs -text" > .gitattributes
echo "public/videos/** filter=lfs diff=lfs merge=lfs -text" >> .gitattributes
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: move static assets to public/"
```

---

### Task 3: Extract CSS into globals.css

**Files:**
- Create: `src/app/globals.css`

This is the most critical extraction. The clone has 15 `<style>` blocks totaling 253KB of CSS. Extract ALL of them into a single `globals.css`.

- [ ] **Step 1: Extract CSS programmatically**

Write and run this extraction script:

```bash
cd ~/projects/utopiatokyo
node -e "
const fs = require('fs');
const html = fs.readFileSync('/tmp/v10-utopiatokyo/index.html', 'utf8');

// Extract all style block contents
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let css = '';
let match;
while ((match = styleRegex.exec(html)) !== null) {
  const content = match[1].trim();
  if (content) css += content + '\n\n';
}

// Fix font paths (absolute /fonts/ is fine for Next.js public/)
// Fix the broken lenis selector (already fixed but double-check)
css = css.replace('.lenis.{overflow:clip}', '.lenis.lenis-stopped{overflow:clip}');

// Remove the cloner-injected overflow rule if it somehow survived
css = css.replace(/html,body\{overflow-y:auto!important;overflow-x:hidden!important;scroll-behavior:smooth\}/g, '');

fs.writeFileSync('src/app/globals.css', css);
console.log('Extracted', css.length, 'chars of CSS');
"
```

- [ ] **Step 2: Verify CSS contains key rules**

```bash
grep -c '@font-face' src/app/globals.css      # expect 6
grep -c '@keyframes' src/app/globals.css       # expect ~10-21
grep -c '.section.cc-' src/app/globals.css     # expect multiple
grep 'lenis-stopped' src/app/globals.css       # expect the fixed rule
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css && git commit -m "feat: extract all CSS into globals.css"
```

---

### Task 4: Extract Body HTML into Page Components

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/minigame/page.tsx`
- Create: `src/components/UtopiaBody.tsx`
- Create: `src/components/MinigameBody.tsx`

The body HTML is ~200KB for the main page and ~130KB for minigame. These are large static HTML blocks that must be rendered exactly as-is for the animation scripts to work.

- [ ] **Step 1: Extract the main page body HTML**

Write and run this extraction script:

```bash
cd ~/projects/utopiatokyo
node -e "
const fs = require('fs');
const html = fs.readFileSync('/tmp/v10-utopiatokyo/index.html', 'utf8');

// Extract body content (between </head><body> and the script tags)
const bodyStart = html.indexOf('</head><body>') + '</head><body>'.length;
const scriptsStart = html.indexOf('<!-- X-RAY FIX: Skip disclaimer');
let body = html.slice(bodyStart, scriptsStart).trim();

// Convert HTML attributes for React/JSX:
// 1. class -> className
body = body.replace(/\bclass=\"/g, 'className=\"');
// 2. for -> htmlFor
body = body.replace(/\bfor=\"/g, 'htmlFor=\"');
// 3. tabindex -> tabIndex
body = body.replace(/\btabindex=\"/g, 'tabIndex=\"');
// 4. aria-labelledby (already valid JSX)
// 5. clip-path in inline styles -> clipPath (but we stripped inline styles)
// 6. stroke-width -> strokeWidth, fill-rule -> fillRule, clip-rule -> clipRule
body = body.replace(/stroke-width=/g, 'strokeWidth=');
body = body.replace(/stroke-linecap=/g, 'strokeLinecap=');
body = body.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
body = body.replace(/fill-rule=/g, 'fillRule=');
body = body.replace(/clip-rule=/g, 'clipRule=');
body = body.replace(/clip-path=/g, 'clipPath=');
body = body.replace(/stroke-dasharray=/g, 'strokeDasharray=');
body = body.replace(/stroke-dashoffset=/g, 'strokeDashoffset=');
body = body.replace(/stroke-miterlimit=/g, 'strokeMiterlimit=');
body = body.replace(/\bviewBox=/g, 'viewBox=');
// 7. xmlns:xlink -> xmlnsXlink (but better to just remove it)
body = body.replace(/xmlns:xlink=\"[^\"]*\"/g, '');
body = body.replace(/xlink:href=/g, 'xlinkHref=');
// 8. Booleans: muted, playsinline, hidden, inert need to be muted={true} etc OR just keep as-is (React handles bare attributes)
// 9. Self-closing tags: <br> -> <br/>, <img ...> -> <img .../>, <input> -> <input/>
body = body.replace(/<br>/g, '<br/>');
body = body.replace(/<hr>/g, '<hr/>');
body = body.replace(/<img ([^>]*[^/])>/g, '<img $1/>');
body = body.replace(/<source ([^>]*[^/])>/g, '<source $1/>');
body = body.replace(/<input ([^>]*[^/])>/g, '<input $1/>');
// 10. Remove webkit-playsinline (not valid JSX)
body = body.replace(/webkit-playsinline=\"\"/g, '');
// 11. data-pen-marker=\"\" -> data-pen-marker=''
// data-* attributes are fine in JSX as-is
// 12. Comments inside JSX: <!-- --> -> {/* */}
body = body.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');

const component = \`'use client';

export default function UtopiaBody() {
  return (
    <>
      \${body}
    </>
  );
}
\`;

fs.mkdirSync('src/components', { recursive: true });
fs.writeFileSync('src/components/UtopiaBody.tsx', component);
console.log('Wrote UtopiaBody.tsx:', component.length, 'chars');
"
```

**IMPORTANT:** This script handles 90% of conversions. After running it, manually check for remaining JSX issues:
- Search for any remaining `class=` (should all be `className=`)
- Search for unclosed tags
- Search for HTML comments that weren't converted
- Fix any SVG attributes that use kebab-case

- [ ] **Step 2: Do the same for the minigame page**

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('/tmp/v10-utopiatokyo/minigame/index.html', 'utf8');
const bodyStart = html.indexOf('<body>') + '<body>'.length;
const bodyEnd = html.lastIndexOf('</body>');
let body = html.slice(bodyStart, bodyEnd).trim();

// Same JSX conversions as above
body = body.replace(/\bclass=\"/g, 'className=\"');
body = body.replace(/\bfor=\"/g, 'htmlFor=\"');
body = body.replace(/\btabindex=\"/g, 'tabIndex=\"');
body = body.replace(/stroke-width=/g, 'strokeWidth=');
body = body.replace(/fill-rule=/g, 'fillRule=');
body = body.replace(/clip-rule=/g, 'clipRule=');
body = body.replace(/xmlns:xlink=\"[^\"]*\"/g, '');
body = body.replace(/xlink:href=/g, 'xlinkHref=');
body = body.replace(/<br>/g, '<br/>');
body = body.replace(/<img ([^>]*[^/])>/g, '<img $1/>');
body = body.replace(/<source ([^>]*[^/])>/g, '<source $1/>');
body = body.replace(/webkit-playsinline=\"\"/g, '');
body = body.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');

const component = \`'use client';

export default function MinigameBody() {
  return (
    <>
      \${body}
    </>
  );
}
\`;

fs.writeFileSync('src/components/MinigameBody.tsx', component);
console.log('Wrote MinigameBody.tsx:', component.length, 'chars');
"
```

- [ ] **Step 3: Create the page route files**

Create `src/app/page.tsx`:

```tsx
import UtopiaBody from '@/components/UtopiaBody';

export default function Home() {
  return <UtopiaBody />;
}
```

Create `src/app/minigame/page.tsx`:

```tsx
import MinigameBody from '@/components/MinigameBody';

export default function Minigame() {
  return <MinigameBody />;
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: extract body HTML into React components"
```

---

### Task 5: Set Up Layout with Scripts and Meta

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the root layout**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Utopia Tokyo | Masked. Marked. Watched.',
  description:
    'Step into Utopia Tokyo, where hidden histories converge with a reimagined future, and ancient masks become symbols of untold possibilities.',
  openGraph: {
    title: 'Utopia Tokyo | Masked. Marked. Watched.',
    description:
      'Step into Utopia Tokyo, where hidden histories converge with a reimagined future, and ancient masks become symbols of untold possibilities.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Utopia Tokyo | Masked. Marked. Watched.',
    description:
      'Step into Utopia Tokyo, where hidden histories converge with a reimagined future, and ancient masks become symbols of untold possibilities.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}

        {/* localStorage bypass — skip disclaimer on load */}
        <Script id="disclaimer-bypass" strategy="beforeInteractive">{`
          (function(){
            var key = "utopia-glitch-preference";
            if (!localStorage.getItem(key)) {
              localStorage.setItem(key, JSON.stringify({preference:"glitch",timestamp:Date.now()}));
            }
          })();
        `}</Script>

        {/* jQuery — required by main-min.js */}
        <Script src="/js/jquery.min.js" strategy="beforeInteractive" />

        {/* Webflow runtime — required by main-min.js */}
        <Script src="/js/webflow.schunk.js" strategy="beforeInteractive" />
        <Script src="/js/webflow.runtime.js" strategy="beforeInteractive" />

        {/* GSAP 3.14.1 + plugins */}
        <Script src="/js/gsap.min.js" strategy="beforeInteractive" />
        <Script src="/js/SplitText.min.js" strategy="beforeInteractive" />
        <Script src="/js/ScrollTrigger.min.js" strategy="beforeInteractive" />
        <Script src="/js/Flip.min.js" strategy="beforeInteractive" />
        <Script src="/js/ScrambleTextPlugin.min.js" strategy="beforeInteractive" />
        <Script src="/js/DrawSVGPlugin.min.js" strategy="beforeInteractive" />

        {/* Barba.js — page transitions (used by main-min.js) */}
        <Script src="/js/barba.min.js" strategy="beforeInteractive" />

        {/* Lenis smooth scroll */}
        <Script src="/js/lenis.min.js" strategy="beforeInteractive" />

        {/* Site animation scripts */}
        <Script src="/js/main-min.js" strategy="afterInteractive" />
        <Script src="/js/flip-min.js" strategy="afterInteractive" />

        {/* Auto-click ENTER WEBSITE to trigger real exitPreloader */}
        <Script id="auto-enter" strategy="lazyOnload">{`
          (function(){
            var check = setInterval(function(){
              var btn = document.querySelector('.preloader__cta .button');
              if (!btn) { clearInterval(check); return; }
              if (btn.style.pointerEvents === 'auto') {
                clearInterval(check);
                btn.click();
              }
            }, 100);
            setTimeout(function(){
              clearInterval(check);
              var btn = document.querySelector('.preloader__cta .button');
              if (btn) btn.click();
            }, 8000);
          })();
        `}</Script>
      </body>
    </html>
  );
}
```

**Note on Spline viewer:** It's an ES module (2.2MB). Load it separately only on the main page via a `<script type="module">` tag inside the UtopiaBody component, or add it here with `strategy="lazyOnload"`. Since it's a custom element (`<spline-viewer>`), it needs `type="module"`. Add to layout:

```tsx
<Script src="/js/spline-viewer.js" strategy="lazyOnload" type="module" />
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: set up layout with all scripts and metadata"
```

---

### Task 6: Fix JSX Compilation Errors

**Files:**
- Modify: `src/components/UtopiaBody.tsx`
- Modify: `src/components/MinigameBody.tsx`

The auto-generated components WILL have JSX errors. This task fixes them iteratively.

- [ ] **Step 1: Try building**

```bash
cd ~/projects/utopiatokyo
pnpm build 2>&1 | head -50
```

- [ ] **Step 2: Fix errors one by one**

Common issues to fix:
1. **Unclosed tags** — `<img>`, `<br>`, `<input>`, `<source>` that the regex missed
2. **`style` attribute** — HTML uses strings (`style="display:none"`), JSX needs objects (`style={{display:'none'}}`). Convert all inline style attributes.
3. **SVG attributes** — `xmlns:xlink`, `xlink:href`, `stroke-width` etc.
4. **Boolean attributes** — `muted`, `playsinline`, `hidden`, `inert` — React handles bare boolean attrs, but some may need `={true}`
5. **`dangerouslySetInnerHTML`** — if any `<script>` tags remain in the body HTML, they need to be removed (scripts are in layout now)
6. **Duplicate `className` or malformed attributes** from the regex conversion

For each error the compiler reports, fix it in the component file and re-run `pnpm build`.

- [ ] **Step 3: Alternative approach if too many errors**

If the JSX conversion produces hundreds of errors, use `dangerouslySetInnerHTML` instead:

```tsx
'use client';

import { useEffect, useRef } from 'react';

export default function UtopiaBody() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Force re-evaluation after mount for scripts that query the DOM
    if (typeof window !== 'undefined' && window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  }, []);

  return (
    <div
      ref={ref}
      dangerouslySetInnerHTML={{ __html: BODY_HTML }}
    />
  );
}

const BODY_HTML = `...raw HTML string here...`;
```

This bypasses ALL JSX conversion issues. The raw HTML is injected as-is.

- [ ] **Step 4: Verify dev server runs**

```bash
pnpm dev
# Open http://localhost:3000, check for errors in terminal and browser console
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "fix: resolve JSX compilation errors"
```

---

### Task 7: Verify Animations Work

**Files:** None (testing only)

- [ ] **Step 1: Test preloader sequence**

Open http://localhost:3000 — the preloader should:
1. Show UTOPIA TOKYO scramble text
2. Show loading bar
3. Auto-click ENTER WEBSITE after loading completes
4. Preloader exits with center-split mask animation
5. Page content reveals with Lenis smooth scroll active

- [ ] **Step 2: Test scroll animations**

Scroll down and verify:
1. Kanji SVG draw-on-scroll animation (東京 characters)
2. Marquee text scroll direction changes
3. Breaker section circle scale animation (sticky content stays visible)
4. Builder section sticky behavior
5. Footer scale transition

- [ ] **Step 3: Test mask interactions**

On the masks grid section:
1. Hover over masks — name label should reveal with scramble animation
2. Click Grid/List toggle — Flip animation should transition between views
3. Click a mask — modal view should open with stats

- [ ] **Step 4: Test minigame page**

Navigate to http://localhost:3000/minigame — verify it loads and functions.

- [ ] **Step 5: Fix any issues found and commit**

```bash
git add -A && git commit -m "fix: animation and interaction issues"
```

---

### Task 8: Push to GitHub and Deploy

**Files:** None

- [ ] **Step 1: Push to GitHub**

```bash
cd ~/projects/utopiatokyo
gh repo create utopiatokyo --public --source=. --push --description "Utopia Tokyo — Next.js"
```

- [ ] **Step 2: Deploy to Vercel**

```bash
vercel --prod
```

- [ ] **Step 3: Commit any deployment config**

```bash
git add -A && git commit -m "chore: deployment config"
```

---

## Notes

- **Why keep jQuery/Barba/Webflow:** main-min.js has 11 jQuery refs and 13 Barba refs. These are deeply integrated into the animation engine. Removing them would require reverse-engineering 78KB of minified code.
- **Why `dangerouslySetInnerHTML` may be needed:** The body HTML is 200KB of complex nested elements with SVGs, data attributes, and animation hooks. Converting every attribute to JSX is error-prone and provides zero benefit since the HTML is static.
- **Script loading order matters:** jQuery and GSAP must load before main-min.js. Using `beforeInteractive` ensures they're in `<head>`. main-min.js and flip-min.js use `afterInteractive` to run after DOM is ready.
- **No SSR concerns:** The entire page is client-rendered (`'use client'`). The animation scripts expect a fully rendered DOM.
