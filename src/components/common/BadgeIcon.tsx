import {
  Award,
  BookOpen,
  Building2,
  Compass,
  Flag,
  Flame,
  GraduationCap,
  HeartHandshake,
  Library,
  Lightbulb,
  Microscope,
  Rocket,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Award,
  BookOpen,
  Building2,
  Compass,
  Flag,
  Flame,
  GraduationCap,
  HeartHandshake,
  Library,
  Lightbulb,
  Microscope,
  Rocket,
  Sparkles,
  Users,
};

export function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Award;
  return <Icon className={className} aria-hidden />;
}
