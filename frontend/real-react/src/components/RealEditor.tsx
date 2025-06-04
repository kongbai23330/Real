"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { EditorState, Compartment } from "@codemirror/state"
import {
  EditorView, keymap, drawSelection,
  highlightActiveLine
} from "@codemirror/view"
import { basicSetup } from "codemirror"
import { defaultKeymap } from "@codemirror/commands"
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { foldGutter, foldKeymap,foldService } from "@codemirror/language"
import { Button } from "@/components/ui/button"
import { autocompletion, CompletionContext } from "@codemirror/autocomplete";
import { raHighlight, raStyle } from "./raHighlight.ts"

/* Font & spacing */
const bareTheme = EditorView.baseTheme({
  ".cm-content": { fontSize:"16px", fontFamily:"monospace", padding:"4px 0" },
  ".cm-editor" : { outline:"none" },
})
const foldingTheme = EditorView.baseTheme({
  ".cm-foldGutter": {
    width: "16px",                 // 整个折叠区域宽度（和行号一致）
  },
  ".cm-foldGutter .cm-gutterElement": {
    padding: "0 2px",              // 左右留白更紧凑
    textAlign: "center",           // 居中图标
    fontSize: "13px",              // 图标更协调
    lineHeight: "1.2",             // 行高更自然
    cursor: "pointer",             // 鼠标变小手
    color: "#666",                 // 更柔和一点的颜色
    userSelect: "none",           // 防止误选中图标
  },
  ".cm-gutterElement.cm-foldPlaceholder": {
    color: "#aaa",
    fontStyle: "italic",
  }
})
const dotCommands = [
  ".help", ".syntax", ".tables", ".views", ".quit", ".tree",
  ".eval", ".add", ".drop", ".load", ".save"
];
const raOperators = [
  "<S>", "<P>", "<R>", "<E>", "<X>", "<U>", "<D>", "<I>"
];
function raCompletion(context: CompletionContext) {
  const word = context.matchBefore(/\S+/)
  if (!word || (word.from == word.to && !context.explicit)) return null

  const keywords = [...dotCommands, ...raOperators]

  return {
    from: word.from,
    options: keywords.map(k => ({ label: k, type: "keyword" })),
    validFor: /^\S*$/
  }
}

function blockFold(state: EditorState, startLine: number) {
  const start = state.doc.lineAt(startLine)
  if (start.text.trim() === "") return null

  let endLine = start.number
  while (endLine < state.doc.lines) {
    const next = state.doc.line(endLine + 1)
    if (next.text.trim() === "") break
    endLine++
  }

  // 至少 2 行才折叠
  if (endLine === start.number) return null

  const end = state.doc.line(endLine)
  return { from: start.to, to: end.to }
}


type Props = { value:string; onChange:(v:string)=>void; className?:string }

export default function RealEditor({ value, onChange, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView|null>(null)

  // ✅ Compartment to control hiding line numbers via theme
  const lineNumberStyleComp = useRef(new Compartment()).current
  const [showLineNr, setShowLineNr] = useState(true)

  useEffect(() => {
    if (!hostRef.current) return

    console.log("🧱 Mounting editor (once)")

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        drawSelection(),
        highlightActiveLine(),
        closeBrackets(),  
        raHighlight,
        raStyle,


        foldService.of(blockFold),
        autocompletion({ override: [raCompletion] }),


        keymap.of([...defaultKeymap, ...closeBracketsKeymap, ...foldKeymap]),
    
        lineNumberStyleComp.of(
          showLineNr
            ? []
            : EditorView.theme({
                ".cm-gutter.cm-lineNumbers": {
                  display: "none !important"
                }
              })
        ),
    
        EditorView.updateListener.of(v => {
          if (v.docChanged) onChange(v.state.doc.toString())
        }),
    
        bareTheme,
        foldingTheme // ✅ 加在最后，确保样式覆盖
      ],
    })
    

    viewRef.current = new EditorView({ state, parent: hostRef.current })

    return () => viewRef.current?.destroy()
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const cur = view.state.doc.toString()
    if (cur !== value) {
      view.dispatch({ changes: { from: 0, to: cur.length, insert: value } })
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
        effects: lineNumberStyleComp.reconfigure(
          next
            ? []
            : EditorView.theme({
                ".cm-gutter.cm-lineNumbers": {
                  display: "none !important"
                }
              })
        )
      })

      console.groupEnd()
      return next
    })
  }

  return (
    <div className="space-y-2">
      <Button onClick={toggleLineNumbers}>
        {showLineNr ? "Hide line numbers" : "Show line numbers"}
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
