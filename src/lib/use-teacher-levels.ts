import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isLessonLevel, type LessonLevel } from "@/lib/teacher";

const DEVICE_KEY = "cerita-leraar-groepen";

function deviceLevels(): LessonLevel[] {
  try {
    return (JSON.parse(localStorage.getItem(DEVICE_KEY) ?? "[]") as string[]).filter(isLessonLevel);
  } catch {
    return [];
  }
}

/**
 * The groups a teacher teaches (teachers.levels, set through set_teacher_levels). An admin looking
 * at the app as a teacher has no teacher row; their choice is only remembered on this device.
 */
export function useTeacherLevels(uid: string | undefined) {
  const qc = useQueryClient();
  const key = ["teacher-levels", uid];
  const { data, isLoading } = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: async () => {
      const { data: row, error } = await supabase.from("teachers").select("levels").eq("user_id", uid!).maybeSingle();
      if (error || !row) return { levels: deviceLevels(), onDevice: true };
      return { levels: (row.levels ?? []).filter(isLessonLevel), onDevice: false };
    },
  });
  async function save(levels: LessonLevel[]) {
    qc.setQueryData(key, { levels, onDevice: data?.onDevice ?? true });
    if (data && !data.onDevice) {
      const { error } = await supabase.rpc("set_teacher_levels", { _levels: levels });
      if (!error) return;
    }
    try {
      localStorage.setItem(DEVICE_KEY, JSON.stringify(levels));
    } catch {
      // Not remembered; the choice still works until the page is closed.
    }
  }
  return { levels: data?.levels ?? [], loaded: !isLoading && !!data, save };
}
