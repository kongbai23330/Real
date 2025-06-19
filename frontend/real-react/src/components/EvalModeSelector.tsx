"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function EvalModeSelector() {
  const [mode, setMode] = useState<"set" | "bag" | "off">("off")


  const applyMode = async (m: "set" | "bag" | "off") => {
    setMode(m)                              
    try {
      await fetch("http://localhost:8080/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: `.eval ${m}` }),
      })
    } catch (_) {
 
    }
  }


  const label =
    mode === "off" ? "Off Mode" : `${mode.charAt(0).toUpperCase()}${mode.slice(1)} Mode`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="relative">
          {label}
          <span
            className="absolute right-2 top-2 w-2 h-2 rounded-full"
            style={{
              backgroundColor:
                mode === "set" ? "green" :
                mode === "bag" ? "blue"  :
                "gray",
            }}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right">
        <DropdownMenuItem onClick={() => applyMode("set")}>Set (去重)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyMode("bag")}>Bag (允许重复)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyMode("off")}>Off (关闭优化)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
