-- Members can delete their own account (required by the App Store and Play Store).
-- Warnings/time-outs a member received go with them; the ones an admin gave stay, without the admin's name.
ALTER TABLE public.member_warnings DROP CONSTRAINT IF EXISTS member_warnings_member_id_fkey;
ALTER TABLE public.member_warnings ADD CONSTRAINT member_warnings_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.member_warnings ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.member_warnings DROP CONSTRAINT IF EXISTS member_warnings_admin_id_fkey;
ALTER TABLE public.member_warnings ADD CONSTRAINT member_warnings_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE public.member_timeouts DROP CONSTRAINT IF EXISTS member_timeouts_member_id_fkey;
ALTER TABLE public.member_timeouts ADD CONSTRAINT member_timeouts_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.member_timeouts ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.member_timeouts DROP CONSTRAINT IF EXISTS member_timeouts_admin_id_fkey;
ALTER TABLE public.member_timeouts ADD CONSTRAINT member_timeouts_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_responded_by_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
