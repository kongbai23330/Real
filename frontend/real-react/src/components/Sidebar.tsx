"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card }   from "@/components/ui/card"

type TableInfo = {
  name: string
  attributes: string[]
}

const Sidebar = ({
  tables,
  setTables
}: {
  tables: TableInfo[]
  setTables: React.Dispatch<React.SetStateAction<TableInfo[]>>
}) => {
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)


  const fetchCurrentTables = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: ".tables" })
      })

      const text  = await res.text()
      const lines = text.split("\n").filter(l => l.includes(":"))
      const parsed: TableInfo[] = lines.map(line => {
        const [namePart, attrsPart] = line.split(":")
        const name  = namePart.trim()
        const attrs = attrsPart
          .replace(/[{}]/g, "")
          .split(",")
          .map(s => s.trim())
        return { name, attributes: attrs }
      })

      setTables(parsed)

      /* 
      localStorage.setItem("realide_tables", JSON.stringify(parsed))
      */
    } catch (err) {
      console.error("❌ Failed to fetch tables:", err)
    }
  }


  // useEffect(() => {
  //   const saved = localStorage.getItem("realide_tables")
  //   if (saved) {
  //     try {
  //       const parsed: TableInfo[] = JSON.parse(saved)
  //       setTables(parsed)
  //     } catch (e) {
  //       console.warn("Failed to parse saved tables:", e)
  //     }
  //   }
  // }, [setTables])

  const handleClick = () => inputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    setLoading(true)
    try {
      const res = await fetch("http://localhost:8080/api/load", {
        method: "POST",
        body: formData
      })

      if (!res.ok) throw new Error("Load failed")

     
      await fetchCurrentTables()
    } catch (err) {
      console.error("❌ Load failed:", err)
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = "" 
    }
  }

  /* --------------------- UI --------------------- */
  return (
    <aside className="w-64 bg-background border-r p-4 flex flex-col gap-4">
      <Button onClick={handleClick} className="w-full" disabled={loading}>
        {loading ? "Loading..." : "Load Database"}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Database Tables</h2>
        <ul className="space-y-2 text-sm">
          {tables.length === 0 ? (
            <li className="text-muted-foreground">No tables loaded</li>
          ) : (
            tables.map(t => (
              <li
                key={t.name}
                className="p-2 rounded-md hover:bg-muted cursor-pointer"
              >
                {t.name} ({t.attributes.join(", ")})
              </li>
            ))
          )}
        </ul>
      </Card>
    </aside>
  )
}

export default Sidebar
