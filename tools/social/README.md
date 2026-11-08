# Social video tools

Renders CeritaProject's short videos (1080x1920) for TikTok, Instagram Reels, Snapchat Spotlight and YouTube Shorts.

    python3 tools/social/render.py plan.json [outdir]

Animations in the owner's own voice (2D little people, captions timed from the voice itself):

    python3 tools/social/animate.py script.json [preview-times]

See the docstring in `render.py` and `animate.py` for the plan format. Used by the social agent (`.claude/skills/social-agent/SKILL.md`).
Needs python3 with Pillow and numpy, and ffmpeg. Riti images come from `public/riti/`.

`fonts/Figtree.ttf` is Figtree by Erik Kennedy, licensed under the SIL Open Font License 1.1.
