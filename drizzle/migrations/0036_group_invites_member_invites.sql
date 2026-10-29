create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now()
);

-- Maximaal één openstaande uitnodiging per persoon per groep.
create unique index group_invites_one_pending
  on public.group_invites (group_id, invitee_id)
  where status = 'pending';

grant select, insert, delete on public.group_invites to authenticated;
grant all on public.group_invites to service_role;

alter table public.group_invites enable row level security;

-- Zelf ingestuurde, zelf ontvangen, en beheerders zien alles.
create policy "see own group invites"
  on public.group_invites for select to authenticated
  using (invitee_id = auth.uid() or inviter_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Alleden die zelf lid zijn van de groep mogen iemand uitnodigen;
-- de genodigde moet in dezelfde leeftijdsgroep als de groep zitten.
create policy "group members can invite same band"
  on public.group_invites for insert to authenticated
  with check (
    inviter_id = auth.uid()
    and public.is_member(group_id)
    and invitee_id <> auth.uid()
    and exists (
      select 1
      from public.groups g
      join public.profiles p on p.id = invitee_id
      where g.id = group_id
        and g.age_group = p.age_group
    )
  );

-- Degene die uitnodigde kan een nog openstaande uitnodiging intrekken.
create policy "inviter can cancel pending invite"
  on public.group_invites for delete to authenticated
  using (inviter_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- De genodigde accepteert of weigert via deze beveiligde functie;
-- bij accepteren wordt het lid meteen toegevoegd aan de groep.
create or replace function public.respond_group_invite(p_invite uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.group_invites%rowtype;
begin
  select * into inv from public.group_invites where id = p_invite;
  if not found or inv.invitee_id <> auth.uid() or inv.status <> 'pending' then
    return 'not_allowed';
  end if;
  update public.group_invites
    set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_invite;
  if p_accept then
    insert into public.group_members (group_id, user_id)
    values (inv.group_id, inv.invitee_id)
    on conflict do nothing;
  end if;
  return 'ok';
end $$;

grant execute on function public.respond_group_invite(uuid, boolean) to authenticated;