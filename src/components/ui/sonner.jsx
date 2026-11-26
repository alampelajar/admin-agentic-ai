import { useEffect, useState } from 'react';
import { Toaster as Sonner } from 'sonner';

// Follows the console's light or dark mode, which the header switches with a class on <html>.
function useHtmlTheme() {
    const read = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    const [theme, setTheme] = useState(read);
    useEffect(() => {
        const observer = new MutationObserver(() => setTheme(read()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return theme;
}

export function Toaster({ ...props }) {
    const theme = useHtmlTheme();
    return (<Sonner theme={theme} className='toaster group [&_div[data-content]]:w-full' style={{
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
        }} {...props}/>);
}
