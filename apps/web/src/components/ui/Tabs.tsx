import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-0.5 border-b border-border w-full',
      'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-r data-[orientation=vertical]:border-border data-[orientation=vertical]:min-w-[200px] data-[orientation=vertical]:w-48 data-[orientation=vertical]:h-full data-[orientation=vertical]:justify-start data-[orientation=vertical]:gap-0.5',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium text-text-muted transition-colors',
      'border-b-2 border-transparent -mb-px',
      'hover:text-text-primary hover:bg-bg-hover rounded-md',
      'data-[state=active]:border-accent data-[state=active]:text-text-primary data-[state=active]:bg-accent-muted/30',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[orientation=vertical]:w-full data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-l-2 data-[orientation=vertical]:-mb-0 data-[orientation=vertical]:-ml-px data-[orientation=vertical]:justify-start data-[orientation=vertical]:px-3 data-[orientation=vertical]:py-2 data-[orientation=vertical]:rounded-none data-[orientation=vertical]:data-[state=active]:bg-accent-muted/30',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 focus-visible:outline-none', className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
