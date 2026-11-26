import { cn } from '@/lib/utils';
// as="span" lets a skeleton stand in for text inside a <p>.
function Skeleton({ className, as: Component = 'div', ...props }) {
    return (<Component data-slot='skeleton' className={cn('animate-pulse rounded-md bg-accent', className)} {...props}/>);
}
export { Skeleton };
