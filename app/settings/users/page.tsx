"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { UserManagementContent } from "@/components/user-management-content"

export default function UserManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin"]}>
      <AppLayout>
        <UserManagementContent />
      </AppLayout>
    </ProtectedRoute>
  )
}
