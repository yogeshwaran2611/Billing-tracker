"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

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

interface BillingRecord {
  [fieldId: string]: { value: any }
}

export function renderCell(
  recordId: string,
  fieldId: string,
  field: Field,
  tableData: Record<string, BillingRecord>,
  handleCellChange: (recordId: string, fieldId: string, value: any) => void,
  canEdit = true,
) {
  const value = tableData[recordId]?.[fieldId]?.value || ""

  if (!canEdit) {
    if (field.type === "date") {
      return (
        <div className="px-3 py-2 text-sm text-slate-600 min-w-[120px]">
          {value ? format(new Date(value), "PPP") : "—"}
        </div>
      )
    }
    if (field.type === "month") {
      return <div className="px-3 py-2 text-sm text-slate-600 min-w-[120px]">{value || "—"}</div>
    }
    return <div className="px-3 py-2 text-sm text-slate-600 min-w-[100px]">{value || "—"}</div>
  }

  switch (field.type) {
    case "dropdown":
      return (
        <Select value={value} onValueChange={(val) => handleCellChange(recordId, fieldId, val)}>
          <SelectTrigger className="h-10 border-2 focus:border-blue-500 bg-white min-w-[150px]">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.values?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "number":
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => handleCellChange(recordId, fieldId, e.target.value)}
          className="h-10 border-2 focus:border-blue-500 bg-white min-w-[120px]"
        />
      )

    case "date":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-10 justify-start text-left font-normal border-2 hover:border-blue-500 bg-white min-w-[160px]",
                !value && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(new Date(value), "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={(date) => handleCellChange(recordId, fieldId, date ? format(date, "yyyy-MM-dd") : "")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )

    case "month":
      return (
        <Input
          type="month"
          value={value}
          onChange={(e) => handleCellChange(recordId, fieldId, e.target.value)}
          className="h-10 border-2 focus:border-blue-500 bg-white min-w-[150px]"
        />
      )

    default:
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => handleCellChange(recordId, fieldId, e.target.value)}
          className="h-10 border-2 focus:border-blue-500 bg-white min-w-[150px]"
        />
      )
  }
}
