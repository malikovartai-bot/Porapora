import Link from "next/link";

type Role = "OWNER" | "MANAGER" | "TECH" | "ACTOR";

export function Nav({ role }: { role: Role }) {
  const common = [
    { href: "/", label: "Главная" },
    { href: "/events", label: "События" },
    { href: "/calendar", label: "Календарь" },
    { href: "/files", label: "Файлы" },
    { href: "/dds", label: "ДДС" },
  ];

  const admin = [
    { href: "/plays", label: "Спектакли" },
    { href: "/venues", label: "Площадки" },
    { href: "/people", label: "Люди" },
  ];

  const isAdmin = role === "OWNER" || role === "MANAGER";

  const items = isAdmin ? [...common, ...admin] : common;

  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
