import { useEffect, useState } from "react"

import {
  apiFetch,
  clearToken,
  getToken,
  setToken,
} from "../api"

type LoginResponse = {
  access_token: string
}

type UseAuthResult = {
  authenticated: boolean
  checkingAuth: boolean
  login: (
    username: string,
    password: string
  ) => Promise<void>
  logout: () => void
}

function useAuth(): UseAuthResult {
  const [authenticated, setAuthenticated] =
    useState(false)

  const [checkingAuth, setCheckingAuth] =
    useState(true)

  useEffect(() => {
    async function checkAuth() {
      const token = getToken()

      if (!token) {
        setCheckingAuth(false)
        return
      }

      try {
        const response = await apiFetch("/auth/me")

        if (response.ok) {
          setAuthenticated(true)
        } else {
          clearToken()
        }
      } finally {
        setCheckingAuth(false)
      }
    }

    void checkAuth()
  }, [])

  async function login(
    username: string,
    password: string
  ): Promise<void> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    })

    if (!response.ok) {
      throw new Error(
        "Invalid username or password"
      )
    }

    const data: LoginResponse =
      await response.json()

    setToken(data.access_token)
    setAuthenticated(true)
  }

  function logout() {
    clearToken()
    setAuthenticated(false)
  }

  return {
    authenticated,
    checkingAuth,
    login,
    logout,
  }
}

export default useAuth