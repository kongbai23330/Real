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

  /* 发送到后端执行查询 */
  async function runQuery() {
    if (!expr.trim()) return
    setLoading(true); setError(undefined); setOutput(undefined)

    try {
      const res  = await fetch(ENDPOINT, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ expression: expr }),
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

      <Button
        className="mt-4"
        variant="default"
        disabled={loading}
        onClick={runQuery}
      >
        {loading ? "Running…" : "Execute Query"}
      </Button>

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
