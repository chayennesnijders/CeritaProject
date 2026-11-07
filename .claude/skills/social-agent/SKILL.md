---
name: social-agent
description: Weekly social-media run for CeritaProject (TikTok, Instagram Reels, Snapchat Spotlight, YouTube Shorts) — evaluate last week's posts and wachtlijst sign-ups, research this week's trends, plan and render 14 new posts (2 per day) (videos and carousel slides, alternating) with captions, and publish the plan to the Cerita Groeistudio dashboard. Use when asked to run the social agent, make the week's content, or evaluate social results.
---

# Cerita social agent

Goal: as many **wachtlijst sign-ups** (app.ceritaproject.nl/wachtlijst) as possible from TikTok, Instagram, Snapchat and YouTube — safely, for young people aged 13–27. Sign-ups per platform are the score; views and likes only explain it.

Dashboard (the agent's memory and the owner's view): **https://claude.ai/artifact/GujLnz3uDRbbxVU9ddgN39** ("Cerita Groeistudio"). Read and write it with the `ArtifactData` tool; upload videos with the `Artifact` tool (`url` + `asset: true` + `file_paths`). Write in simple Dutch for the owner.

## Database (collections in the dashboard)

- `weeks/<YYYY-Www>` — `{week, start, end, focus, summary, evaluation, trends:[{platform, trend, fit, use}], playbook:[{platform, rule}]}` (ISO week, e.g. `2026-W47`; platforms `tiktok|instagram|snapchat|youtube`).
- `posts/<YYYY-Www>-<1..14>` — `{week, date "YYYY-MM-DD", time "HH:MM", times:{tiktok,instagram,snapchat,youtube}, kind:"video"|"slides", format, slides:[9:16 asset ids], slides_ig:[4:5 asset ids], hook, onscreen, captions:{tiktok,instagram,snapchat,youtube}, sound, experiment, why, video:<asset id>, status:"gepland"|"geplaatst", posted_at, stats:{<platform>:{views,likes,comments,shares,saves,follows}}}`. The owner sets `status` and `stats` from the page — never overwrite those two fields on an existing post.
- `signups/<YYYY-Www>` — `{tiktok, instagram, snapchat, youtube, other}` entered by the owner from Beheer → Wachtlijst (sources `?bron=tiktok` etc.).
- `learnings/<l-NNN>` — `{date, week, text, evidence, confidence:"laag"|"middel"|"hoog", platform?}` — the growing memory. Add new ones, raise or lower confidence of old ones with evidence; never silently delete.
- `agent/status` — `{week, last_run, next_run, message}`: the message the owner reads first.

Always pass `if_version` (from your read) when writing an existing document.

## Weekly run (every Sunday)

1. **Read everything**: `list` weeks, posts, signups, learnings, agent/status (use `out_dir` if large). Work out last week and next week (Mon–Sun, Europe/Amsterdam).
   - **Never replace a planned week**: if `posts/<next week>-*` already exist, skip steps 4–6 for those posts (no new videos), only refresh `weeks/<next>.trends` when you found newer trends, and update `agent/status` (last_run, next_run, a short message). Repo needed but missing? Attach it with `add_repo` (chayennesnijders/CeritaProject) and check out branch `claude/app-namaak-2w4ifo`.
2. **Evaluate last week** (write it to `weeks/<last>.evaluation` in 4–8 plain sentences):
   - Sign-ups per platform vs. the week before; which platform grew.
   - Per posted post: score = (likes + 2·comments + 3·shares + 3·saves + 5·follows) / views, per platform. Rank formats, hooks, topics, posting times.
   - Missing data: say so kindly and ask the owner (in the status message) to fill it in; don't invent numbers. Posts not marked "geplaatst" count as not posted.
   - Turn each solid finding into a learning (evidence = the numbers). Repeated over ≥2 weeks → confidence "middel"; ≥3 weeks and clear → "hoog".
3. **Research this week's trends** with WebSearch (several searches in one turn): TikTok trends/sounds this week (NL if possible), Instagram Reels, Snapchat Spotlight, YouTube Shorts changes, Dutch calendar moments in the coming week (holidays, Sinterklaas, school/toetsweek, awareness days, weather/season). Verify dates before naming a day or event; leave out what you can't confirm.
   **Only trends that fit the project.** A trend fits when it connects to CeritaProject's world: how young people (13–27) feel, sharing your story, friendship and loneliness, school/toetsen/werk, family, self-care and rest, kindness, finding help, or Riti. Leave out trends that are only about products, money, looks/bodies/diets, dating, pranks or dares, celebrities, drama/roasting, alcohol or drugs, or anything mean, edgy, sexual or dangerous — even when they are big. Keep 4–8 trends; for each write `fit` (one sentence: why it fits CeritaProject) and `use` (how we use it) in `weeks/<next>.trends`.
