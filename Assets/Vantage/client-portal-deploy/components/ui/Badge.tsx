import { clsx } from "clsx";

type BadgeVariant = "completed" | "in_progress" | "locked" | "pending" | "paid" | "tier1" | "tier2" | "tier3";

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  completed: "bg-[#E6F0E6] text-[#2D5C2D]",
  in_progress: "bg-[#FFF8E6] text-[#7A5500]",
  locked: "bg-[#F0EDE8] text-[#6B7FA3]",
  pending: "bg-[#F0EDE8] text-[#6B7FA3]",
  paid: "bg-[#E6F0E6] text-[#2D5C2D]",
  tier1: "bg-cream-200 text-muted",
  tier2: "bg-[#FFF8E6] text-[#7A5500]",
  tier3: "bg-navy text-cream-100",
};

const defaultLabels: Record<BadgeVariant, string> = {
  completed: "✅ Completed",
  in_progress: "⏳ In Progress",
  locked: "🔒 Locked",
  pending: "Pending",
  paid: "✅ Paid",
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
};

export default function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-block px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest",
        variantClasses[variant],
        className
      )}
    >
      {children ?? defaultLabels[variant]}
    </span>
  );
}
