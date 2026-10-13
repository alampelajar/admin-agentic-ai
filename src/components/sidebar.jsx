
import { NavLink } from "react-router-dom"

const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: "dashboard",
  },
  {
    name: "Users",
    path: "/users",
    icon: "users",
  },
  {
    name: "Agents",
    path: "/agents",
    icon: "agents",
  },
  {
    name: "Models",
    path: "/models",
    icon: "models",
  },
  {
    name: "Tasks",
    path: "/tasks",
    icon: "tasks",
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: "analytics",
  },
  {
    name: "Logs",
    path: "/logs",
    icon: "logs",
  },
  {
    name: "Settings",
    path: "/settings",
    icon: "settings",
  },
]

function BrandLogo() {
  return (
    <div
      className="
        flex h-10 w-10 shrink-0
        items-center justify-center
        rounded-xl border border-blue-200/80
        bg-blue-50
        transition-colors
        duration-200
        dark:border-blue-900
        dark:bg-blue-950/60
      "
    >
      <svg
        viewBox="0 0 40 40"
        width="28"
        height="28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Agentic AI logo"
      >
        <path
          d="M11 11L20 20L29 11M20 20L11 29M20 20L29 29"
          stroke="#3157D5"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <rect
          x="15.5"
          y="15.5"
          width="9"
          height="9"
          rx="2.5"
          fill="#3157D5"
        />

        <circle
          cx="11"
          cy="11"
          r="4"
          fill="#3157D5"
        />

        <circle
          cx="29"
          cy="11"
          r="4"
          fill="#06B6D4"
        />

        <circle
          cx="11"
          cy="29"
          r="4"
          fill="#06B6D4"
        />

        <circle
          cx="29"
          cy="29"
          r="4"
          fill="#3157D5"
        />
      </svg>
    </div>
  )
}

function MenuIcon({ name, active }) {
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  }

  const iconPaths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    agents: (
      <>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="4" r="1.5" />
        <circle cx="5" cy="17" r="1.5" />
        <circle cx="19" cy="17" r="1.5" />
        <path d="M12 5.5v3.7M10 14.2l-4 2M14 14.2l4 2" />
      </>
    ),
    models: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </>
    ),    tasks: (
      <>
        <rect x="4" y="4" width="16" height="17" rx="2" />
        <path d="M9 4V2.5h6V4M8 11l2.5 2.5L16 8.8M8 17h8" />
      </>
    ),
    analytics: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 3 3 6-7" />
        <path d="M16 6h4v4" />
      </>
    ),
    logs: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <circle cx="4" cy="6" r=".7" fill="currentColor" />
        <circle cx="4" cy="12" r=".7" fill="currentColor" />
        <circle cx="4" cy="18" r=".7" fill="currentColor" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-2 .9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-2-.9l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 2-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 2 .9l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z" transform="translate(-1 -1) scale(1.08)" />
      </>
    ),
  }

  return (
    <svg {...commonProps}>
      {iconPaths[name]}
    </svg>
  )
}

function Sidebar() {
  return (
    <aside
      className="
        fixed left-0 top-0 z-40
        flex h-screen w-60 flex-col
        border-r border-slate-200
        bg-white
        transition-colors duration-200
        dark:border-slate-800
        dark:bg-slate-950
      "
    >
      {/* BRAND */}

      <div
        className="
          border-b border-slate-200
          px-5 py-5
          dark:border-slate-800
        "
      >
        <div className="flex items-center gap-3">
          <BrandLogo />

          <div className="min-w-0">
            <h1
              className="
                text-sm font-semibold tracking-tight
                text-slate-900
                dark:text-white
              "
            >
              Agentic AI
            </h1>

            <p
              className="
                mt-1 text-[9px] font-semibold
                uppercase tracking-[0.16em]
                text-slate-500
                dark:text-slate-400
              "
            >
              Admin Console
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}

      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto px-3 py-5"
      >
        <p
          className="
            mb-3 px-2
            text-[10px] font-semibold
            uppercase tracking-[0.14em]
            text-slate-400
            dark:text-slate-500
          "
        >
          Workspace
        </p>

        <div className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                [
                  "group relative flex h-10 items-center gap-3 rounded-lg px-3",
                  "text-[13px] font-medium transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  isActive
                    ? [
                        "bg-indigo-50 text-indigo-700",
                        "dark:bg-indigo-500/10 dark:text-indigo-300",
                        "after:absolute after:bottom-2 after:left-0 after:top-2",
                        "after:w-[3px] after:rounded-r-full after:bg-indigo-600",
                      ].join(" ")
                    : [
                        "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        "dark:text-slate-400 dark:hover:bg-slate-900",
                        "dark:hover:text-white",
                      ].join(" "),
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      "flex shrink-0 items-center justify-center",
                      "transition-colors",
                      isActive
                        ? "text-indigo-600 dark:text-indigo-300"
                        : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300",
                    ].join(" ")}
                  >
                    <MenuIcon
                      name={item.icon}
                      active={isActive}
                    />
                  </span>

                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ADMIN PROFILE */}

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="
              flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-full border border-slate-200
              bg-slate-50
              text-xs font-semibold text-slate-700
              dark:border-slate-700
              dark:bg-slate-800
              dark:text-slate-200
            "
            aria-hidden="true"
          >
            A
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="
                truncate text-xs font-semibold
                text-slate-900
                dark:text-white
              "
            >
              Admin
            </p>

            <p
              className="
                mt-0.5 truncate text-[10px]
                text-slate-500
                dark:text-slate-400
              "
            >
              Workspace administrator
            </p>
          </div>

          <span
            className="text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          >
            ···
          </span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar