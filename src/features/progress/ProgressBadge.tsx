"use client";

import { useProgress } from "@/hooks/useProgress";
import { Badge } from "@/components/ui/Badge";

interface ProgressBadgeProps {
  lessonId: number;
}

export function ProgressBadge({ lessonId }: ProgressBadgeProps) {
  const { getProgress } = useProgress();
  const progress = getProgress(lessonId);

  if (!progress) {
    return null;
  }

  if (progress.completed) {
    return <Badge variant="completed">مُنجَز</Badge>;
  }

  if (progress.positionSeconds > 0) {
    return <Badge variant="warning">جاري</Badge>;
  }

  return null;
}
