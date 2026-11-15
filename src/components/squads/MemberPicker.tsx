import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import type { SquadPerson } from "@/api/squadApi";

/** Searchable checklist of people who can be invited/added (the server already excludes anyone in a squad). */
export function MemberPicker({
  people,
  selected,
  onChange,
  max,
}: {
  people: SquadPerson[];
  selected: string[];
  onChange: (ids: string[]) => void;
  max: number;
}) {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? people.filter((p) => [p.name.en, p.name.ar, p.department.en, p.department.ar].some((s) => s.toLowerCase().includes(q)))
      : people;
  }, [people, query]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : selected.length < max ? [...selected, id] : selected);

  return (
    <div className="space-y-2">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("squads.searchPeople")} />
      <p className="text-xs text-muted-foreground">{t("squads.selectedCount", { n: selected.length, max })}</p>
      <ul className="max-h-60 divide-y overflow-y-auto rounded-md border">
        {shown.length === 0 && <li className="p-3 text-xs text-muted-foreground">{t("squads.noCandidates")}</li>}
        {shown.map((p) => {
          const on = selected.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className={cn("flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-secondary", on && "bg-primary/[0.06]")}
                aria-pressed={on}
              >
                <input type="checkbox" readOnly checked={on} tabIndex={-1} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                <PersonAvatar person={p} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t2(p.name)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t2(p.department)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
