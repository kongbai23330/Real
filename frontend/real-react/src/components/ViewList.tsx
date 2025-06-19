// src/components/ViewList.tsx
import { useEffect } from "react";

export type ViewInfo = {
  name: string;
  definition: string;
};

type Props = {
  views: ViewInfo[];
};

const ViewList = ({ views }: Props) => {
  return (
    <div className="p-4 border-t">
      <h2 className="text-lg font-semibold mb-2">📘 Views</h2>
      {views.length === 0 ? (
        <p className="text-sm text-gray-500">No views defined.</p>
      ) : (
        <ul className="text-sm space-y-1">
          {views.map((v) => (
            <li key={v.name}>
              <strong>{v.name}</strong>: <code>{v.definition}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ViewList;
