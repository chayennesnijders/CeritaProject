---
name: social-agent
description: Weekly social-media run for CeritaProject (TikTok, Instagram Reels, Snapchat Spotlight, YouTube Shorts) — evaluate last week's posts and wachtlijst sign-ups, research this week's trends, plan and render 7 new videos with captions, and publish the plan to the Cerita Groeistudio dashboard. Use when asked to run the social agent, make the week's content, or evaluate social results.
---

# Cerita social agent

Goal: as many **wachtlijst sign-ups** (app.ceritaproject.nl/wachtlijst) as possible from TikTok, Instagram, Snapchat and YouTube — safely, for young people aged 13–27. Sign-ups per platform are the score; views and likes only explain it.

Dashboard (the agent's memory and the owner's view): **https://claude.ai/artifact/GujLnz3uDRbbxVU9ddgN39** ("Cerita Groeistudio"). Read and write it with the `ArtifactData` tool; upload videos with the `Artifact` tool (`url` + `asset: true` + `file_paths`). Write in simple Dutch for the owner.

## Database (collections in the dashboard)

- `weeks/<YYYY-Www>` — `{week, start, end, focus, summary, evaluation, trends:[{platform, trend, use}], playbook:[{platform, rule}]}` (ISO week, e.g. `2026-W47`; platforms `tiktok|instagram|snapchat|youtube`).
- `posts/<YYYY-Www>-<1..7>` — `{week, date "YYYY-MM-DD", time "HH:MM", times:{tiktok,instagram,snapchat,youtube}, format, hook, onscreen, captions:{tiktok,instagram,snapchat,youtube}, sound, experiment, why, video:<asset id>, status:"gepland"|"geplaatst", posted_at, stats:{<platform>:{views,likes,comments,shares,saves,follows}}}`. The owner sets `status` and `stats` from the page — never overwrite those two fields on an existing post.
- `signups/<YYYY-Www>` — `{tiktok, instagram, snapchat, youtube, other}` entered by the owner from Beheer → Wachtlijst (sources `?bron=tiktok` etc.).
- `learnings/<l-NNN>` — `{date, week, text, evidence, confidence:"laag"|"middel"|"hoog", platform?}` — the growing memory. Add new ones, raise or lower confidence of old ones with evidence; never silently delete.
- `agent/status` — `{week, last_run, next_run, message}`: the message the owner reads first.

Always pass `if_version` (from your read) when writing an existing document.

## Weekly run (every Sunday)

1. **Read everything**: `list` weeks, posts, signups, learnings, agent/status (use `out_dir` if large). Work out last week and next week (Mon–Sun, Europe/Amsterdam).
2. **Evaluate last week** (write it to `weeks/<last>.evaluation` in 4–8 plain sentences):
   - Sign-ups per platform vs. the week before; which platform grew.
   - Per posted post: score = (likes + 2·comments + 3·shares + 3·saves + 5·follows) / views, per platform. Rank formats, hooks, topics, posting times.
   - Missing data: say so kindly and ask the owner (in the status message) to fill it in; don't invent numbers. Posts not marked "geplaatst" count as not posted.
   - Turn each solid finding into a learning (evidence = the numbers). Repeated over ≥2 weeks → confidence "middel"; ≥3 weeks and clear → "hoog".
3. **Research this week's trends** with WebSearch (several searches in one turn): TikTok trends/sounds this week (NL if possible), Instagram Reels, Snapchat Spotlight, YouTube Shorts changes, Dutch calendar moments in the coming week (holidays, Sinterklaas, school/toetsweek, awareness days, weather/season). Keep 4–8 trends that fit a safe youth mental-health brand; drop anything edgy, mean, dangerous or sexual. Write them to `weeks/<next>.trends` with how we use each.
4. **Plan 7 posts** (one per day) for next week:
   - About **70% proven** (formats/topics/times with the best learnings) and **30% experiments** — each experiment tests one thing (hook style, format, time, topic) and says so in `experiment`.
   - Formats available in `tools/social/render.py`: `quote`, `pause` (6–10 messages), `cards` (exactly 3), `words` (hook + text + Riti pose), `overlay` (captions on an owner-supplied video). Backgrounds: `nacht`, `regen`, `zonsondergang` (avoid `lucht` behind yellow text).
   - Hook in the first second; on-screen text ≤ 20 words; one clear call to action (comment / tik 2x / stuur door / link in bio).
   - Captions per platform: TikTok (hook + CTA + 3–5 hashtags + "link in bio"), Instagram (ask to save/send via DM, 3–5 hashtags), Snapchat (short + topic hashtag), YouTube (title-like, curiosity, `#shorts`). Always mention the wachtlijst/link in bio on at least 4 of 7 posts.
   - Times: default weekdays 19:00–20:30, weekend 11:00 or 19:00; shift toward times that scored best. Suggest a sound type in `sound` (the owner picks a trending one in the app).
   - Write a short `why` per post (which learning or trend it uses).
5. **Render**: write `plan.json` (`{"posts":[{id, format, bg, ...}]}`, ids `<week>-<n>`) in a scratch folder and run `python3 tools/social/render.py plan.json <outdir>` from the repo root (needs python3 with Pillow + numpy, and ffmpeg). Look at one frame of every video (ffmpeg `-ss 3 -frames:v 1`) and fix unreadable or overlapping text before uploading.
6. **Publish**: upload the 7 mp4s in one `Artifact` call (`url`, `asset: true`, `file_paths`), then one `ArtifactData` `batch`: 7 posts (`set`, status "gepland"), `weeks/<next>` (focus, summary, trends, playbook — refresh the playbook rules with what you learned), the evaluation on `weeks/<last>` (`update`), new/updated learnings, and `agent/status` with `last_run`, `next_run` (next Sunday 09:40 Europe/Amsterdam) and a friendly 3–5 sentence Dutch message: what you learned, what's new this week, what the owner should do (post daily + tap Geplaatst, fill in stats and sign-ups Friday/Saturday).
7. **Report** in 3–5 lines what you did, with the dashboard link.

## Rules that always apply

- **Safety first**: content for 13–27-year-olds about feelings. Never romanticise sadness, self-harm, eating problems or suicide; always end hopeful; on heavy topics mention 113 (0800-0113) or de Kindertelefoon (0800-0432). No diet/body talk, no dares, no fake statistics or testimonials, no real people or faces of minors.
- **No private contact**: never suggest the account DMs or chats privately with young people; replies point to the app or help lines.
- **Copyright**: only our own rendered videos, Riti and owner-supplied clips; music is chosen by the owner in-app from the platform's library.
- **No auto-posting**: the agent cannot post to the platforms; it prepares, the owner posts (or schedules via Canva's content planner).
- Keep the brand: Riti the pink teddy bear, yellow Dutch text, warm and kind tone, "CeritaProject · link in bio".
- Don't commit personal data or the owner's stats to git; the dashboard holds them.
