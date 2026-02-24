import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const BASE_URL = 'https://192.168.1.19:8001'

const sections = [
  { id: 'overview',    label: '01 / Overview' },
  { id: 'auth-jwt',   label: '02 / Authentication' },
  { id: 'api-token',  label: '03 / API Token' },
  { id: 'ep-auth',    label: '04 / Auth Endpoints' },
  { id: 'ep-bots',    label: '05 / Bot Endpoints' },
  { id: 'ep-crypto',  label: '06 / Crypto Endpoints' },
  { id: 'ep-trading', label: '07 / Trading Endpoints' },
  { id: 'errors',     label: '08 / Error Codes' },
]

function CodeBlock({ code, lang = 'bash' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-black border border-cyber-border px-4 py-1">
        <span className="font-mono text-xs text-gray-600 uppercase">{lang}</span>
        <button onClick={copy} className="font-mono text-xs text-gray-500 hover:text-cyber-cyan transition-colors">
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre className="bg-black bg-opacity-80 border border-t-0 border-cyber-border p-4 overflow-x-auto">
        <code className="font-mono text-sm text-cyber-green whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}

function Badge({ method }) {
  const colors = {
    GET:    'text-cyber-cyan border-cyber-cyan',
    POST:   'text-cyber-green border-cyber-green',
    DELETE: 'text-cyber-pink border-cyber-pink',
    PUT:    'text-yellow-400 border-yellow-400',
  }
  return (
    <span className={`font-mono text-xs font-bold px-2 py-0.5 border ${colors[method] || colors.GET}`}>
      {method}
    </span>
  )
}

function Endpoint({ method, path, description, auth, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-cyber-border mb-3 hover:border-cyber-cyan transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white hover:bg-opacity-5 transition-colors"
      >
        <Badge method={method} />
        <code className="font-mono text-sm text-white flex-1">{path}</code>
        {auth && (
          <span className="font-mono text-xs text-cyber-yellow border border-cyber-yellow px-2 py-0.5">
            {auth}
          </span>
        )}
        <span className="text-gray-600 text-xs ml-auto">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-cyber-border">
          <p className="font-mono text-sm text-gray-400 mt-3 mb-2">{description}</p>
          {children}
        </div>
      )}
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-cyber-border" />
        <h2 className="font-orbitron font-bold text-cyber-cyan text-glow-cyan text-xl uppercase">{title}</h2>
        <div className="h-px flex-1 bg-cyber-border" />
      </div>
      {children}
    </section>
  )
}

