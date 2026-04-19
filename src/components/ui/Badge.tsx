import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-tight',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground',
        brand: 'bg-brand-subtle text-[color:var(--brand-700)]',
        success: 'bg-[color:#dcfce7] text-[color:#047857]',
        warning: 'bg-[color:#fef3c7] text-[color:#92400e]',
        danger: 'bg-[color:#fee2e2] text-[color:#991b1b]',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
