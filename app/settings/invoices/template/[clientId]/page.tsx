// app/settings/invoices/template/[clientId]/page.tsx

import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { TemplateBuilder } from "@/components/template-builder"

interface TemplateBuilderPageProps {
  params: Promise<{
    clientId: string
  }>
}

export default async function TemplateBuilderPage({ params }: TemplateBuilderPageProps) {
  const { clientId } = await params

  return (
    <ProtectedRoute allowedRoles={["Admin"]}>
      <AppLayout>
        <TemplateBuilder clientId={clientId} />
      </AppLayout>
    </ProtectedRoute>
  )
}