export default function Docs() {
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY + 120
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && el.offsetTop <= scrollY) setActive(s.id)
      }
    }
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen grid-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 pb-16 flex gap-8">

        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 cyber-card p-4">
            <p className="font-orbitron text-xs text-cyber-pink uppercase mb-4 tracking-widest">
              Documentation
            </p>
            <nav className="space-y-1">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left font-mono text-xs px-3 py-2 transition-all ${
                    active === s.id
                      ? 'text-cyber-cyan bg-cyber-cyan bg-opacity-10 border-l-2 border-cyber-cyan'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-orbitron font-black text-4xl text-white mb-2">
              API <span className="text-cyber-cyan text-glow-cyan">DOCS</span>
            </h1>
            <p className="font-mono text-gray-400">
              Referencia completa del sistema CryptoPlayground — v1.0
            </p>
            <div className="mt-4 flex gap-3 font-mono text-xs">
              <span className="px-3 py-1 border border-cyber-green text-cyber-green">Base URL: {BASE_URL}</span>
              <span className="px-3 py-1 border border-gray-600 text-gray-500">Format: JSON</span>
            </div>
          </div>

          {/* 01 Overview */}
          <Section id="overview" title="Overview">
            <div className="cyber-card p-6 mb-6">
              <p className="font-mono text-sm text-gray-300 leading-relaxed mb-4">
                <span className="text-cyber-cyan">CryptoPlayground</span> es una plataforma de trading simulado de criptomonedas.
                Permite crear <span className="text-cyber-pink">bots de trading</span> con saldo ficticio, operar con ellos
                a través de una API REST y monitorizar su rendimiento en tiempo real con datos reales del mercado.
              </p>
              <p className="font-mono text-sm text-gray-300 leading-relaxed">
                Los datos de mercado se obtienen de <span className="text-cyber-yellow">CoinGecko</span> (listado y precios)
                y <span className="text-cyber-yellow">Binance</span> (velas OHLCV). Ningún dinero real es utilizado.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { icon: '🧑‍💻', title: 'Registrarse', desc: 'Crea una cuenta con email y contraseña' },
                { icon: '🤖', title: 'Crear un Bot', desc: 'Genera un bot con $1,000 de saldo ficticio y su propio API Token' },
                { icon: '📈', title: 'Operar', desc: 'Usa el API Token del bot para ejecutar órdenes vía REST API' },
              ].map(item => (
                <div key={item.title} className="cyber-card p-4 text-center border border-cyber-border">
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <h3 className="font-orbitron text-sm text-cyber-cyan mb-1">{item.title}</h3>
                  <p className="font-mono text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="cyber-card p-4 border border-cyber-yellow bg-cyber-yellow bg-opacity-5">
              <p className="font-mono text-xs text-cyber-yellow">
                ⚠️ El certificado SSL es self-signed. Añade una excepción en tu navegador o usa <code className="text-white">-k</code> en curl.
              </p>
            </div>
          </Section>

          {/* 02 Auth JWT */}
          <Section id="auth-jwt" title="Autenticación JWT">
            <div className="cyber-card p-6 mb-4">
              <p className="font-mono text-sm text-gray-300 leading-relaxed mb-4">
                Las rutas del dashboard (gestión de bots) requieren un <span className="text-cyber-cyan">JWT token</span> obtenido al hacer login.
                Debes incluirlo en el header <code className="text-cyber-pink">Authorization</code> de cada petición.
              </p>
              <CodeBlock lang="http" code={`Authorization: Bearer <jwt_token>`} />
              <p className="font-mono text-xs text-gray-500 mt-2">
                Los tokens JWT expiran en <span className="text-cyber-cyan">7 días</span>.
              </p>
            </div>
          </Section>

          {/* 03 API Token */}
          <Section id="api-token" title="API Token de Bot">
            <div className="cyber-card p-6 mb-4">
              <p className="font-mono text-sm text-gray-300 leading-relaxed mb-4">
                Cada bot tiene un <span className="text-cyber-cyan">API Token único</span> (UUID v4) que se genera automáticamente al crear el bot.
                Este token es independiente del JWT — permite ejecutar operaciones de trading en nombre del bot
                <span className="text-cyber-pink"> sin necesidad de estar logueado</span>.
              </p>

              <h3 className="font-orbitron text-xs text-gray-400 uppercase mb-3 mt-5">¿Cómo obtener el API Token?</h3>
              <div className="space-y-3 font-mono text-sm">
                {[
                  { n: '1', text: 'Inicia sesión en la plataforma web' },
                  { n: '2', text: 'Ve a Dashboard → crea un nuevo bot' },
                  { n: '3', text: 'En la tarjeta del bot, haz click en "Details"' },
                  { n: '4', text: 'El API Token aparece en la sección "API Token" — cópialo con el botón Copy' },
                ].map(s => (
                  <div key={s.n} className="flex gap-3 items-start">
                    <span className="text-cyber-cyan shrink-0 w-5">{s.n}.</span>
                    <span className="text-gray-400">{s.text}</span>
                  </div>
                ))}
              </div>

              <h3 className="font-orbitron text-xs text-gray-400 uppercase mb-3 mt-6">Uso en peticiones</h3>
              <CodeBlock lang="http" code={`X-API-Token: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`} />

              <h3 className="font-orbitron text-xs text-gray-400 uppercase mb-3 mt-4">Ejemplo completo con curl</h3>
              <CodeBlock lang="bash" code={`# Crear una orden de compra de BTC
curl -k -X POST ${BASE_URL}/api/trading/buy \\
  -H "X-API-Token: tu-api-token-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"BTCUSDT","quantity":0.001}'`} />
            </div>
          </Section>

          {/* 04 Auth Endpoints */}
          <Section id="ep-auth" title="Endpoints — Auth">
            <Endpoint method="POST" path="/api/auth/register" description="Crea una nueva cuenta de usuario.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Request Body</h4>
              <CodeBlock lang="json" code={`{
  "username": "string (requerido, único)",
  "email":    "string (requerido, único)",
  "password": "string (requerido, mín. 6 caracteres)"
}`} />
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 201</h4>
              <CodeBlock lang="json" code={`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "satoshi",
    "email": "satoshi@bitcoin.org"
  }
}`} />
            </Endpoint>

            <Endpoint method="POST" path="/api/auth/login" description="Inicia sesión y obtiene un JWT token.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Request Body</h4>
              <CodeBlock lang="json" code={`{
  "email":    "satoshi@bitcoin.org",
  "password": "tu_contraseña"
}`} />
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "username": "satoshi", "email": "satoshi@bitcoin.org" }
}`} />
            </Endpoint>
          </Section>

          {/* 05 Bot Endpoints */}
          <Section id="ep-bots" title="Endpoints — Bots">
            <p className="font-mono text-xs text-cyber-yellow mb-4">
              🔒 Todos los endpoints de bots requieren header: <code className="text-white">Authorization: Bearer &lt;jwt&gt;</code>
            </p>

            <Endpoint method="GET" path="/api/bots" auth="JWT" description="Lista todos los bots del usuario autenticado.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`[
  {
    "id": 1,
    "name": "Alpha Bot",
    "api_token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "initial_balance": 1000.00,
    "current_balance": 1247.83,
    "created_at": "2026-02-24T12:00:00.000Z"
  }
]`} />
            </Endpoint>

            <Endpoint method="POST" path="/api/bots" auth="JWT" description="Crea un nuevo bot. Se le asigna $1,000 de saldo ficticio por defecto y se genera un API Token único.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Request Body</h4>
              <CodeBlock lang="json" code={`{
  "name":            "string (requerido)",
  "initial_balance": 1000 (opcional, default: 1000)
}`} />
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 201</h4>
              <CodeBlock lang="json" code={`{
  "id": 2,
  "name": "Beta Bot",
  "api_token": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "initial_balance": 1000.00,
  "current_balance": 1000.00,
  "created_at": "2026-02-24T15:30:00.000Z"
}`} />
            </Endpoint>

            <Endpoint method="GET" path="/api/bots/:id" auth="JWT" description="Obtiene el detalle de un bot específico. Solo accesible por el propietario.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`{
  "id": 1,
  "name": "Alpha Bot",
  "api_token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "initial_balance": 1000.00,
  "current_balance": 1247.83,
  "created_at": "2026-02-24T12:00:00.000Z"
}`} />
            </Endpoint>

            <Endpoint method="DELETE" path="/api/bots/:id" auth="JWT" description="Elimina un bot y todas sus órdenes y posiciones asociadas.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`{ "message": "Bot deleted" }`} />
            </Endpoint>
          </Section>

          {/* 06 Crypto Endpoints */}
          <Section id="ep-crypto" title="Endpoints — Crypto (Público)">
            <p className="font-mono text-xs text-cyber-green mb-4">
              ✅ Estos endpoints son públicos — no requieren ningún token.
            </p>

            <Endpoint method="GET" path="/api/crypto/list" description="Devuelve el listado de las 50 criptomonedas más importantes por capitalización. Datos de CoinGecko.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`[
  {
    "id":                "bitcoin",
    "symbol":            "btc",
    "name":              "Bitcoin",
    "image":             "https://...",
    "current_price":     63548.12,
    "market_cap":        1250000000000,
    "price_change_24h":  2.34,
    "total_volume":      28000000000
  },
  ...
]`} />
            </Endpoint>

            <Endpoint method="GET" path="/api/crypto/:symbol/candles" description="Devuelve datos OHLCV (velas) de una criptomoneda. Datos de Binance.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Query Params</h4>
              <div className="font-mono text-xs space-y-2 mb-4 ml-2">
                {[
                  { p: 'interval', v: '1h | 4h | 1d | 1w | 1M', d: 'Intervalo de cada vela' },
                  { p: 'limit',    v: 'número (default: 100)', d: 'Número de velas a devolver' },
                ].map(r => (
                  <div key={r.p} className="flex gap-3">
                    <code className="text-cyber-cyan w-20 shrink-0">{r.p}</code>
                    <code className="text-gray-400 w-44 shrink-0">{r.v}</code>
                    <span className="text-gray-600">{r.d}</span>
                  </div>
                ))}
              </div>
              <h4 className="font-mono text-xs text-gray-500 uppercase mb-2">Símbolos de ejemplo</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT'].map(s => (
                  <code key={s} className="font-mono text-xs text-cyber-yellow border border-cyber-border px-2 py-1">{s}</code>
                ))}
              </div>
              <h4 className="font-mono text-xs text-gray-500 uppercase mb-2">Ejemplo</h4>
              <CodeBlock lang="bash" code={`curl -k "${BASE_URL}/api/crypto/BTCUSDT/candles?interval=1d&limit=30"`} />
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`[
  {
    "time":   1708732800,
    "open":   51200.50,
    "high":   52800.00,
    "low":    50900.10,
    "close":  52100.75,
    "volume": 18420.33
  },
  ...
]`} />
            </Endpoint>

            <Endpoint method="GET" path="/api/crypto/:symbol/price" description="Precio actual de una criptomoneda en USD.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Ejemplo</h4>
              <CodeBlock lang="bash" code={`curl -k "${BASE_URL}/api/crypto/BTCUSDT/price"`} />
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`{
  "symbol": "BTCUSDT",
  "price":  63548.12
}`} />
            </Endpoint>
          </Section>

          {/* 07 Trading Endpoints */}
          <Section id="ep-trading" title="Endpoints — Trading">
            <p className="font-mono text-xs text-cyber-yellow mb-4">
              🤖 Todos los endpoints de trading requieren header: <code className="text-white">X-API-Token: &lt;api_token_del_bot&gt;</code>
            </p>

            <Endpoint method="POST" path="/api/trading/buy" auth="X-API-Token" description="Ejecuta una orden de compra. Si no se especifica precio, se toma el precio actual de mercado (Binance).">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Request Body</h4>
              <CodeBlock lang="json" code={`{
  "symbol":   "BTCUSDT",
  "quantity": 0.001,
  "price":    63000 (opcional — si se omite, se usa precio de mercado)
}`} />
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 201</h4>
              <CodeBlock lang="json" code={`{
  "id":         42,
  "type":       "buy",
  "symbol":     "BTCUSDT",
  "quantity":   0.001,
  "price":      63548.12,
  "status":     "filled",
  "created_at": "2026-02-24T16:00:00.000Z"
}`} />
            </Endpoint>

            <Endpoint method="POST" path="/api/trading/sell" auth="X-API-Token" description="Ejecuta una orden de venta. Requiere tener posición abierta del símbolo indicado.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Request Body</h4>
              <CodeBlock lang="json" code={`{
  "symbol":   "BTCUSDT",
  "quantity": 0.001,
  "price":    65000 (opcional)
}`} />
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 201</h4>
              <CodeBlock lang="json" code={`{
  "id":         43,
  "type":       "sell",
  "symbol":     "BTCUSDT",
  "quantity":   0.001,
  "price":      65000.00,
  "status":     "filled",
  "pnl":        1.45
}`} />
            </Endpoint>

            <Endpoint method="POST" path="/api/trading/stop-loss" auth="X-API-Token" description="Crea una orden stop-loss. Se ejecuta automáticamente cuando el precio cae por debajo del trigger.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Request Body</h4>
              <CodeBlock lang="json" code={`{
  "symbol":        "BTCUSDT",
  "quantity":      0.001,
  "trigger_price": 60000
}`} />
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 201</h4>
              <CodeBlock lang="json" code={`{
  "id":            44,
  "type":          "stop_loss",
  "symbol":        "BTCUSDT",
  "quantity":      0.001,
  "price":         60000,
  "status":        "open",
  "created_at":    "2026-02-24T16:00:00.000Z"
}`} />
            </Endpoint>

            <Endpoint method="POST" path="/api/trading/take-profit" auth="X-API-Token" description="Crea una orden take-profit. Se ejecuta cuando el precio sube por encima del trigger.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Request Body</h4>
              <CodeBlock lang="json" code={`{
  "symbol":        "BTCUSDT",
  "quantity":      0.001,
  "trigger_price": 70000
}`} />
            </Endpoint>

            <Endpoint method="GET" path="/api/trading/orders" auth="X-API-Token" description="Lista el historial completo de órdenes del bot.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`[
  {
    "id":         42,
    "type":       "buy",
    "symbol":     "BTCUSDT",
    "quantity":   0.001,
    "price":      63548.12,
    "status":     "filled",
    "created_at": "2026-02-24T16:00:00.000Z",
    "filled_at":  "2026-02-24T16:00:01.000Z"
  }
]`} />
            </Endpoint>

            <Endpoint method="GET" path="/api/trading/positions" auth="X-API-Token" description="Lista las posiciones abiertas actuales del bot.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`[
  {
    "id":              1,
    "symbol":          "BTCUSDT",
    "quantity":        0.001,
    "avg_entry_price": 63548.12,
    "created_at":      "2026-02-24T16:00:00.000Z"
  }
]`} />
            </Endpoint>

            <Endpoint method="DELETE" path="/api/trading/orders/:id" auth="X-API-Token" description="Cancela una orden en estado 'open'. No se pueden cancelar órdenes ya ejecutadas.">
              <h4 className="font-mono text-xs text-gray-500 uppercase mt-4 mb-2">Response 200</h4>
              <CodeBlock lang="json" code={`{ "message": "Order cancelled" }`} />
            </Endpoint>
          </Section>

          {/* 08 Errors */}
          <Section id="errors" title="Códigos de Error">
            <div className="cyber-card p-6">
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="border-b border-cyber-border">
                      {['Código', 'Causa', 'Solución'].map(h => (
                        <th key={h} className="text-left text-xs text-gray-500 uppercase p-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['400', 'Parámetros inválidos o faltantes', 'Revisa el body de la petición'],
                      ['401 (JWT)', 'Token JWT ausente o expirado', 'Vuelve a hacer login y usa el nuevo token'],
                      ['401 (API)', 'X-API-Token inválido o ausente', 'Revisa el API Token en el Dashboard'],
                      ['403', 'Sin permisos para el recurso', 'El bot no pertenece a tu cuenta'],
                      ['404', 'Recurso no encontrado', 'Verifica el ID del bot/orden'],
                      ['409', 'Conflicto (usuario/email duplicado)', 'El email o username ya existe'],
                      ['422', 'Saldo insuficiente', 'El bot no tiene suficiente balance para la operación'],
                      ['500', 'Error interno del servidor', 'Contacta con el administrador'],
                    ].map(([code, cause, fix]) => (
                      <tr key={code} className="border-b border-cyber-border hover:bg-white hover:bg-opacity-5">
                        <td className="p-3 text-cyber-pink">{code}</td>
                        <td className="p-3 text-gray-400">{cause}</td>
                        <td className="p-3 text-gray-500 text-xs">{fix}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 border border-cyber-border bg-black bg-opacity-40">
                <p className="font-mono text-xs text-gray-500 mb-2 uppercase tracking-wider">Formato de error estándar</p>
                <CodeBlock lang="json" code={`{
  "error": "Descripción del error"
}`} />
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  )
}
