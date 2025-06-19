// src/components/EditorPanel.tsx
"use client"

import { useState } from "react"
import RealEditor     from "@/components/RealEditor"
import { Button }     from "@/components/ui/button"
import EvalModeSelector from "@/components/EvalModeSelector"

const ENDPOINT = "http://localhost:8080/api/query"

type Props = {
  onRefreshTables?: () => void;
  onTableResult?: (data: { attributes: string[]; records: string[][] }) => void;
};


export default function EditorPanel({ onRefreshTables, onTableResult  }: Props) {
  const [expr,   setExpr]   = useState("")      
  const [output, setOutput] = useState<string>()
  const [error,  setError]  = useState<string>()
  const [tableData, setTableData] = useState<{ attributes: string[]; records: string[][] }>()
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
  

  async function runQuery(custom?: string) {
    const raw = (custom ?? expr).trim();
    if (!raw) return;
  
    setLoading(true);
    setError(undefined);
    setOutput(undefined);
  
    try {
      const cleanedExpr = normalizeQuery(raw);
  

      const res = await fetch(ENDPOINT, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ expression: cleanedExpr }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOutput(await res.text());
  
      const resTbl = await fetch("http://localhost:8080/api/query/table", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ expression: cleanedExpr }),
      });
      const json = await resTbl.json();
      setTableData(json);
      onTableResult?.(json);
      onRefreshTables?.();
  
      setExpr(raw);                       
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }
  
  
  async function runQueryForTable() {
    const res = await fetch("http://localhost:8080/api/query/table", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression: expr }),
    })
    const json = await res.json()
    setTableData(json)
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
  
  async function exportQuery() {
    try {
      const res = await fetch("http://localhost:8080/api/export-bundle", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ expression: expr }),   
      });
      if (!res.ok) throw new Error("Export failed");
  
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `real-bundle-${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  }
  
  
  function importQuery() {
    const inp = document.createElement("input");
    inp.type   = "file";
    inp.accept = ".zip";
  
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
  
      const fd = new FormData();
      fd.append("file", file);
  
      try {
        const res = await fetch("http://localhost:8080/api/import-bundle", {
          method: "POST",
          body  : fd,
        });
        if (!res.ok) throw new Error(await res.text());
  
        const ra = await res.text();   
        setExpr(ra);
        await runQuery(ra);            
        onRefreshTables?.();
        alert("Bundle imported!");
      } catch (e) {
        console.error(e);
        alert("Import failed: " + e);
      }
    };
    inp.click();
  }
  

  
  /* --------------------- UI --------------------- */
  return (
    <section className="flex-1 p-4 bg-white border border-gray-200 rounded-md">
      <h2 className="text-lg font-semibold mb-3">Query&nbsp;Editor</h2>

  
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
    onClick={() => runQuery()} 
  >
    {loading ? "Running…" : "Execute Query"}
  </Button>

  <EvalModeSelector />

  <Button variant="outline" onClick={exportQuery}>
    Export Query
  </Button>

  <Button variant="outline" onClick={importQuery}>
    Import Query
  </Button>
</div>




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
