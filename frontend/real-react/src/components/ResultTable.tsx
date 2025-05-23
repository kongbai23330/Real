// src/components/ResultTable.tsx
import { Card, CardContent } from "@/components/ui/card"

const ResultTable = () => {
  return (
    <section className="p-4 bg-white flex-1 overflow-auto">
    
      <h2 className="text-lg font-semibold mb-4">Query Results</h2>

   
      <Card className="border  border-gray-300">
        <CardContent className="p-6 text-center text-sm text-gray-500">
          No results to display yet...
        </CardContent>
      </Card>
    </section>
  )
}

export default ResultTable
