// src/components/Navbar.tsx
"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const HELP_TEXT = `

.syntax                Show the Relational Algebra grammar accepted by REAL.

.tables                List names and attributes of the base tables in the
                       current database.

.views                 List names and definitions of the views in the current
                       database.

.help [COMMAND]        Show help for COMMAND. Without an explicit COMMAND,
                       the help message for all commands is shown.

.quit                  Exit REAL's command prompt and go back to the shell
                       (unsaved changes are discarded).

.tree [on|off]         Turn parse tree on/off [default: off].
                       With no arguments, the current setting is shown.

.eval [set|bag|off]    Choose query evaluation semantics:
                       - 'set': set semantics (default)
                       - 'bag': bag semantics
                       - 'off': no evaluation

.add TABLE_NAME(ATTR_LIST) : DATA_FILE
                       Create a new base table:
                       - TABLE_NAME is the name of the table;
                       - ATTR_LIST is a comma-separated list of attribute names;
                       - DATA_FILE is the path to a CSV file containing the data.

.drop TABLE_NAME       Delete table or view TABLE_NAME from the schema.

.load PATH             Load the database from a JSON file.

.save [PATH]           Save the current database schema to a JSON file.
`

const Navbar = () => {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-white shadow-md px-4 py-2 flex items-center justify-between border-b border-gray-200">
      <div className="text-xl font-bold text-gray-800">Relational Algebra IDE</div>

      <nav className="space-x-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="text-gray-600 hover:text-blue-600">Help</button>
          </SheetTrigger>

          <SheetContent side="right" className="w-[500px] p-6 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">REAL Help</h2>
            <pre className="whitespace-pre-wrap text-sm text-gray-800">
              {HELP_TEXT}
            </pre>
          </SheetContent>
        </Sheet>
        <a href="#" className="text-gray-600 hover:text-blue-600">Feedback</a>
      </nav>
    </header>
  )
}

export default Navbar
