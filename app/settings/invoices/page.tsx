"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { InvoiceSettingsContent } from "@/components/invoice-settings-content"

export default function InvoiceSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin"]}>
      <AppLayout>
        <InvoiceSettingsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}
