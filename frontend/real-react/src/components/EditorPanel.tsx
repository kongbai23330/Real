// src/components/EditorPanel.tsx
import { useState } from "react"
import { Button }   from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const ENDPOINT = "http://localhost:8080/api/query"

const EditorPanel = ({ onRefreshTables }: { onRefreshTables?: () => void }) => {
  const [expr, setExpr] = useState("")
  const [output, setOutput] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function runQuery() {
    if (!expr.trim()) return
    setLoading(true); setError(undefined); setOutput(undefined)

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: expr })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      setOutput(text)

      // ✅ 查询成功后，刷新表结构
      onRefreshTables?.()
    } catch (e: any) {
      setError(e.message ?? "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex-1 p-4 bg-white border border-gray-200">
      <h2 className="text-lg font-semibold mb-2">Query Editor</h2>

      <Textarea
        placeholder="Write your relational-algebra query here..."
        className="h-64"
        value={expr}
        onChange={e => setExpr(e.target.value)}
      />

      <Button
        className="mt-4"
        variant="default"
        disabled={loading}
        onClick={runQuery}
      >
        {loading ? "Running…" : "Execute Query"}
      </Button>

      {error && (
        <pre className="mt-4 p-3 bg-red-50 text-red-600 rounded border">
          {error}
        </pre>
      )}

      {output !== undefined && !error && (
        <pre className="mt-4 p-3 bg-gray-50 rounded border whitespace-pre-wrap">
          {output}
        </pre>
      )}
    </section>
  )
}

export default EditorPanel
