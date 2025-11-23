"use client"

import { useState, useEffect } from "react"
import { ref, get, set } from "firebase/database"
import { database } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Save, ArrowLeft, Loader2, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useRouter } from "next/navigation"

interface Field {
  name: string
  type: string
  values?: string[]
  index: number
  permissions: {
    accounts: boolean
    support: boolean
  }
}

// Function to define mandatory fields (extracted for clarity)
const getMandatoryFields = (): Record<string, Field> => ({
  f1: {
    name: "Month",
    type: "month",
    index: 1,
    permissions: { accounts: true, support: false },
  },
  f2: {
    name: "Invoice Status",
    type: "dropdown",
    values: ["Pending", "Sent", "Overdue"],
    index: 2,
    permissions: { accounts: true, support: true },
  },
  f3: {
    name: "Payment Status",
    type: "dropdown",
    values: ["Paid", "Unpaid", "Partially Paid"],
    index: 3,
    permissions: { accounts: true, support: false },
  },
})

export function TemplateBuilder({ clientId }: { clientId: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const isNew = clientId === "new"

  const [clientName, setClientName] = useState("")
  // Initialize with TMS for new clients, as per your original code's initial state
  const [products, setProducts] = useState<("TMS" | "RMS")[]>(["TMS"])
  const [tmsFields, setTmsFields] = useState<Record<string, Field>>({})
  const [rmsFields, setRmsFields] = useState<Record<string, Field>>({})
  const [activeTab, setActiveTab] = useState<"TMS" | "RMS">("TMS")
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null)

  const [newField, setNewField] = useState({
    name: "",
    type: "string",
    values: "",
    accountsPermission: false,
    supportPermission: false,
  })

  useEffect(() => {
    console.log("[v0] Template builder mounted with clientId:", clientId, "isNew:", isNew)

    if (!isNew) {
      loadClient()
    } else {
      // Initialize with mandatory fields for a new client
      setTmsFields(getMandatoryFields())
      setRmsFields(getMandatoryFields())
    }
  }, [isNew, clientId])

  /**
   * Loads client data, merging existing fields with mandatory fields.
   */
  const loadClient = async () => {
    console.log("[v0] Loading client with ID:", clientId)
    setLoading(true)

    try {
      const clientRef = ref(database, `clients/${clientId}`)
      const snapshot = await get(clientRef)

      console.log("[v0] Snapshot exists:", snapshot.exists())

      // Get mandatory fields
      const mandatoryFields = getMandatoryFields()

      if (snapshot.exists()) {
        const data = snapshot.val()
        console.log("[v0] Loaded client data:", data)
        setClientName(data.clientName || "") // Load Client Name

        const prods: ("TMS" | "RMS")[] = []
        let tmsLoadedFields = {}
        let rmsLoadedFields = {}

        if (data.templates) {
          if (data.templates.tms) {
            prods.push("TMS")
            // Merge: Mandatory fields first, then overwrite with saved fields
            tmsLoadedFields = { ...mandatoryFields, ...(data.templates.tms.fields || {}) }
          }
          if (data.templates.rms) {
            prods.push("RMS")
            // Merge: Mandatory fields first, then overwrite with saved fields
            rmsLoadedFields = { ...mandatoryFields, ...(data.templates.rms.fields || {}) }
          }
        } else if (data.template) {
          // Handle legacy/single product format, also merge
          const product = data.product || "TMS"
          prods.push(product)
          if (product === "TMS") {
            tmsLoadedFields = { ...mandatoryFields, ...(data.template.fields || {}) }
          } else {
            rmsLoadedFields = { ...mandatoryFields, ...(data.template.fields || {}) }
          }
        }

        setProducts(prods.length > 0 ? prods : ["TMS"]) // Ensure at least one product is selected
        setTmsFields(tmsLoadedFields)
        setRmsFields(rmsLoadedFields)

        // Set active tab to the first product loaded
        if (prods.length > 0) {
          setActiveTab(prods[0])
        }
      } else {
        // If client ID is invalid but is not "new", redirect
        console.log("[v0] Client not found, redirecting")
        router.push("/settings/invoices")
        toast({
          title: "Error",
          description: "Client not found.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error loading client:", error)
      toast({
        title: "Error",
        description: "Failed to load client data.",
        variant: "destructive",
      })
      router.push("/settings/invoices")
    } finally {
      setLoading(false)
    }
  }

  const getCurrentFields = () => (activeTab === "TMS" ? tmsFields : rmsFields)
  const setCurrentFields = (fields: Record<string, Field>) => {
    if (activeTab === "TMS") {
      setTmsFields(fields)
    } else {
      setRmsFields(fields)
    }
  }

  const handleAddField = () => {
    if (!newField.name) {
      toast({
        title: "Error",
        description: "Field name is required",
        variant: "destructive",
      })
      return
    }

    const currentFields = getCurrentFields()
    const existingFieldNumbers = Object.keys(currentFields)
      .filter((key) => key.startsWith("f"))
      .map((key) => Number.parseInt(key.substring(1)))
      .filter((num) => !isNaN(num))

    const maxFieldNumber = existingFieldNumbers.length > 0 ? Math.max(...existingFieldNumbers) : 0
    const fieldId = `f${maxFieldNumber + 1}`

    const maxIndex = Math.max(...Object.values(currentFields).map((f) => f.index), 0)

    setCurrentFields({
      ...currentFields,
      [fieldId]: {
        name: newField.name,
        type: newField.type,
        ...(newField.type === "dropdown" && { values: newField.values.split(",").map((v) => v.trim()) }),
        index: maxIndex + 1,
        permissions: {
          accounts: newField.accountsPermission,
          support: newField.supportPermission,
        },
      },
    })

    setNewField({
      name: "",
      type: "string",
      values: "",
      accountsPermission: false,
      supportPermission: false,
    })
    setDialogOpen(false)

    toast({
      title: "Field Added",
      description: `Field added to ${activeTab} template successfully`,
      className: "bg-green-50 border-green-200",
    })
  }

  const handleEditField = (fieldId: string) => {
    const currentFields = getCurrentFields()
    const field = currentFields[fieldId]

    setEditingFieldId(fieldId)
    setNewField({
      name: field.name,
      type: field.type,
      values: field.values?.join(", ") || "",
      accountsPermission: field.permissions.accounts,
      supportPermission: field.permissions.support,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEditedField = () => {
    if (!editingFieldId || !newField.name) {
      toast({
        title: "Error",
        description: "Field name is required",
        variant: "destructive",
      })
      return
    }

    const currentFields = getCurrentFields()
    const existingField = currentFields[editingFieldId]

    setCurrentFields({
      ...currentFields,
      [editingFieldId]: {
        ...existingField, // Keep original index
        name: newField.name,
        type: newField.type,
        ...(newField.type === "dropdown" && { values: newField.values.split(",").map((v) => v.trim()) }),
        permissions: {
          accounts: newField.accountsPermission,
          support: newField.supportPermission,
        },
      },
    })

    setNewField({
      name: "",
      type: "string",
      values: "",
      accountsPermission: false,
      supportPermission: false,
    })
    setEditingFieldId(null)
    setEditDialogOpen(false)

    toast({
      title: "Field Updated",
      description: "Field updated successfully",
      className: "bg-green-50 border-green-200",
    })
  }

  const handleDeleteField = (fieldId: string) => {
    const isMandatory = Object.keys(getMandatoryFields()).includes(fieldId)
    if (isMandatory) {
      toast({
        title: "Error",
        description: "Mandatory fields cannot be deleted.",
        variant: "destructive",
      })
      setDeleteFieldId(null)
      return
    }

    const currentFields = getCurrentFields()
    const newFields = { ...currentFields }
    delete newFields[fieldId]
    setCurrentFields(newFields)

    toast({
      title: "Field Deleted",
      description: "Field deleted successfully",
      className: "bg-green-50 border-green-200",
    })

    setDeleteFieldId(null)
  }

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const sortedEntries = Object.entries(getCurrentFields()).sort(([, a], [, b]) => a.index - b.index)
    const currentIndex = sortedEntries.findIndex(([id]) => id === fieldId)

    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === sortedEntries.length - 1)
    ) {
      return
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    const [currentId, currentField] = sortedEntries[currentIndex]
    const [swapId, swapField] = sortedEntries[swapIndex]

    const currentFields = getCurrentFields()
    setCurrentFields({
      ...currentFields,
      [currentId]: { ...currentField, index: swapField.index },
      [swapId]: { ...swapField, index: currentField.index },
    })
  }

  const handleSave = async () => {
    if (!clientName.trim()) {
      toast({
        title: "Error",
        description: "Client name is required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const newClientId = isNew ? `client_${Date.now()}` : clientId
      const clientRef = ref(database, `clients/${newClientId}`)

      const templates: any = {}
      if (products.includes("TMS")) {
        templates.tms = { fields: tmsFields }
      }
      if (products.includes("RMS")) {
        templates.rms = { fields: rmsFields }
      }

      await set(clientRef, {
        clientName,
        templates,
      })

      toast({
        title: "Success",
        description: "Template(s) saved successfully",
        className: "bg-green-50 border-green-200",
      })

      router.push("/settings/invoices")
    } catch (error) {
      console.error("[v0] Error saving template:", error)
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const sortedFields = Object.entries(getCurrentFields()).sort(([, a], [, b]) => a.index - b.index)

  const toggleProduct = (product: "TMS" | "RMS") => {
    if (products.includes(product)) {
      if (products.length > 1) {
        setProducts(products.filter((p) => p !== product))
      } else {
        toast({
          title: "Error",
          description: "At least one product must be selected",
          variant: "destructive",
        })
      }
    } else {
      setProducts([...products, product])
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/settings/invoices")}
          className="hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {isNew ? "Create Template" : "Edit Template"}
          </h1>
          <p className="text-slate-600 mt-1">Configure invoice templates for your client</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-slate-600">Loading template...</p>
        </div>
      ) : (
        <>
          <Card className="border-2 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2">
              <CardTitle className="text-slate-900">Client Information</CardTitle>
              <CardDescription>Basic details about the client</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Client Name *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                  className="h-11 border-2 focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Products *</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tms"
                      checked={products.includes("TMS")}
                      onCheckedChange={() => toggleProduct("TMS")}
                    />
                    <label htmlFor="tms" className="text-sm font-medium cursor-pointer">
                      TMS (Transport Management System)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rms"
                      checked={products.includes("RMS")}
                      onCheckedChange={() => toggleProduct("RMS")}
                    />
                    <label htmlFor="rms" className="text-sm font-medium cursor-pointer">
                      RMS (Resource Management System)
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900">Template Fields</CardTitle>
                  <CardDescription>Configure fields for each product template</CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-md"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Custom Field to {activeTab}</DialogTitle>
                      <DialogDescription>Add a new field to the {activeTab} template</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Field Name *</Label>
                        <Input
                          value={newField.name}
                          onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                          placeholder="Enter field name"
                          className="h-11 border-2 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Field Type *</Label>
                        <Select
                          value={newField.type}
                          onValueChange={(value) => setNewField({ ...newField, type: value })}
                        >
                          <SelectTrigger className="h-11 border-2 focus:border-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="dropdown">Dropdown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newField.type === "dropdown" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Dropdown Values *</Label>
                          <Input
                            value={newField.values}
                            onChange={(e) => setNewField({ ...newField, values: e.target.value })}
                            placeholder="Option 1, Option 2, Option 3"
                            className="h-11 border-2 focus:border-blue-500"
                          />
                          <p className="text-xs text-slate-500">Separate values with commas</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Edit Permissions</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="accounts"
                              checked={newField.accountsPermission}
                              onCheckedChange={(checked) =>
                                setNewField({ ...newField, accountsPermission: checked as boolean })
                              }
                            />
                            <label htmlFor="accounts" className="text-sm cursor-pointer">
                              Accounts role can edit this field
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="support"
                              checked={newField.supportPermission}
                              onCheckedChange={(checked) =>
                                setNewField({ ...newField, supportPermission: checked as boolean })
                              }
                            />
                            <label htmlFor="support" className="text-sm cursor-pointer">
                              Support role can edit this field
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-2">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddField}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        Add Field
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "TMS" | "RMS")}>
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                  {products.includes("TMS") && (
                    <TabsTrigger
                      value="TMS"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
                    >
                      TMS Template
                    </TabsTrigger>
                  )}
                  {products.includes("RMS") && (
                    <TabsTrigger
                      value="RMS"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
                    >
                      RMS Template
                    </TabsTrigger>
                  )}
                </TabsList>

                {products.map((product) => (
                  <TabsContent key={product} value={product} className="mt-0">
                    <div className="rounded-lg border-2 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="border-b-2">
                            <TableHead className="w-20 font-bold text-slate-700">Order</TableHead>
                            <TableHead className="font-bold text-slate-700">Field Name</TableHead>
                            <TableHead className="font-bold text-slate-700">Type</TableHead>
                            <TableHead className="font-bold text-slate-700">Accounts</TableHead>
                            <TableHead className="font-bold text-slate-700">Support</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedFields.map(([fieldId, field], index) => {
                            // Check if field is mandatory for display purposes
                            const isMandatory = Object.keys(getMandatoryFields()).includes(fieldId)

                            return (
                              <TableRow key={fieldId} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 hover:bg-blue-100"
                                      onClick={() => moveField(fieldId, "up")}
                                      disabled={index === 0}
                                    >
                                      ↑
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 hover:bg-blue-100"
                                      onClick={() => moveField(fieldId, "down")}
                                      disabled={index === sortedFields.length - 1}
                                    >
                                      ↓
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {field.name}
                                  {isMandatory && (
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                      Required
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium bg-cyan-100 text-cyan-700">
                                    {field.type}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={
                                      field.permissions.accounts ? "text-green-600 font-bold" : "text-slate-400"
                                    }
                                  >
                                    {field.permissions.accounts ? "✓" : "—"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={
                                      field.permissions.support ? "text-green-600 font-bold" : "text-slate-400"
                                    }
                                  >
                                    {field.permissions.support ? "✓" : "—"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-blue-100"
                                      onClick={() => handleEditField(fieldId)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                      onClick={() => setDeleteFieldId(fieldId)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.push("/settings/invoices")} className="h-11 border-2 px-6">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-11 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-md"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Template
            </Button>
          </div>
        </>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
            <DialogDescription>Edit the field in the {activeTab} template</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Field Name *</Label>
              <Input
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                placeholder="Enter field name"
                className="h-11 border-2 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Field Type *</Label>
              <Select value={newField.type} onValueChange={(value) => setNewField({ ...newField, type: value })}>
                <SelectTrigger className="h-11 border-2 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newField.type === "dropdown" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Dropdown Values *</Label>
                <Input
                  value={newField.values}
                  onChange={(e) => setNewField({ ...newField, values: e.target.value })}
                  placeholder="Option 1, Option 2, Option 3"
                  className="h-11 border-2 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500">Separate values with commas</p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Edit Permissions</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-accounts"
                    checked={newField.accountsPermission}
                    onCheckedChange={(checked) => setNewField({ ...newField, accountsPermission: checked as boolean })}
                  />
                  <label htmlFor="edit-accounts" className="text-sm cursor-pointer">
                    Accounts role can edit this field
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-support"
                    checked={newField.supportPermission}
                    onCheckedChange={(checked) => setNewField({ ...newField, supportPermission: checked as boolean })}
                  />
                  <label htmlFor="edit-support" className="text-sm cursor-pointer">
                    Support role can edit this field
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-2">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditedField}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteFieldId !== null} onOpenChange={() => setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this field? This will remove it from the template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFieldId && handleDeleteField(deleteFieldId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  )
}
