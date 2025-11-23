"use client"

import { useState, useEffect, useCallback } from "react"
import { ref, get, set } from "firebase/database"
import { database } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Save, Download, Loader2, CalendarIcon, Filter, Trash2 } from "lucide-react"
import * as XLSX from "xlsx"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { renderCell } from "@/components/render-cell" 
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

interface Client {
  clientName: string
  product: string
  templates?: {
    tms: {
      fields: Record<string, Field>
    }
    rms: {
      fields: Record<string, Field>
    }
  }
  template: {
    fields: Record<string, Field>
  }
}

interface BillingRecord {
  [fieldId: string]: { value: any }
}

export function DashboardContent() {
  const { role } = useAuth()
  const { toast } = useToast()

  const [clients, setClients] = useState<Record<string, Client>>({})
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<"TMS" | "RMS">("TMS")
  const [monthFrom, setMonthFrom] = useState<Date>()
  const [monthTo, setMonthTo] = useState<Date>()
  const [invoiceStatus, setInvoiceStatus] = useState("all")
  const [paymentStatus, setPaymentStatus] = useState("all")

  const [appliedFilters, setAppliedFilters] = useState({
    client: "",
    product: "TMS" as "TMS" | "RMS",
    monthFrom: undefined as Date | undefined,
    monthTo: undefined as Date | undefined,
    invoiceStatus: "all",
    paymentStatus: "all",
  })
  
  const [invoiceStatusOptions, setInvoiceStatusOptions] = useState<string[]>([]);
  const [paymentStatusOptions, setPaymentStatusOptions] = useState<string[]>([]);
  
  const [tableData, setTableData] = useState<Record<string, BillingRecord>>({})
  const [sortedFields, setSortedFields] = useState<[string, Field][]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  // 1. Initial client load
  useEffect(() => {
    const loadClients = async () => {
      const clientsRef = ref(database, "clients")
      const snapshot = await get(clientsRef)
      if (snapshot.exists()) {
        setClients(snapshot.val())
      }
    }
    loadClients()
  }, [])
  
  // 2. Effect to update appliedFilters whenever a selection changes
  // This replaces the "Apply Filters" button logic.
  useEffect(() => {
    // Only apply filters if a client is selected
    if (selectedClient) {
      setAppliedFilters({
        client: selectedClient,
        product: selectedProduct,
        monthFrom,
        monthTo,
        invoiceStatus,
        paymentStatus,
      });

      // Show toast if filters change after initial load
      if (appliedFilters.client) {
          toast({
            title: "Data Refreshing",
            description: "Applying filters...",
            className: "bg-blue-50 border-blue-200",
          });
      }
    }
  }, [selectedClient, selectedProduct, monthFrom, monthTo, invoiceStatus, paymentStatus]);


  // 3. Effect to load data when appliedFilters changes
  useEffect(() => {
    if (!appliedFilters.client) return

    const loadBillingData = async () => {
      setLoading(true)
      const client = clients[appliedFilters.client]

      const productKey = appliedFilters.product.toLowerCase() as "tms" | "rms"
      const template = client.templates?.[productKey] || client.template

      if (!template?.fields) {
        setLoading(false)
        setInvoiceStatusOptions([]);
        setPaymentStatusOptions([]);
        setTableData({}); // Clear data if no template
        return
      }

      const fields = Object.entries(template.fields).sort(([, a], [, b]) => a.index - b.index)
      setSortedFields(fields)
      
      // --- DYNAMIC FILTER OPTIONS LOGIC ---
      const invoiceField = fields.find(([, f]) => f.name === "Invoice Status")
      if (invoiceField && invoiceField[1].type === "dropdown" && invoiceField[1].values) {
        setInvoiceStatusOptions(invoiceField[1].values);
      } else {
        setInvoiceStatusOptions([]);
      }

      const paymentField = fields.find(([, f]) => f.name === "Payment Status")
      if (paymentField && paymentField[1].type === "dropdown" && paymentField[1].values) {
        setPaymentStatusOptions(paymentField[1].values);
      } else {
        setPaymentStatusOptions([]);
      }
      // --- END DYNAMIC FILTER OPTIONS LOGIC ---

      const billingRef = ref(database, `billingData/${appliedFilters.client}/${appliedFilters.product}`)
      const snapshot = await get(billingRef)

      if (snapshot.exists()) {
        const data = snapshot.val()
        const flatData: Record<string, BillingRecord> = {}
        Object.entries(data).forEach(([month, records]: [string, any]) => {
          Object.entries(records).forEach(([recordId, record]: [string, any]) => {
            let includeRecord = true

            if (appliedFilters.monthFrom || appliedFilters.monthTo) {
              const monthField = fields.find(([, f]) => f.type === "month")
              if (monthField) {
                const [monthFieldId] = monthField
                const recordMonth = record[monthFieldId]?.value
                if (recordMonth) {
                  const recordDate = new Date(recordMonth) 
                  
                  const filterFrom = appliedFilters.monthFrom ? new Date(appliedFilters.monthFrom.getFullYear(), appliedFilters.monthFrom.getMonth(), 1) : undefined;
                  const filterTo = appliedFilters.monthTo ? new Date(appliedFilters.monthTo.getFullYear(), appliedFilters.monthTo.getMonth() + 1, 0) : undefined; 

                  if (filterFrom && recordDate < filterFrom) includeRecord = false
                  if (filterTo && recordDate > filterTo) includeRecord = false
                }
              }
            }

            if (appliedFilters.invoiceStatus !== "all") {
              const invoiceField = fields.find(([, f]) => f.name === "Invoice Status")
              if (invoiceField) {
                const [invoiceFieldId] = invoiceField
                if (record[invoiceFieldId]?.value !== appliedFilters.invoiceStatus) includeRecord = false
              }
            }

            if (appliedFilters.paymentStatus !== "all") {
              const paymentField = fields.find(([, f]) => f.name === "Payment Status")
              if (paymentField) {
                const [paymentFieldId] = paymentField
                if (record[paymentFieldId]?.value !== appliedFilters.paymentStatus) includeRecord = false
              }
            }

            if (includeRecord) {
              flatData[recordId] = record
            }
          })
        })
        setTableData(flatData)
      } else {
        setTableData({})
      }

      setLoading(false)
    }

    loadBillingData()
  }, [appliedFilters, clients]) // Depend on clients to reload template when client data loads

  const canEditField = (field: Field) => {
    if (role === "Admin") return true
    if (role === "Accounts") return field.permissions.accounts
    if (role === "Support") return field.permissions.support
    return false
  }

  const canEditAnyField = () => {
    return role === "Admin" || role === "Accounts" || role === "Support"
  }

  const handleCellChange = (recordId: string, fieldId: string, value: any) => {
    setTableData((prev) => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        [fieldId]: { value },
      },
    }))
  }

  const addNewRecord = () => {
    const newRecordId = `record_${Date.now()}`
    const newRecord: BillingRecord = {}

    sortedFields.forEach(([fieldId, field]) => {
      newRecord[fieldId] = { value: "" }
    })

    setTableData((prev) => ({
      ...prev,
      [newRecordId]: newRecord,
    }))
  }

  const deleteRecord = (recordId: string) => {
    setTableData((prev) => {
      const newData = { ...prev }
      delete newData[recordId]
      return newData
    })

    toast({
      title: "Success",
      description: "Record deleted successfully",
      className: "bg-green-50 border-green-200",
    })

    setDeleteRecordId(null)
  }

  const saveData = async () => {
    if (!appliedFilters.client) return

    setSaving(true)
    try {
      const groupedData: Record<string, Record<string, BillingRecord>> = {}

      Object.entries(tableData).forEach(([recordId, record]) => {
        const monthField = sortedFields.find(([, f]) => f.type === "month")
        if (monthField) {
          const [monthFieldId] = monthField
          // The format 'YYYY-MM' is safe to use as a key
          const monthValue = record[monthFieldId]?.value || format(new Date(), 'yyyy-MM')

          if (!groupedData[monthValue]) {
            groupedData[monthValue] = {}
          }
          groupedData[monthValue][recordId] = record
        }
      })

      const billingRef = ref(database, `billingData/${appliedFilters.client}/${appliedFilters.product}`)
      await set(billingRef, groupedData)

      toast({
        title: "Success",
        description: "Data saved successfully",
        className: "bg-green-50 border-green-200",
      })
      setShowSaveConfirm(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save data",
        variant: "destructive",
      })
      setShowSaveConfirm(false)
    } finally {
      setSaving(false)
    }
  }

  const downloadData = () => {
    if (!appliedFilters.client || Object.keys(tableData).length === 0) {
      toast({
        title: "No Data",
        description: "There is no data to export",
        variant: "destructive",
      })
      return
    }

    try {
      const exportData = Object.entries(tableData).map(([recordId, record]) => {
        const row: Record<string, any> = {}
        sortedFields.forEach(([fieldId, field]) => {
          row[field.name] = record[fieldId]?.value || ""
        })
        return row
      })

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Billing Data")

      const fileName = `${clients[appliedFilters.client]?.clientName}_${appliedFilters.product}_billing_data.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({
        title: "Success",
        description: "Data exported successfully",
        className: "bg-green-50 border-green-200",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const clientHasBothProducts = () => {
    if (!selectedClient || !clients[selectedClient]) return false
    const client = clients[selectedClient]
    return client.templates && client.templates.tms && client.templates.rms
  }


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-600 mt-1">Manage your billing data and invoices</p>
        </div>
      </div>

      {/* --- Filters (Flat layout with uniform width and HEIGHT H-12) --- */}
      <div className="py-4 border-b-2 mb-4">
        {/*
          Dynamic Grid Configuration:
          - Product shown (6 items): Use xl:grid-cols-6
          - Product hidden (5 items): Use xl:grid-cols-5
        */}
        <div 
          className={cn(
            "grid grid-cols-2 sm:grid-cols-3 gap-4 items-end",
            clientHasBothProducts() 
              ? "lg:grid-cols-4 xl:grid-cols-6" // 6 columns (Product is visible)
              : "lg:grid-cols-3 xl:grid-cols-5"  // 5 columns (Product is hidden, filter button is removed)
          )}
        >
          
          {/* 1. Client Select */}
          <div className="space-y-2 col-span-1">
            <Label className="text-sm font-semibold text-slate-700">Client *</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-full **h-12** border-2 focus:border-blue-500">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(clients).map(([id, client]) => (
                  <SelectItem key={id} value={id}>
                    {client.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Product Select (Conditional) */}
          {clientHasBothProducts() && (
            <div className="space-y-2 col-span-1">
              <Label className="text-sm font-semibold text-slate-700">Product *</Label>
              <Select value={selectedProduct} onValueChange={(val) => setSelectedProduct(val as "TMS" | "RMS")}>
                <SelectTrigger className="w-full **h-12** border-2 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TMS">TMS</SelectItem>
                  <SelectItem value="RMS">RMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* 3. Month From */}
          <div className="space-y-2 col-span-1">
            <Label className="text-sm font-semibold text-slate-700">Month From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full **h-12** justify-start text-left font-normal border-2 hover:border-blue-500",
                    !monthFrom && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {monthFrom ? format(monthFrom, "MMM yyyy") : "Select month"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={monthFrom} 
                  onSelect={setMonthFrom} 
                  initialFocus 
                  captionLayout="dropdown"
                  fromYear={2015}
                  toYear={new Date().getFullYear() + 5}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 4. Month To */}
          <div className="space-y-2 col-span-1">
            <Label className="text-sm font-semibold text-slate-700">Month To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full **h-12** justify-start text-left font-normal border-2 hover:border-blue-500",
                    !monthTo && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {monthTo ? format(monthTo, "MMM yyyy") : "Select month"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={monthTo} 
                  onSelect={setMonthTo} 
                  initialFocus 
                  captionLayout="dropdown"
                  fromYear={2015}
                  toYear={new Date().getFullYear() + 5}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 5. Invoice Status (DYNAMIC) */}
          <div className="space-y-2 col-span-1">
            <Label className="text-sm font-semibold text-slate-700">Invoice Status</Label>
            <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
              <SelectTrigger className="w-full **h-12** border-2 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {invoiceStatusOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 6. Payment Status (DYNAMIC) */}
          <div className="space-y-2 col-span-1">
            <Label className="text-sm font-semibold text-slate-700">Payment Status</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="w-full **h-12** border-2 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {paymentStatusOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* REMOVED: Apply Filters Button (Logic is now in useEffect) */}
          {/* <div className="col-span-1 flex items-end h-full">
             <Button
                onClick={applyFilters}
                disabled={!selectedClient}
                className="w-full **h-12** bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-md"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
          </div> */}

        </div>

      </div>
      
      {/* --- Data Table --- */}
      {appliedFilters.client && (
        <Card className="border-2 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-slate-900">
                Billing Data - {clients[appliedFilters.client]?.clientName} ({appliedFilters.product})
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {canEditAnyField() && (
                  <>
                    <Button
                      onClick={addNewRecord}
                      variant="outline"
                      size="sm"
                      className="border-2 hover:border-blue-500 hover:bg-blue-50 bg-transparent"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Record
                    </Button>
                    <Button
                      onClick={() => setShowSaveConfirm(true)}
                      size="sm"
                      disabled={saving}
                      className="bg-green-500 hover:bg-green-600 text-white shadow-md"
                    >
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Data
                    </Button>
                  </>
                )}
                <Button
                  onClick={downloadData}
                  variant="outline"
                  size="sm"
                  className="border-2 hover:border-cyan-500 hover:bg-cyan-50 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <p className="text-slate-600">Loading data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[70vh] rounded-lg border-2"> 
                <table className="w-full min-w-max">
                  <thead className="bg-slate-50 sticky top-0 z-10"> 
                    <tr className="border-b-2">
                      {sortedFields.map(([fieldId, field]) => (
                        <th
                          key={fieldId}
                          className="text-left px-4 py-4 text-sm font-bold text-slate-700 whitespace-nowrap"
                        >
                          {field.name}
                        </th>
                      ))}
                      {canEditAnyField() && (
                        <th className="text-left px-4 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(tableData).length === 0 ? (
                      <tr>
                        <td colSpan={sortedFields.length + 1} className="text-center py-12 text-slate-500">
                          No records found. Click "Add Record" to create one.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(tableData).map(([recordId], idx) => (
                        <tr key={recordId} className={cn("border-b", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                          {sortedFields.map(([fieldId, field]) => (
                            <td key={fieldId} className="py-2 px-2">
                              {renderCell(recordId, fieldId, field, tableData, handleCellChange, canEditField(field))}
                            </td>
                          ))}
                          {canEditAnyField() && (
                            <td className="py-2 px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteRecordId(recordId)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save all changes? This will update the billing data in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveData} className="bg-green-500 hover:bg-green-600">
              Yes, Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteRecordId !== null} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRecordId && deleteRecord(deleteRecordId)}
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