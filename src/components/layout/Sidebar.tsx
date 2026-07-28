import { NavLink } from "react-router-dom";

import { Logo } from "@/components/ui/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import { CONNECTION_LABEL, CONNECTION_TONE, connectionState } from "@/lib/connection";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useServerStatusStore } from "@/stores/serverStatusStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { NAV_GROUPS, NAV_PLANNED } from "@/types/tab";

/** Navigation on the canvas, with only the current page raised out of it. */
export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const settings = useSettingsStore((s) => s.settings);
  const status = useServerStatusStore((s) => s.status);
  const eventsubConnected = useServerStatusStore((s) => s.eventsubConnected);

  const state = connectionState({
    clientId: settings?.clientId ?? "",
    signedIn: Boolean(user),
    eventsubConnected,
    overlayClients: status?.overlayClients ?? 0,
  });

  return (
    <aside className="flex w-[228px] shrink-0 flex-col border-r border-line">
      <div data-tauri-drag-region className="flex h-11 shrink-0 items-center gap-2 px-4 select-none">
        <Logo size={22} />
        <span className="text-body font-semibold tracking-tight text-ink">Hibiki</span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 pt-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="label mb-1.5 px-2 text-ink-3">{group.label}</p>

            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex h-8 items-center gap-2.5 rounded-md px-2 text-body transition-colors duration-100",
                      isActive
                        ? "border border-line bg-surface font-medium text-ink shadow-raise"
                        : "border border-transparent text-ink-2 hover:bg-fill hover:text-ink",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn("size-4 shrink-0", isActive ? "text-accent" : "text-ink-3")} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}

              {/* Announced but unbuilt, so the navigation keeps its shape when
                  they land. */}
              {group.label === "Stream" &&
                NAV_PLANNED.map((item) => (
                  <div
                    key={item.label}
                    title="Not built yet"
                    className="flex h-8 cursor-not-allowed items-center gap-2.5 rounded-md px-2 text-body text-ink-3"
                  >
                    <item.icon className="size-4 shrink-0 opacity-60" />
                    {item.label}
                    <span className="label ml-auto text-ink-3 opacity-70">Soon</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        {settings ? (
          user ? (
            <div className="flex items-center gap-2.5 px-1">
              <img src={user.profileImageUrl} alt="" className="size-6 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body leading-tight text-ink">{user.displayName}</p>
                <p className="mt-0.5 flex items-center gap-1.5">
                  <StatusDot tone={CONNECTION_TONE[state]} />
                  <span className="text-sm text-ink-3">{CONNECTION_LABEL[state]}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 px-1 py-1">
              <StatusDot tone={CONNECTION_TONE[state]} />
              <span className="text-sm text-ink-3">{CONNECTION_LABEL[state]}</span>
            </p>
          )
        ) : (
          // A skeleton rather than nothing, so the footer does not move once
          // settings land.
          <div className="flex items-center gap-2.5 px-1">
            <Skeleton className="size-6 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-2 w-14" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
