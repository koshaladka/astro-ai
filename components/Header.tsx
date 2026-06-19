"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = { email: string; name?: string };

// Шапка с информацией о пользователе и выходом
export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="site-header">
      <Link href="/" className="logo">
        Astro
      </Link>
      <div className="header-actions">
        {user ? (
          <>
            <Link href="/profile" className="btn-ghost">
              Профиль
            </Link>
            <span className="user-email">{user.name || user.email}</span>
            <button type="button" className="btn-ghost" onClick={logout}>
              Выйти
            </button>
          </>
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
