// src/components/ResultTable.tsx
import { Card, CardContent } from "@/components/ui/card"
type ResultTableProps = {
  data?: {
    attributes: string[]
    records: string[][]
  }
}

const ResultTable = ({ data }: ResultTableProps) => {
  return (
    <section className="p-4 bg-white flex-1 overflow-auto">
      <h2 className="text-lg font-semibold mb-4">Query Results</h2>

      {!data ? (
        <Card className="border border-gray-300">
          <CardContent className="p-6 text-center text-sm text-gray-500">
            No results to display yet...
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-auto border border-gray-300 rounded">
          <table className="table-auto w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {data.attributes.map((attr, i) => (
                  <th key={i} className="border px-2 py-1 text-left">{attr}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.records.map((row, rIdx) => (
                <tr key={rIdx} className="even:bg-gray-50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="border px-2 py-1">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default ResultTable

