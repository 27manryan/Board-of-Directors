"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  clientName?: string;
  projectName?: string;
}

const navLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/deliverables",
    label: "Deliverables",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2h12v12H2V2z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      </svg>
    ),
  },
  {
    href: "/payment",
    label: "Payments",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="4" width="14" height="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      </svg>
    ),
  },
];

export default function Sidebar({ clientName = "Client Name", projectName = "Project Name" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-navy border-r border-navy-dark flex-shrink-0">
        {/* Wordmark */}
        <div className="px-6 pt-8 pb-6 border-b border-navy-light/30">
          <Link href="/dashboard">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-gold mb-1">
                Client Portal
              </p>
              <p className="font-serif text-xl font-semibold text-cream-100 leading-tight">
                Vantage Strategic<br />Communications
              </p>
            </div>
          </Link>
        </div>

        {/* Client context */}
        <div className="px-6 py-5 border-b border-navy-light/30">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted mb-1">
            Client
          </p>
          <p className="text-sm font-medium text-cream-100 truncate">{clientName}</p>
          <p className="text-xs text-muted mt-1 truncate">{projectName}</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-0.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium uppercase tracking-widest transition-colors duration-100 ${
                      isActive
                        ? "bg-gold text-navy"
                        : "text-cream-300/70 hover:text-cream-100 hover:bg-navy-light/40"
                    }`}
                  >
                    <span className={isActive ? "text-navy" : "text-current opacity-60"}>
                      {link.icon}
                    </span>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sign out */}
        <div className="px-6 py-5 border-t border-navy-light/30">
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-[10px] font-medium uppercase tracking-widest text-muted hover:text-gold transition-colors duration-100"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Top Nav */}
      <header className="md:hidden bg-navy border-b border-navy-light/30 px-4 py-4 flex items-center justify-between">
        <div>
          <p className="font-serif text-lg font-semibold text-cream-100">Vantage</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-gold">
            Client Portal
          </p>
        </div>
        <nav className="flex items-center gap-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[10px] font-medium uppercase tracking-widest transition-colors duration-100 ${
                  isActive ? "text-gold" : "text-cream-300/60 hover:text-cream-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-[10px] font-medium uppercase tracking-widest text-cream-300/40 hover:text-gold transition-colors duration-100"
            >
              Out
            </button>
          </form>
        </nav>
      </header>
    </>
  );
}
