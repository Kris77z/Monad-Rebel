import './terminal.css';

/**
 * Dashboard Layout — Terminal Theme wrapper
 * Applies dark terminal visuals + CRT overlay effects
 */
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="terminal-theme bg-background text-foreground min-h-screen">
            {children}
        </div>
    );
}
