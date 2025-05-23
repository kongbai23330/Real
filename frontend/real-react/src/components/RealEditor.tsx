// src/components/RealEditor.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { EditorState, Compartment } from "@codemirror/state"
import {
  EditorView, keymap, drawSelection,
  highlightActiveLine, lineNumbers
} from "@codemirror/view"
import { basicSetup } from "codemirror"
import { defaultKeymap }           from "@codemirror/commands"
import { closeBracketsKeymap }     from "@codemirror/autocomplete"
import { foldGutter, foldKeymap }  from "@codemirror/language"
import { Button }                  from "@/components/ui/button"

/* 仅做字体/间距 */
const bareTheme = EditorView.baseTheme({
  ".cm-content": { fontSize:"16px", fontFamily:"monospace", padding:"4px 0" },
  ".cm-editor" : { outline:"none" },
})

type Props = { value:string; onChange:(v:string)=>void; className?:string }

export default function RealEditor({ value, onChange, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView|null>(null)


  const gutterThemeComp = useRef(new Compartment()).current

  const [showLineNr, setShowLineNr] = useState(true)

 
  useEffect(() => {
    if (!hostRef.current) {                       
      console.warn("🚫 hostRef.current is empty, waiting for next effect")
      return
    }

    console.log("🧱 Mounting editor (once)")
    const hideGutterTheme = EditorView.theme({
      ".cm-gutters": { display: "none" }
    });
    const state = EditorState.create({
      doc : value,
      extensions: [
        basicSetup,
        drawSelection(),
        highlightActiveLine(),
        lineNumbers(),   
        keymap.of([...defaultKeymap, ...closeBracketsKeymap, ...foldKeymap]),
        foldGutter(),
        gutterThemeComp.of(
                 showLineNr ? [] : EditorView.theme({ ".cm-lineNumbers": { display:"none"} })
                ),
        EditorView.updateListener.of(v => {
          if (v.docChanged) {
            console.log("✏️ Text changes")
            onChange(v.state.doc.toString())
          }
        }),
        bareTheme,
      ],
    })

    viewRef.current = new EditorView({ state, parent: hostRef.current })

    return () => {
      console.log("🧼 Destroying editor")
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [])               


  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const cur = view.state.doc.toString()
    if (cur !== value) {
      console.log("🔄 外部 value 改变 -> 同步到编辑器")
      view.dispatch({ changes:{ from:0, to:cur.length, insert:value } })
    }
  }, [value])


  const toggleLineNumbers = () => {
    const view = viewRef.current
    if (!view) return

    console.group("📌 Toggle line number button click")
    setShowLineNr(prev => {
      const next = !prev
      console.log("Currently showLineNr =", prev, "=> update to", next)

      view.dispatch({
        effects: gutterThemeComp.reconfigure(
                  next ? [] : EditorView.theme({ ".cm-gutters": { display:"none"} })
                )
      })
      console.groupEnd()
      return next
    })
  }

  /* ---------- UI ---------- */
  return (
    <div className="space-y-2">
      <Button onClick={toggleLineNumbers}>
        {showLineNr ? "Hide line numbers" : "Show line number"}
      </Button>

      <div
        ref={hostRef}
        className={cn(
          "w-full min-h-[200px] rounded-md border border-gray-300 bg-white",
          "px-4 py-3 shadow-sm focus-visible:outline-none",
          className
        )}
      />
    </div>
  )
}