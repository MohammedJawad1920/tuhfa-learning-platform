"use client";

import { useMemo, useState } from "react";
import { buildChapterHierarchy } from "@/lib/lessons";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Lesson } from "@/types/lesson";
import type { FilterParams } from "@/hooks/useLessons";

interface ChapterNavProps {
  lessons: Lesson[];
  onFilterChange: (filters: FilterParams) => void;
}

export function ChapterNav({ lessons, onFilterChange }: ChapterNavProps) {
  const hierarchy = useMemo(() => buildChapterHierarchy(lessons), [lessons]);

  const [activeVolume, setActiveVolume] = useState<1 | 2 | 3 | 4 | null>(null);
  const [activeKitab, setActiveKitab] = useState<string | null>(null);
  const [activeBab, setActiveBab] = useState<string | null>(null);
  const [activeFasl, setActiveFasl] = useState<string | null>(null);

  const volumes = useMemo(
    () => Object.keys(hierarchy).map(Number).sort(),
    [hierarchy],
  );

  const kitabs = useMemo(() => {
    if (!activeVolume || !hierarchy[activeVolume]) return [];
    return Object.keys(hierarchy[activeVolume]).sort();
  }, [activeVolume, hierarchy]);

  const babs = useMemo(() => {
    if (
      !activeVolume ||
      !activeKitab ||
      !hierarchy[activeVolume]?.[activeKitab]
    )
      return [];
    return Object.keys(hierarchy[activeVolume][activeKitab]).sort();
  }, [activeVolume, activeKitab, hierarchy]);

  const fasls = useMemo(() => {
    if (
      !activeVolume ||
      !activeKitab ||
      !activeBab ||
      !hierarchy[activeVolume]?.[activeKitab]?.[activeBab]
    )
      return [];
    const lessonIds = hierarchy[activeVolume][activeKitab][activeBab];
    const faslSet = new Set<string>();
    for (const lesson of lessons) {
      if (lessonIds.includes(lesson.id)) {
        if (lesson.chapter.fasl) {
          faslSet.add(lesson.chapter.fasl);
        }
      }
    }
    return Array.from(faslSet).sort();
  }, [activeVolume, activeKitab, activeBab, hierarchy, lessons]);

  const handleVolumeChange = (vol: 1 | 2 | 3 | 4) => {
    setActiveVolume(vol);
    setActiveKitab(null);
    setActiveBab(null);
    setActiveFasl(null);
    onFilterChange({ volume: vol });
  };

  const handleKitabChange = (kitab: string) => {
    setActiveKitab(kitab);
    setActiveBab(null);
    setActiveFasl(null);
    onFilterChange({ volume: activeVolume ?? undefined, kitab });
  };

  const handleBabChange = (bab: string) => {
    setActiveBab(bab);
    setActiveFasl(null);
    onFilterChange({
      volume: activeVolume ?? undefined,
      kitab: activeKitab ?? undefined,
      bab,
    });
  };

  const handleFaslChange = (fasl: string) => {
    setActiveFasl(fasl);
    onFilterChange({
      volume: activeVolume ?? undefined,
      kitab: activeKitab ?? undefined,
      bab: activeBab ?? undefined,
      search: undefined,
    });
  };

  const handleReset = () => {
    setActiveVolume(null);
    setActiveKitab(null);
    setActiveBab(null);
    setActiveFasl(null);
    onFilterChange({});
  };

  return (
    <nav
      aria-label="تصفية الدروس"
      className="space-y-4 rounded-lg border border-border bg-surface p-4"
    >
      {/* Volume tabs */}
      <div className="space-y-2">
        <Label className="block text-sm font-medium text-text-primary">
          المجلد
        </Label>
        <div className="flex gap-2" dir="rtl" lang="ar">
          {volumes.map((vol) => (
            <Button
              key={vol}
              variant={activeVolume === vol ? "primary" : "ghost"}
              onClick={() => handleVolumeChange(vol as 1 | 2 | 3 | 4)}
              className="min-w-12"
            >
              {vol}
            </Button>
          ))}
        </div>
      </div>

      {/* Kitab select */}
      {activeVolume && kitabs.length > 0 && (
        <div className="space-y-2">
          <Label
            htmlFor="kitab-select"
            className="block text-sm font-medium text-text-primary"
          >
            الكتاب
          </Label>
          <Select
            id="kitab-select"
            value={activeKitab ?? ""}
            onChange={(e) => handleKitabChange(e.target.value)}
            dir="rtl"
            lang="ar"
          >
            <option value="">اختر كتاباً</option>
            {kitabs.map((kitab) => (
              <option key={kitab} value={kitab}>
                {kitab}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Bab select */}
      {activeVolume && activeKitab && babs.length > 0 && (
        <div className="space-y-2">
          <Label
            htmlFor="bab-select"
            className="block text-sm font-medium text-text-primary"
          >
            الباب
          </Label>
          <Select
            id="bab-select"
            value={activeBab ?? ""}
            onChange={(e) => handleBabChange(e.target.value)}
            dir="rtl"
            lang="ar"
          >
            <option value="">اختر باباً</option>
            {babs.map((bab) => (
              <option key={bab} value={bab}>
                {bab}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Fasl select */}
      {activeVolume && activeKitab && activeBab && fasls.length > 0 && (
        <div className="space-y-2">
          <Label
            htmlFor="fasl-select"
            className="block text-sm font-medium text-text-primary"
          >
            الفصل
          </Label>
          <Select
            id="fasl-select"
            value={activeFasl ?? ""}
            onChange={(e) => handleFaslChange(e.target.value)}
            dir="rtl"
            lang="ar"
          >
            <option value="">اختر فصلاً</option>
            {fasls.map((fasl) => (
              <option key={fasl} value={fasl}>
                {fasl}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Reset button */}
      {(activeVolume || activeKitab || activeBab || activeFasl) && (
        <Button
          variant="ghost"
          onClick={handleReset}
          className="w-full text-sm"
        >
          إعادة تعيين
        </Button>
      )}
    </nav>
  );
}
