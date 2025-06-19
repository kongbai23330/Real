import { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import EditorPanel from "../components/EditorPanel";
import ResultTable from "../components/ResultTable";
import ViewList from "../components/ViewList";
import type { ViewInfo } from "../components/ViewList";

export type TableInfo = {
  name: string;
  attributes: string[];
};

export type TableData = {
  attributes: string[];
  records: string[][];
};

const MainLayout = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [views, setViews] = useState<ViewInfo[]>([]);
  const [tableData, setTableData] = useState<TableData | undefined>(undefined);

  return (
    <div className="flex flex-col h-screen flex-1 overflow-hidden h-full">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar tables={tables} setTables={setTables} />
        <div className="flex flex-col flex-1 overflow-auto">
          <EditorPanel
            onRefreshTables={() => {

            }}
            onTableResult={setTableData}
          />
          <ResultTable data={tableData} />

        </div>
      </div>
    </div>
  );
};



// ✅ Generic refresh function (call /api/query to execute `.tables`)
const refreshTables = async (
  setTables: React.Dispatch<React.SetStateAction<TableInfo[]>>
) => {
  try {
    const res = await fetch("http://localhost:8080/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression: ".tables" }),
    });

    const text = await res.text();

 
    // Students : { StudentID, Name, Major }
    // Courses  : { CourseCode, Title, CreditHours }
    const lines = text.split("\n").filter((l) => l.includes(":"));
    const parsed = lines.map((line) => {
      const [namePart, attrsPart] = line.split(":");
      const name = namePart.trim();
      const attrs = attrsPart
        .replace(/[{}]/g, "")
        .split(",")
        .map((s) => s.trim());
      return { name, attributes: attrs };
    });

    setTables(parsed);
  } catch (e) {
    console.error("Failed to refresh tables:", e);
  }
};
const refreshViews = async (
  setViews: React.Dispatch<React.SetStateAction<ViewInfo[]>>
) => {
  try {
    const res = await fetch("http://localhost:8080/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const views: ViewInfo[] = await res.json();
    setViews(views);
  } catch (e) {
    console.error("Failed to refresh views:", e);
  }
};

export default MainLayout;