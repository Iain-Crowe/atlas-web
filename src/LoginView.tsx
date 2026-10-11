import {
  useState,
  type FormEvent,
} from "react"

import "./App.css"

type LoginViewProps = {
  onLogin: (
    username: string,
    password: string
  ) => Promise<void>
}

function LoginView({
  onLogin,
}: LoginViewProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] =
    useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault()

    setLoading(true)
    setError(null)

    try {
      await onLogin(username, password)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo-wrap">
            <img
              src="/atlas-logo.png"
              alt="Atlas logo"
              className="login-logo"
            />
          </div>

          <div>
            <h1>Atlas</h1>
            <p>Homelab Control Console</p>
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <div className="login-field">
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              autoComplete="username"
              disabled={loading}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginView