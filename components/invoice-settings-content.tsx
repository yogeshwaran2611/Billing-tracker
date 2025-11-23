"use client"

import { useState, useEffect } from "react"
import { ref, get, remove } from "firebase/database"
import { database } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useRouter } from "next/navigation"

interface Client {
  clientName: string
  product: string
  templates?: { tms?: boolean; rms?: boolean }
}

export function InvoiceSettingsContent() {
  const { toast } = useToast()
  const router = useRouter()
  const [clients, setClients] = useState<Record<string, Client>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoading(true)
    const clientsRef = ref(database, "clients")
    const snapshot = await get(clientsRef)
    if (snapshot.exists()) {
      setClients(snapshot.val())
    }
    setLoading(false)
  }

  const handleAddClient = () => {
    router.push("/settings/invoices/template/new")
  }

  const handleEditClient = (clientId: string) => {
    router.push(`/settings/invoices/template/${clientId}`)
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this client and all associated data?")) return

    try {
      // Delete client
      const clientRef = ref(database, `clients/${clientId}`)
      await remove(clientRef)

      // Delete billing data
      const billingRef = ref(database, `billingData/${clientId}`)
      await remove(billingRef)

      toast({
        title: "Success",
        description: "Client deleted successfully",
        className: "bg-green-50 border-green-200",
      })

      loadClients()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice Settings</h1>
        <Button onClick={handleAddClient}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(clients).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(clients).map(([clientId, client]) => (
                    <TableRow key={clientId}>
                      <TableCell className="font-medium">{client.clientName}</TableCell>
                      <TableCell>
                        {client.templates ? (
                          <div className="flex gap-2 flex-wrap">
                            {client.templates.tms && (
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                                TMS
                              </span>
                            )}
                            {client.templates.rms && (
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-cyan-100 text-cyan-800">
                                RMS
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-secondary text-foreground">
                            {client.product}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditClient(clientId)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(clientId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Toaster />
    </div>
  )
}
