import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMe } from "@/lib/auth";
import { useActsAsTeacher } from "@/lib/teacher-view";
import { TeacherLessons } from "@/components/TeacherHome";

export const Route = createFileRoute("/_authenticated/mijn-lessen")({
  head: () => ({ meta: [{ title: "Lessen — CeritaProject" }] }),
  component: MyLessonsPage,
});

/** Teachers' lessons, on their own page so the home screen stays clear. */
function MyLessonsPage() {
  const { data: me } = useMe();
  const asTeacher = useActsAsTeacher();
  if (!me) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (!asTeacher) return <Navigate to="/home" replace />;
  return <TeacherLessons uid={me.user.id} />;
}
