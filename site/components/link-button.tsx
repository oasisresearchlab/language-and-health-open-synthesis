import Link, { type LinkProps } from "next/link";
import { type VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variants = VariantProps<typeof buttonVariants>;

export interface LinkButtonProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    Pick<LinkProps, "href" | "prefetch" | "replace" | "scroll">,
    Variants {}

/** Next/Link styled as a Button. Sidesteps Base UI's lack of `asChild`. */
export function LinkButton({
  className,
  variant,
  size,
  href,
  prefetch,
  replace,
  scroll,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
    />
  );
}
