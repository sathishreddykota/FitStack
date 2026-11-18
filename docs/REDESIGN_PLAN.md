# Redesign: Ember Night

Concept canvas: "FitStack Motion Concept" (direction board + Today, Food, Train, Coach screens).

## The look

| Token | Value | Used for |
|---|---|---|
| Night | `#0A0A0F` | Page background (cards one step lighter: `#15151D`, borders `#23232E`) |
| Ember | `#FF6B2C` | The one accent: primary buttons, active nav, focus rings, progress |
| Protein | `#FF7A6B` | Protein numbers, bars, rings |
| Carbs | `#FFC24B` | Carbs |
| Fat | `#9B8CFF` | Fat |
| Lime | `#C8F560` | **Wins only:** goal hit, PRs, streaks |
| Type | Space Grotesk / Inter | Numbers + headlines / everything else |

Colour appears only when it means something. Text contrast at least 4.5:1 on Night.

## Motion rules

1. **Numbers count up** to their value (calories, macros, kg, km).
2. **Rings and bars draw in** with a soft overshoot, never a jump.
3. **Cards rise in order**, top to bottom, in a quick cascade.
4. **Food pops** into the log when added.
5. **Wins celebrate** (goal hit, PR): the only loud moments.
6. **Fast and respectful:** every animation under 600 ms; with "reduce motion" on, things just appear.

## Steps (each one checked on the phone before the next)

1. **Foundation:** new colour tokens and fonts in `globals.css`; the three current themes
   (indigo default, cream/green Nutrition, black/orange Workout) become one Ember Night theme.
   Shared motion helpers (count-up, ring draw, rise cascade, pop, win burst). Sidebar, top bar,
   buttons and cards pick it up automatically.
2. **Today (Dashboard):** calorie ring, macro bars, cards cascading in, the running tile.
3. **Food (Nutrition):** meal cards, food search, items popping in, macro summary.
4. **Train (Workouts) and Run:** live set screen, rest timer, PR celebration (Run is already close).
5. **Coach, Progress, Recovery, Water, Settings:** charts restyled to the palette.
6. **Outside the app:** landing page, sign-in, onboarding, app icon and splash screen.

## Not changing

Features, data and layouts stay the same unless a screen's concept says otherwise; this is a
look-and-feel pass. Anything that would change how a feature works gets asked about first.
