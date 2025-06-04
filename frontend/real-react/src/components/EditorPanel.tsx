// src/components/EditorPanel.tsx
"use client"

import { useState } from "react"
import RealEditor     from "@/components/RealEditor"
import { Button }     from "@/components/ui/button"

const ENDPOINT = "http://localhost:8080/api/query"

type Props = { onRefreshTables?: () => void }

export default function EditorPanel({ onRefreshTables }: Props) {
  const [expr,   setExpr]   = useState("")      // 编辑器内容
  const [output, setOutput] = useState<string>()// 查询结果
  const [error,  setError]  = useState<string>()// 错误消息
  const [loading, setLoading] = useState(false)
  function normalizeQuery(input: string): string {
    return input
      .replace(/[＜]/g, "<")
      .replace(/[＞]/g, ">")
      .replace(/[＝]/g, "=")
      .replace(/[，]/g, ",")
      .replace(/[（]/g, "(")
      .replace(/[）]/g, ")")
      .replace(/[【]/g, "[")
      .replace(/[】]/g, "]")
      .replace(/[：]/g, ":")
      .replace(/[；]/g, ";")
  }
  
  /* 发送到后端执行查询 */
  async function runQuery() {
    if (!expr.trim()) return
    setLoading(true); setError(undefined); setOutput(undefined)

    try {
      const cleanedExpr = normalizeQuery(expr)
      const res  = await fetch(ENDPOINT, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ expression: cleanedExpr }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      setOutput(text)
      onRefreshTables?.()                 // 刷新侧边表结构
    } catch (e: any) {
      setError(e.message ?? "Unknown error")
    } finally {
      setLoading(false)
    }
  }
  async function runEvalMode(mode: "set" | "bag" | "off") {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: `.eval ${mode}` }),
      })
      const text = await res.text()
      alert(`Switched to ${mode.toUpperCase()} mode:\n\n${text}`)
    } catch (e: any) {
      alert("Failed to switch mode: " + (e.message ?? e))
    }
  }
  
  function exportQuery() {
    const blob = new Blob([expr], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `query-${new Date().toISOString().slice(0, 10)}.ra`
    a.click()
    URL.revokeObjectURL(url)
  }
  function importQuery() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".ra,.txt"
  
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
  
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        setExpr(text)
      }
      reader.readAsText(file)
    }
  
    input.click()
  }
  
  /* --------------------- UI --------------------- */
  return (
    <section className="flex-1 p-4 bg-white border border-gray-200 rounded-md">
      <h2 className="text-lg font-semibold mb-3">Query&nbsp;Editor</h2>

      {/* ▶ CodeMirror 6 编辑器 */}
      <RealEditor
        value={expr}
        onChange={setExpr}
        className="min-h-[16rem] w-full rounded-md border border-input bg-transparent
                   shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
      />

<div className="mt-4 flex gap-2">
  <Button
    variant="default"
    disabled={loading}
    onClick={runQuery}
  >
    {loading ? "Running…" : "Execute Query"}
  </Button>
  <Button variant="outline" onClick={() => runEvalMode("set")}>Set</Button>
<Button variant="outline" onClick={() => runEvalMode("bag")}>Bag</Button>
<Button variant="outline" onClick={() => runEvalMode("off")}>Off</Button>


  <Button
    variant="outline"
    onClick={exportQuery}
  >
    Export Query
  </Button>
  <Button
    variant="outline"
    onClick={importQuery}
  >
    Import Query
  </Button>
</div>


      {/* 错误消息 */}
      {error && (
        <pre className="mt-4 p-3 bg-red-50 text-red-600 rounded border">
          {error}
        </pre>
      )}

      {/* 查询结果 */}
      {output !== undefined && !error && (
        <pre className="mt-4 p-3 bg-gray-50 rounded border whitespace-pre-wrap">
          {output}
        </pre>
      )}
    </section>
  )
}
