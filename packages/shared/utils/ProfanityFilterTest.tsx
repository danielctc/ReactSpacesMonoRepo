import React, { useState, useContext } from 'react';
import { isUsernameSafe, normalizeText, PROFANITY_LIST } from './profanityFilter';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';

/**
 * A utility component for administrators to test the profanity filter
 * This component should only be accessible to admin users
 */
const ProfanityFilterTest: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [normalizedText, setNormalizedText] = useState('');
  const { user } = useContext(UserContext);

  // Only admin users should be able to access this page
  const isAdmin = user?.groups?.includes('admin');

  const handleCheck = () => {
    const normalized = normalizeText(inputText);
    setNormalizedText(normalized);

    const isSafe = isUsernameSafe(inputText);
    setResult(isSafe);
  };

  if (!isAdmin) {
    return (
      <div className="p-5">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <div className="font-bold">Access Denied</div>
            <div>This tool is only available to administrators.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-5">Profanity Filter Test Tool</h1>
      <p className="mb-4">
        This tool allows administrators to test username and nickname filtering.
        Enter text below to check if it would be flagged by the profanity filter.
      </p>

      <div className="flex flex-col gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Test Text</span>
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter username or nickname to test"
            className="input input-bordered"
          />
          <label className="label">
            <span className="label-text-alt">Enter text to check against the profanity filter</span>
          </label>
        </div>

        <button className="btn btn-primary" onClick={handleCheck}>
          Check Text
        </button>

        {result !== null && (
          <div className={`alert ${result ? "alert-success" : "alert-error"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              {result ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <div>
              <div className="font-bold">{result ? "Safe" : "Unsafe"}</div>
              <div>
                {result
                  ? "This text passes the profanity filter."
                  : "This text contains or resembles inappropriate content."}
              </div>
            </div>
          </div>
        )}

        {normalizedText && (
          <div className="p-4 bg-base-200 rounded-md border border-base-300">
            <p className="font-bold mb-2">Normalized Text:</p>
            <code className="block p-2 bg-base-300 rounded">{normalizedText}</code>
            <p className="mt-4 text-sm">
              The normalized text above shows how the text is processed before checking
              against the profanity list. This helps catch deliberate character substitutions.
            </p>
          </div>
        )}

        <div className="p-4 mt-4 bg-base-200 rounded-md border border-base-300 max-h-[300px] overflow-y-auto">
          <p className="font-bold mb-2">Current Profanity List:</p>
          <p className="text-sm">
            The filter checks against these terms and their variations:
          </p>
          <code className="block p-2 bg-base-300 rounded whitespace-pre-wrap">
            {PROFANITY_LIST.join(', ')}
          </code>
        </div>
      </div>
    </div>
  );
};

export default ProfanityFilterTest;
