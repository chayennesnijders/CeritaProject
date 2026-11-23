# Slideshow templates (TikTok photo mode)

Two fixed templates for CeritaProject, 6–8 slides each; the last slide is always the call to action to the app.

- `vrienden.json`: "Op zoek naar vrienden die je écht begrijpen?" → "Ontmoet straks andere jongeren in de CeritaProject-app. Meld je aan voor de wachtlijst."
- `verhalen.json`: "Heb jij een verhaal dat niemand kent?" → "Jouw verhaal verdient een plek. Binnenkort in de CeritaProject-app."

A new post: copy a template, change the hook and body slides, keep the last (cta) slide, and render with
`node tools/social/tekst/render.cjs <file>.json <out_dir>`. `cover` sets the first slide's colour so the profile grid
keeps one pattern: ink = vrienden, cream = verhalen, pink = animations.
Caption: a short description and five hashtags: #jongeren #verhaal #ceritaproject plus two for the theme.
