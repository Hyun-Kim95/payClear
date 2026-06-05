import { createContext, useContext, useState, type ReactNode } from 'react'

interface AuthContextValue {
  isLoggedIn: boolean
  pinSet: boolean
  login: () => void
  logout: () => void
  setPinDone: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('payclear-mock-auth') === '1')
  const [pinSet, setPinSet] = useState(() => localStorage.getItem('payclear-mock-pin') === '1')

  const login = () => {
    sessionStorage.setItem('payclear-mock-auth', '1')
    setIsLoggedIn(true)
  }

  const logout = () => {
    sessionStorage.removeItem('payclear-mock-auth')
    setIsLoggedIn(false)
  }

  const setPinDone = () => {
    localStorage.setItem('payclear-mock-pin', '1')
    setPinSet(true)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, pinSet, login, logout, setPinDone }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
