<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Community listings show only groups from the member's own age band; admins also default to their own band and must explicitly opt in to see other bands. Keep the filter in a pure helper with a unit test, and let row-level security remain the real gate. Why: each age band is a separate safe space, and moderation access to other bands should be a deliberate choice.
- Authentication emails use the managed email SDK's signed webhook and six templates with shared email-safe theme tokens; keep /lovable/ routes outside app redirects and CSRF checks. Why: account confirmation and recovery must work without an app session.
- Resolve reports through the role-checked atomic respond_report RPC; surface responses only to their reporter through existing report RLS. Why: closing a report and notifying its reporter must be consistent without creating cross-age private chats.
- Open report badges and inboxes share one user-keyed query; private request counts are explicitly participant-scoped. Why: moderation visibility must not create phantom personal notifications.
- Chat voice memos use the shared WAV recorder, private chat-audio storage and message-linked access policies; never transcribe recordings automatically. Why: recipients can listen without exposing recordings or requiring intelligible speech.
- Confirm list deletion inside the app and check the deleted row before updating the selection. Why: native browser confirmations may be unavailable in embedded previews.
