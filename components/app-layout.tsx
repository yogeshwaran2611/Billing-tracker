"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LayoutDashboard, Lock, LogOut, Users, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      allowedRoles: ["Admin", "Accounts", "Support", "Member"],
    },
    {
      name: "User Management",
      href: "/settings/users",
      icon: Users,
      allowedRoles: ["Admin"],
    },
    {
      name: "Invoice Settings",
      href: "/settings/invoices",
      icon: FileText,
      allowedRoles: ["Admin"],
    },
    {
      name: "Change Password",
      href: "/change-password",
      icon: Lock,
      allowedRoles: ["Admin", "Accounts", "Support", "Member"],
    },
  ]

  const filteredNavigation = navigation.filter((item) => (role ? item.allowedRoles.includes(role) : false))

  const NavLinks = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <nav className="flex flex-col gap-1">
      {filteredNavigation.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
              isActive
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md"
                : "text-slate-700 hover:bg-blue-50 hover:text-blue-600",
              isCollapsed && "justify-center px-2",
            )}
            title={isCollapsed ? item.name : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.name}</span>}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-300 relative", 
          collapsed ? "w-20" : "w-72",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Billing Tracker
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md mx-auto">
              <FileText className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* --- Collapse/Expand Button positioned in the middle --- */}
        <div 
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10"
        >
            <Button
              variant="default"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 p-0 rounded-full shadow-lg bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300" 
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
        </div>
        {/* -------------------------------------------------------- */}

        <div className="flex-1 px-3 py-6 overflow-y-auto">
          <NavLinks isCollapsed={collapsed} />
        </div>

        <div className="border-t border-slate-200 p-4">
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3 px-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-white">{user?.email?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-900">{user?.email}</p>
                <p className="text-xs text-blue-600 font-medium">{role}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-sm mx-auto mb-3">
              <span className="text-sm font-bold text-white">{user?.email?.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start border-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600",
              collapsed && "justify-center px-2",
            )}
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      {/* FIX: Added min-w-0 to prevent content from pushing the container horizontally */}
      <div className="flex-1 flex flex-col min-w-0"> 
        <header className="h-16 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between px-4 md:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">Billing Tracker</span>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-blue-50">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex h-16 items-center border-b border-slate-200 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg">Billing Tracker</span>
                </div>
              </div>

              <div className="flex-1 px-4 py-6">
                <NavLinks />
              </div>

              <div className="border-t border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-3 px-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-white">{user?.email?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.email}</p>
                    <p className="text-xs text-blue-600 font-medium">{role}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full justify-start border-2 bg-transparent" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        {/* Changed to overflow-y-auto to explicitly handle vertical scroll, but rely on inner components for horizontal */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}