4. **Plan 14 posts — 2 per day** — for next week: every day **one video and one slides post**, in two slots. Weekdays: an afternoon slot after school (default 16:30) and an evening slot (default 19:30–20:00); weekend: 11:00 and 19:00. Alternate which kind goes first: Mon slides at 16:30 + video in the evening, Tue video at 16:30 + slides in the evening, and so on. Number the posts 1–14 in date/time order. Shift slot times and the video/slides balance toward what earns more sign-ups (compare the afternoon slot with the evening slot every week), but keep at least 5 of each kind per week.
   - About **70% proven** (formats/topics/times with the best learnings) and **30% experiments** — each experiment tests one thing (hook style, format, time, topic) and says so in `experiment`.
   - Formats available in `tools/social/render.py`: videos `quote`, `pause` (6–10 messages), `cards` (exactly 3), `words` (hook + text + Riti pose), `overlay` (captions on an owner-supplied video); carousel `slides` (cover hook, 3–8 slides of title + short body, end slide with CTA, `help: true` on heavy topics). Backgrounds: `nacht`, `regen`, `zonsondergang` (avoid `lucht` behind yellow text).
   - Slides: one useful idea per slide (tips, "wat zeg je als…", myth vs. fact, checklist), title ≤ 8 words, body ≤ 25 words, cover hook that makes people swipe. They render as `<id>-916-<k>.png` (TikTok photo mode, Snapchat Story), `<id>-45-<k>.png` (Instagram carousel) and `<id>.mp4` (slideshow for Snapchat Spotlight and YouTube Shorts).
   - Hook in the first second; on-screen text ≤ 20 words; one clear call to action (comment / tik 2x / stuur door / link in bio).
   - Captions per platform: TikTok (hook + CTA + 3–5 hashtags + "link in bio"), Instagram (ask to save/send via DM, 3–5 hashtags), Snapchat (short + topic hashtag), YouTube (title-like, curiosity, `#shorts`). Always mention the wachtlijst/link in bio on at least 8 of 14 posts.
   - Two posts on one day never share a topic or format; vary topics across the week (feelings, friendship, school, rest, kindness, Riti). Suggest a sound type in `sound` (the owner picks a trending one in the app).
   - Write a short `why` per post (which learning or trend it uses).
5. **Render**: write `plan.json` (`{"posts":[{id, format, bg, ...}]}`, ids `<week>-<n>`) in a scratch folder and run `python3 tools/social/render.py plan.json <outdir>` from the repo root (needs python3 with Pillow + numpy, and ffmpeg). Look at one frame of every video (ffmpeg `-ss 3 -frames:v 1`) and fix unreadable or overlapping text before uploading.
6. **Publish**: upload the files with `Artifact` (`url`, `asset: true`, `file_paths`, at most 25 per call — about 5 calls for a week of 14 posts), then one `ArtifactData` `batch`: 14 posts (`set`, status "gepland"; slide posts get `kind:"slides"`, `slides`, `slides_ig` and the slideshow as `video`), `weeks/<next>` (focus, summary, trends, playbook — refresh the playbook rules with what you learned), the evaluation on `weeks/<last>` (`update`), new/updated learnings, and `agent/status` with `last_run`, `next_run` (next Sunday 09:40 Europe/Amsterdam) and a friendly 3–5 sentence Dutch message: what you learned, what's new this week, what the owner should do (download the Weekpakket and schedule it in one go, tap Geplaatst, fill in stats and sign-ups Friday/Saturday).
7. **Report** in 3–5 lines what you did, with the dashboard link.

## Rules that always apply

- **Safety first**: content for 13–27-year-olds about feelings. Never romanticise sadness, self-harm, eating problems or suicide; always end hopeful; on heavy topics mention 113 (0800-0113) or de Kindertelefoon (0800-0432). No diet/body talk, no dares, no fake statistics or testimonials, no real people or faces of minors.
- **No private contact**: never suggest the account DMs or chats privately with young people; replies point to the app or help lines.
- **Copyright**: only our own rendered videos, Riti and owner-supplied clips; music is chosen by the owner in-app from the platform's library.
- **No auto-posting**: the agent cannot post to the platforms; it prepares. The owner downloads the week with the dashboard's "Weekpakket downloaden" button (a zip with a folder per post, `bijschriften.txt`, and `planning.csv` with date, time, platform, files and caption per row) and schedules it in one go in a scheduler.
- Keep the brand: Riti the pink teddy bear, yellow Dutch text, warm and kind tone, "CeritaProject · link in bio".
- Don't commit personal data or the owner's stats to git; the dashboard holds them.
