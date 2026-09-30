import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DateStamp } from "@/components/common/DateStamp";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import { DIFFICULTY_BADGE_VARIANT, DIFFICULTY_LABEL_KEY } from "@/lib/questDisplay";
import type { QuestView } from "@/store/selectors";

export function QuestDetailDialog({
  view,
  onOpenChange,
}: {
  view: QuestView | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();

  return (
    <Dialog open={!!view} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {view && (
          <>
            <DialogHeader>
              <DialogTitle>{t2(view.quest.title)}</DialogTitle>
              <DialogDescription>{t2(view.quest.category)}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="gold">
                +{formatNumber(view.quest.xp, lang)} {t("common.xp")}
              </Badge>
              <Badge variant={DIFFICULTY_BADGE_VARIANT[view.quest.difficulty]}>
                {t(DIFFICULTY_LABEL_KEY[view.quest.difficulty])}
              </Badge>
              <Badge variant="secondary">
                {view.quest.cadence === "daily" ? t("quests.daily") : t("quests.epic")}
              </Badge>
            </div>

            {t2(view.quest.description) && (
              <p className="text-sm text-muted-foreground">{t2(view.quest.description)}</p>
            )}

            {view.quest.due && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                <DateStamp date={view.quest.due} inline />
              </span>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
