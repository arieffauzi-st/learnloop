---
name: Playful Warmth Learning
colors:
  surface: '#f1fbff'
  surface-dim: '#d1dce0'
  surface-bright: '#f1fbff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eaf5fa'
  surface-container: '#e4f0f4'
  surface-container-high: '#dfeaef'
  surface-container-highest: '#d9e4e9'
  on-surface: '#131d21'
  on-surface-variant: '#584140'
  inverse-surface: '#283236'
  inverse-on-surface: '#e7f3f7'
  outline: '#8c706f'
  outline-variant: '#e0bfbd'
  surface-tint: '#ae2f34'
  primary: '#ae2f34'
  on-primary: '#ffffff'
  primary-container: '#ff6b6b'
  on-primary-container: '#6d0010'
  inverse-primary: '#ffb3b0'
  secondary: '#006a65'
  on-secondary: '#ffffff'
  secondary-container: '#79f3ea'
  on-secondary-container: '#006f69'
  tertiary: '#705d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#caa800'
  on-tertiary-container: '#4c3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b0'
  on-primary-fixed: '#410006'
  on-primary-fixed-variant: '#8c1520'
  secondary-fixed: '#7cf6ec'
  secondary-fixed-dim: '#5dd9d0'
  on-secondary-fixed: '#00201e'
  on-secondary-fixed-variant: '#00504c'
  tertiary-fixed: '#ffe173'
  tertiary-fixed-dim: '#e8c426'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#554500'
  background: '#f1fbff'
  on-background: '#131d21'
  surface-variant: '#d9e4e9'
typography:
  display-lg:
    fontFamily: Quicksand
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  display-lg-mobile:
    fontFamily: Quicksand
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Quicksand
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Quicksand
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Quicksand
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Quicksand
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  label-sm:
    fontFamily: Quicksand
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system serves a tri-partite user base: elementary-aged children (ages 7–12), their educators, and their parents. It balances gamified, approachable joy for students with utilitarian clarity for busy teachers and glanceable reassurance for parents.

The design movement is **Tactile Warmth & Playful Softness**:
- **Character:** Friendly, encouraging, vibrant, and clean. It eschews bureaucratic classroom dryness in favor of celebratory milestone visual metaphors (quests, streaks, level-ups) without veering into sensory overload.
- **Physicality:** Touchable, squishy micro-interactions, pillowy surfaces, soft ambient color-tinted drop shadows, and oversized, finger-friendly tap targets.
- **Clarity:** Generous breathing room, warm cream canvas backdrops that reduce blue-light glare and screen fatigue, and clean hierarchy separating play surfaces (student view) from high-density record views (teacher dashboard).

## Colors

The palette is tuned around high-energy optimism rooted in warm daylight. It enforces high contrast ratios (WCAG AA compliant) against its tinted backgrounds.

### Roles & Palettes
- **Canvas & Surfaces:**
  - Canvas Base: `#FFF9F0` (Warm Cream) — replaces clinical stark white to ground the app in softness.
  - Surface Default: `#FFFFFF` (Pure Card White) — lifts cards and elevated panels off the cream base.
  - Surface Warm: `#FFF5E6` (Warm Container) — secondary grouping for nested cards, callouts, and side panels.
- **Brand Accents:**
  - **Primary (`#FF6B6B` - Vibrant Coral):** Primary actions, callouts, milestone badges, and celebration highlights.
  - **Secondary (`#4ECDC4` - Mint Teal):** Exploration elements, completed quests, friendly progress indicators, and interactive chips.
  - **Tertiary (`#FFD93D` - Sunny Yellow):** Streak counters, XP reward sparks, star states, and dynamic attention rings.
  - **Lilac Accent (`#A29BFE` - Soft Lilac):** Creative tasks, reading logs, and calm focus tags.
- **Neutrals & Text:**
  - Text Primary: `#2D3436` (Charcoal Slate) — high-contrast readability across all surfaces.
  - Text Muted: `#636E72` (Warm Grey) — helper text, timestamps, and secondary captions.
  - Border Soft: `#F0E5D8` — subtle separation for cards and divider lines without harshness.
- **Semantic Feedback:**
  - Success: `#2ECC71` (Fresh Lime Green) — completed quests and positive streaks.
  - Warning: `#F39C12` (Warm Orange) — due soon and pending approvals.
  - Danger / Urgent: `#E74C3C` (Candy Red) — missing assignments, late alerts, and error states.

## Typography

Typography pairs friendly approachability with rigorous structural readability:
- **Headlines & Labels (`Quicksand`):** Rounded terminals give titles, gamified scores, and chips an open, approachable, and child-welcoming atmosphere. The heavy weights (600 and 700) maintain punch and clarity at small badge sizes.
- **Body & Data (`Inter`):** Renders instructions, teacher comments, and administrative tables with optimal legibility, unambiguous glyph distinction, and calm rhythm.

### Usage Guidance
- Headers should always use sentence case to avoid an intimidating, authoritative tone.
- Numerical values in counters (XP, streak days) use `Quicksand Bold` to reinforce a game-like, tangible feel.
- Mobile screens drop headline sizes to ensure prompt card titles never exceed two lines.

## Layout & Spacing

The layout is built around a **12-column responsive fluid grid** with generous internal spacing to reduce cognitive strain for young readers and busy adults.

