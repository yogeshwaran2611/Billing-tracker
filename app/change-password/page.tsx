"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { ChangePasswordContent } from "@/components/change-password-content"

export default function ChangePasswordPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ChangePasswordContent />
      </AppLayout>
    </ProtectedRoute>
  )
}
