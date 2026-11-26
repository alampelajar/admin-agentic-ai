import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// shadcn/ui's native select: the browser's own <select> (so forms keep their onChange
// events and phones show their own picker), styled like Input and SelectTrigger.
// containerClassName sizes the whole control (for example "sm:w-48"); className styles the select.
function NativeSelect({ className, containerClassName, size = 'default', ...props }) {
    return (<div data-slot='native-select-wrapper' className={cn('group/native-select relative w-full has-[select:disabled]:opacity-50', containerClassName)}>
      <select data-slot='native-select' data-size={size} className={cn("h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent py-1 ps-3 pe-9 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 dark:bg-input/30 dark:hover:bg-input/50 [&>option]:bg-popover [&>option]:text-popover-foreground", 'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50', 'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40', className)} {...props}/>
      <ChevronDownIcon className='pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground select-none' aria-hidden='true'/>
    </div>);
}
function NativeSelectOption({ ...props }) {
    return <option data-slot='native-select-option' {...props}/>;
}
function NativeSelectOptGroup({ className, ...props }) {
    return <optgroup data-slot='native-select-optgroup' className={cn(className)} {...props}/>;
}
export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
