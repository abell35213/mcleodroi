import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link>;

export function ButtonLink({ className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-[#d89b2b] px-5 py-3 text-sm font-semibold text-[#0b1d33] shadow-sm transition hover:bg-[#c88c20] focus:outline-none focus:ring-2 focus:ring-[#d89b2b] focus:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}
