import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";


interface RepoStatus {
  content: string | null;
}

const RepoHealth = () => {
  const [status, setStatus] = useState<RepoStatus>({ content: null });
  const [docs, setDocs] = useState<any>(null);
  const [mdFiles, setMdFiles] = useState<{name:string;content:string}[]>([]);

  useEffect(() => {
    // Fetch STATUS.md
    fetch("/STATUS.md")
      .then((res) => res.text())
      .then((text) => setStatus({ content: text }))
      .catch(console.error);
    // Fetch docs module index
    fetch("/docs/ai/module-doc-index.json")
      .then((res) => res.json())
      .then(setDocs)
      .catch(console.error);

    // Load all markdown files using Vite glob
    const mdGlob = import.meta.glob('../../**/*.md', { query: '?raw', import: 'default' });
    Promise.all(Object.entries(mdGlob).map(async ([path, resolver]) => {
      const content = await (resolver as () => Promise<string>)();
      return { name: path.split('/').pop() || path, content };
    }))
      .then(setMdFiles)
      .catch(console.error);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Repo Health Check</h1>
      <section>
        <h2 className="text-xl font-semibold mt-8">Status.md</h2>
        {status.content ? (
          <ReactMarkdown>{status.content}</ReactMarkdown>
        ) : (
          <p>Loading status...</p>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-8">Module Doc Index</h2>
        {docs ? (
          <div>
            {(docs.rules || []).map((rule:any, idx:number) => (
              <details key={idx} open style={{marginBottom:'0.5rem'}}>
                <summary>{rule.modulePathPattern}</summary>
                <ul>{(rule.requiredDocs||[]).map((doc:string,i:number)=>(<li key={i}>{doc}</li>))}</ul>
              </details>
            ))}
          </div>
        ) : (
          <p>Loading docs...</p>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-8">All Markdown Files</h2>
        {mdFiles.length ? (
          <ul className="space-y-2">{mdFiles.map((file, idx)=>(
            <li key={idx} className="border rounded p-4">
              <strong>{file.name}</strong>: <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">{file.content.slice(0,200)}{file.content.length>200?'...':''}</pre>
            </li>
          ))}</ul>
        ) : (<p>Loading markdown files...</p>)}
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-8">Design System Files</h2>
        <ul>
          <li><code>tailwind.config.js</code></li>
          <li><code>src/styles/globals.css</code></li>
          <li><code>src/components/ui/*</code></li>
        </ul>
      </section>
    </div>
  );
};

export default RepoHealth;
