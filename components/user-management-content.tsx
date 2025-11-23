"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ref, get, set, remove } from "firebase/database"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { database, getSecondaryAuth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface User {
  email: string
  role: "Admin" | "Accounts" | "Support" | "Member"
}

export function UserManagementContent() {
  const { toast } = useToast()
  const [users, setUsers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<{ uid: string; user: User } | null>(null)
  const [formData, setFormData] = useState({ email: "", role: "Member" as User["role"] })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const usersRef = ref(database, "users")
    const snapshot = await get(usersRef)
    if (snapshot.exists()) {
      setUsers(snapshot.val())
    }
    setLoading(false)
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setFormData({ email: "", role: "Member" })
    setDialogOpen(true)
  }

  const handleEditUser = (uid: string, user: User) => {
    setEditingUser({ uid, user })
    setFormData({ email: user.email, role: user.role })
    setDialogOpen(true)
  }

  const handleDeleteUser = async (uid: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const userRef = ref(database, `users/${uid}`)
      await remove(userRef)

      toast({
        title: "Success",
        description: "User deleted successfully",
      })

      loadUsers()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingUser) {
        // Update existing user
        const userRef = ref(database, `users/${editingUser.uid}`)
        await set(userRef, {
          email: formData.email,
          role: formData.role,
        })

        toast({
          title: "Success",
          description: "User updated successfully",
        })
      } else {
        const secondaryAuth = getSecondaryAuth()
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, "user123")

        // Save user data to database
        const userRef = ref(database, `users/${userCredential.user.uid}`)
        await set(userRef, {
          email: formData.email,
          role: formData.role,
        })

        await secondaryAuth.signOut()

        toast({
          title: "Success",
          description: "User created successfully with password: user123",
        })
      }

      setDialogOpen(false)
      loadUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save user",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddUser}>
              <Plus className="h-4 w-4 mr-2" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? "Update user information and role."
                    : "Create a new user with default password: user123"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingUser}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as User["role"] })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Accounts">Accounts</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="Member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingUser ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
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
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(users).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(users).map(([uid, user]) => (
                    <TableRow key={uid}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditUser(uid, user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(uid)}>
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
