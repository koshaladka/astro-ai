"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type User = { email: string; name?: string };

// Шапка с информацией о пользователе и выходом
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function logout() {
    setMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="site-header">
      <Link href="/" className="logo">
        ASTRO AI
      </Link>
      <div className="header-actions">
        {user ? (
          <div className="user-menu" ref={menuRef}>
            <button
              type="button"
              className="user-menu-trigger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              {user.name || user.email}
            </button>
            {menuOpen && (
              <ul className="user-menu-dropdown" role="menu">
                <li role="none">
                  <Link
                    href="/profile"
                    className="user-menu-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Профиль
                  </Link>
                </li>
                <li role="none">
                  <button
                    type="button"
                    className="user-menu-item"
                    role="menuitem"
                    onClick={logout}
                  >
                    Выйти
                  </button>
                </li>
              </ul>
            )}
          </div>
        ) : (
          <>
            <Link href="/login" className="btn-ghost">
              Войти
            </Link>
            <Link href="/register" className="btn-ghost">
              Регистрация
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
