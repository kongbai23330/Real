import { HighlightStyle } from "@codemirror/language"
import { tags as t } from "@lezer/highlight"
import { StreamLanguage } from "@codemirror/language"
import { syntaxHighlighting } from "@codemirror/language"

export const raStyle = syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: "#c92c2c", fontWeight: "bold" },
      { tag: t.operator, color: "#3b5bdb" },
      { tag: t.string, color: "#2b8a3e" },
      { tag: t.number, color: "#f08c00" },
      { tag: t.variableName, color: "#0b7285" }
    ])
  )

export const raHighlight = StreamLanguage.define({
  token(stream) {
    if (stream.match(/<[^>]+>/)) return "keyword"
    if (stream.match(/->/)) return "operator"
    if (stream.match(/[=<>!]=?|&|\||~/)) return "operator"
    if (stream.match(/'[^\']*'/)) return "string"
    if (stream.match(/[0-9]+/)) return "number"
    if (stream.match(/[A-Za-z_][\w_]*/)) return "variableName"
    stream.next()
    return null
  }
})


