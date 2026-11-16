import { cn } from "../../lib/utils.js"

// Material 3 has no table; this one uses 52px rows and outline-variant dividers.
export function Table({ className, ...props }) { return <div className="relative w-full overflow-auto"><table className={cn("w-full caption-bottom text-sm", className)} {...props} /></div> }
export function TableHeader({ className, ...props }) { return <thead className={cn("[&_tr]:border-b", className)} {...props} /> }
export function TableBody({ className, ...props }) { return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} /> }
export function TableFooter({ className, ...props }) { return <tfoot className={cn("border-t bg-muted font-medium [&>tr]:last:border-b-0", className)} {...props} /> }
export function TableRow({ className, ...props }) { return <tr className={cn("h-13 border-b border-border transition-colors duration-200 ease-m3 hover:bg-accent data-[state=selected]:bg-secondary", className)} {...props} /> }
export function TableHead({ className, ...props }) { return <th className={cn("h-14 px-4 text-left align-middle text-sm font-medium text-foreground [&:has([role=checkbox])]:pr-0", className)} {...props} /> }
export function TableCell({ className, ...props }) { return <td className={cn("px-4 py-2 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} /> }
export function TableCaption({ className, ...props }) { return <caption className={cn("mt-4 text-xs text-muted-foreground", className)} {...props} /> }
