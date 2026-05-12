"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@/hooks/useProgress";
import { Button } from "@/components/ui/Button";

interface MarkCompleteButtonProps {
  lessonId: number;
  onCompleted?: () => void;
}

export function MarkCompleteButton({
  lessonId,
  onCompleted,
}: MarkCompleteButtonProps) {
  const { getProgress, markComplete } = useProgress();
  const [isCompleted, setIsCompleted] = useState(false);

  // Load initial completion status
  useEffect(() => {
    const progress = getProgress(lessonId);
    setIsCompleted(progress?.completed ?? false);
  }, [lessonId, getProgress]);

  const handleClick = () => {
    markComplete(lessonId);
    setIsCompleted(true);
    onCompleted?.();
  };

  return (
    <Button
      onClick={handleClick}
      variant={isCompleted ? "secondary" : "primary"}
      disabled={isCompleted}
      aria-pressed={isCompleted}
    >
      {isCompleted ? "✓ مُنجَز" : "وضّح كمُنجَز"}
    </Button>
  );
}
