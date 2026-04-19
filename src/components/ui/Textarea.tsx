import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full min-h-24 p-3 rounded-md border border-border bg-background text-sm',
      'placeholder:text-subtle leading-relaxed resize-y',
      'focus:border-brand focus:ring-0 outline-none',
      'disabled:bg-muted disabled:cursor-not-allowed',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