### Screen Breakpoints & Behaviors
- **Mobile (< 768px):** 4-column layout with `1rem` margins and `1rem` gutters. All primary kid-facing cards stack vertically into single-column feeds for scroll ease. Tap targets default to minimum `48px` height.
- **Tablet (768px – 1024px):** 8-column layout with `1.5rem` margins and gutters. Two-column card arrangements for quest logs and dual-pane parent review panels.
- **Desktop (> 1024px):** 12-column layout with max-width `1280px` centered canvas, `2rem` margins, and `1.5rem` gutters. Accommodates side-by-side student profiles, interactive assignment trays, and dense administrative grade tables for teachers.

### Spacing Philosophy
- Use `space-lg` (`1.5rem`) and `space-xl` (`2rem`) around interactive card perimeters to avoid clustered click errors.
- Tightly bundle related labels and sub-values using `space-xs` and `space-sm`.

## Elevation & Depth

Visual hierarchy uses soft, colored atmospheric shadows rather than cold monochromatic drop shadows. Depth creates a physical, "pressable" sensation like game tiles and building blocks.

### Depth Scales
- **Surface Flat (Level 0):** Used for base background layouts and neutral static areas. Border: `1.5px solid #F0E5D8`.
- **Card Default (Level 1):** Floating standard items (quests, parent cards). Shadow: `0 8px 24px -4px rgba(45, 52, 54, 0.06), 0 2px 6px -1px rgba(255, 107, 107, 0.04)`.
- **Tactile Interactive / Buttons (Level 2):** Primary clickable components utilize a 3D bottom edge offset (`box-shadow: 0 4px 0 #E05353` for coral buttons) to simulate real mechanical push-buttons.
- **Floating Overlays / Modals (Level 3):** Celebratory level-up popups and streak dialogs. Shadow: `0 20px 32px -8px rgba(45, 52, 54, 0.12), 0 8px 16px -4px rgba(78, 205, 196, 0.1)`.

No pure black shadows (`#000000`) are permitted; all shadows are mixed with warm charcoal slate or tinted with coral/teal brand accents.

## Shapes

The interface embraces a hyper-friendly, injury-free corner philosophy. Geometry feels carved from soft wood or rounded plastic.

- **Standard Base Components (`rounded`, 0.5rem / 8px):** Form inputs, table rows, and secondary utility badges.
- **Main Cards & Containers (`rounded-lg`, 1rem / 16px to 1.5rem / 24px):** All student quest cards, parent summary panels, and reward modules use generous 16px to 24px radius to provide a comfortable, inviting look.
- **Interactive Controls & Status Badges (`pill` / full radius):** Action buttons, tag chips, streak badges, and avatar frames use full circular or pill contours (`9999px`).

## Components

### 1. Tactile Push Buttons
- **Primary (Coral):** Background `#FF6B6B`, text `#FFFFFF`, border radius `9999px`, height `48px` (mobile: `52px`). Casts an extruded 3D bottom bevel (`box-shadow: 0 4px 0 #E05353`). On `:active`, the element translates down `3px` with `box-shadow: 0 1px 0 #E05353` for a satisfying physical click.
- **Secondary (Teal):** Background `#4ECDC4`, text `#FFFFFF`, with matching bottom shadow `#3BB5AC`.
- **Ghost/Warm:** Background `#FFF5E6`, text `#2D3436`, border `2px solid #F0E5D8`.

### 2. Gamified Quest Cards
- White background (`#FFFFFF`) with a `2px solid #F0E5D8` border and `20px` corner radius.
- Includes left-aligned emoji/icon stamp in a tinted circle, bold title in `Quicksand`, completion check circle, and status chip.
- Hover effect lifts card by `-3px` and deepens the warm ambient shadow.

### 3. XP Progress Bars
- Height `16px` (compact) or `24px` (featured quest).
- Track: `#FFF5E6` with an inner border inset.
- Fill: Glossy gradient from `#FFD93D` to `#FFA502` or `#4ECDC4` to `#2ECC71`, rounded with full pills.
- Milestone marker sparkles rendered at percentage increments (25%, 50%, 75%, 100%).

### 4. Streak Flame Counter
- Pill container with soft orange/yellow glow (`rgba(255, 217, 61, 0.25)`).
- Animated flame icon (🔥) paired with bold numerical count in `Quicksand Bold`.
- Tooltip displays weekly progress tracker dots.

### 5. Status Chips & Badges
- Fully rounded pills with `label-md` uppercase styling:
  - **Todo:** Background `#FFF5E6`, text `#F39C12`, icon `✏️`.
  - **Done:** Background `rgba(46, 204, 113, 0.15)`, text `#27AE60`, icon `✅`.
  - **Due Soon:** Background `rgba(243, 156, 18, 0.15)`, text `#D68910`, icon `⏳`.
  - **Late / Missing:** Background `rgba(231, 76, 60, 0.12)`, text `#C0392B`, icon `⚠️`.

### 6. Role Selectors & Navigation
- Segmented toggle with bouncy spring transitions.
- Roles clearly indicated with icons: Student 🎒, Teacher 📚, Parent 🏡.
- Active state uses pure `#FFFFFF` fill with high elevation and bright coral typography.

### 7. Form Inputs & Checkboxes
- **Inputs:** Height `48px`, background `#FFFFFF`, border `2px solid #F0E5D8`, focus state `2px solid #4ECDC4` with a `0 0 0 3px rgba(78, 205, 196, 0.2)` halo ring.
- **Checkboxes:** Oversized `24x24px` squares with `8px` corner radius, checking triggers an energetic scale-bounce pop animation with green fill `#2ECC71`.

### 8. Teacher Ops Data Table
- Alternating subtle rows (`#FFFFFF` and `#FFFDF9`), clean spacing with `space-md`, and direct student quest completion toggles.
- Replaces harsh borders with soft tinted dividers (`#F0E5D8`).