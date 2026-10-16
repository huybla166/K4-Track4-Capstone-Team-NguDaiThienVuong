import Link from "next/link";

interface AppHeaderProps {
  page: string;
  connected: boolean;
  links: { href: string; label: string }[];
}

export function AppHeader({ page, connected, links }: AppHeaderProps) {
  return (
    <header className="app-header">
      <h1 className="app-title">
        <span>DriverGuard</span>
        <span className="app-title-page">{page}</span>
      </h1>
      <nav className="app-nav" aria-label="Chuyển màn hình">
        <span className="app-status" role="status">
          <span className={`status-square ${connected ? "is-ok" : ""}`} aria-hidden="true" />
          {connected ? "Đã kết nối" : "Mất kết nối"}
        </span>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="app-link">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
