"use client";

// Real student quotes, fetched from the API — only admin-approved lines
// ever render. If none exist yet, this renders nothing at all.

import { useEffect, useState } from "react";
import { apiQuotesPublic } from "@/lib/api";

type Quote = { id: string; text: string; name: string; context: string };

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    let alive = true;
    void apiQuotesPublic().then((res) => {
      if (alive && res.ok && Array.isArray(res.data.quotes)) {
        setQuotes((res.data.quotes as Quote[]).slice(0, 3));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div className="quotes">
      {quotes.map((q) => (
        <blockquote key={q.id} className="quote">
          <p>&quot;{q.text}&quot;</p>
          <cite>
            — {q.name.split(" ")[0]}
            {q.context ? ` · ${q.context}` : ""}
          </cite>
        </blockquote>
      ))}
    </div>
  );
}
