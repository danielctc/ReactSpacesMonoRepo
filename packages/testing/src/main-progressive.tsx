// Progressive test - add imports one by one to find the breaking point
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

console.log('Progressive test starting...');
console.log('React version:', React.version);

// Track which imports succeed
interface ImportResult {
  status: 'pending' | 'success' | 'error';
  error: Error | null;
}

interface ImportResults {
  [key: string]: ImportResult;
}

const initialResults: ImportResults = {
  UserProvider: { status: 'pending', error: null },
  FullScreenProvider: { status: 'pending', error: null },
  HeaderAuthLinks: { status: 'pending', error: null },
  WebGLLoader: { status: 'pending', error: null },
  Chat: { status: 'pending', error: null },
};

function ImportStatus({ name, result }: { name: string; result: ImportResult }) {
  const colors = {
    pending: 'bg-yellow-100',
    success: 'bg-green-100',
    error: 'bg-red-100',
  };

  return (
    <div className={`p-2 ${colors[result.status]} rounded-md mb-2`}>
      <p className="font-bold">{name}: {result.status.toUpperCase()}</p>
      {result.error && (
        <p className="text-xs text-red-600 mt-1">
          {result.error.message}
        </p>
      )}
    </div>
  );
}

function App() {
  const [results, setResults] = useState<ImportResults>(initialResults);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const newResults: ImportResults = { ...results };

    // Test 1: UserProvider
    try {
      console.log('Testing UserProvider...');
      const { UserProvider } = await import("@disruptive-spaces/shared/providers/UserProvider");
      newResults.UserProvider = { status: 'success', error: null };
      console.log('UserProvider imported successfully');
    } catch (err) {
      console.error('UserProvider failed:', err);
      newResults.UserProvider = { status: 'error', error: err as Error };
    }
    setResults({ ...newResults });

    // Test 3: FullScreenProvider
    try {
      console.log('Testing FullScreenProvider...');
      const { FullScreenProvider } = await import("@disruptive-spaces/shared/providers/FullScreenProvider");
      newResults.FullScreenProvider = { status: 'success', error: null };
      console.log('FullScreenProvider imported successfully');
    } catch (err) {
      console.error('FullScreenProvider failed:', err);
      newResults.FullScreenProvider = { status: 'error', error: err as Error };
    }
    setResults({ ...newResults });

    // Test 4: HeaderAuthLinks
    try {
      console.log('Testing HeaderAuthLinks...');
      await import("@disruptive-spaces/header-auth-links/src/HeaderAuthLinks");
      newResults.HeaderAuthLinks = { status: 'success', error: null };
      console.log('HeaderAuthLinks imported successfully');
    } catch (err) {
      console.error('HeaderAuthLinks failed:', err);
      newResults.HeaderAuthLinks = { status: 'error', error: err as Error };
    }
    setResults({ ...newResults });

    // Test 5: WebGLLoader
    try {
      console.log('Testing WebGLLoader...');
      await import("@disruptive-spaces/webgl/src/WebGLLoader");
      newResults.WebGLLoader = { status: 'success', error: null };
      console.log('WebGLLoader imported successfully');
    } catch (err) {
      console.error('WebGLLoader failed:', err);
      newResults.WebGLLoader = { status: 'error', error: err as Error };
    }
    setResults({ ...newResults });

    // Test 6: Chat
    try {
      console.log('Testing Chat...');
      await import("@disruptive-spaces/chat/src/Chat");
      newResults.Chat = { status: 'success', error: null };
      console.log('Chat imported successfully');
    } catch (err) {
      console.error('Chat failed:', err);
      newResults.Chat = { status: 'error', error: err as Error };
    }
    setResults({ ...newResults });

    setTesting(false);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Progressive Import Test
      </h1>
      <p className="mb-4">Click the button to test each workspace import:</p>

      <button
        className={`btn btn-primary mb-4 ${testing ? 'loading' : ''}`}
        onClick={runTests}
        disabled={testing}
      >
        Run Import Tests
      </button>

      <div className="flex flex-col gap-2">
        {Object.entries(results).map(([name, result]) => (
          <ImportStatus key={name} name={name} result={result} />
        ))}
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
