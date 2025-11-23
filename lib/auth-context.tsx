"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { ref, get } from "firebase/database"
import { auth, database } from "./firebase"
import { useRouter } from "next/navigation"

type UserRole = "Admin" | "Accounts" | "Support" | "Member"

interface AuthContextType {
  user: User | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)

        // Fetch user role from database
        const userRef = ref(database, `users/${firebaseUser.uid}/role`)
        const snapshot = await get(userRef)

        if (snapshot.exists()) {
          setRole(snapshot.val() as UserRole)
        }
      } else {
        setUser(null)
        setRole(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
    setRole(null)
    router.push("/")
  }

  return <AuthContext.Provider value={{ user, role, loading, signOut }}>{children}</AuthContext.Provider>
}
