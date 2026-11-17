import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { parseFiltersWithAi } from '../api/users';

const EXAMPLES = [
  'users from Pune who signed up last month and never logged in',
  'active users in Delhi with revenue above 50000',
  'banned users who joined this year',
];

function AiFilterBox({ onApply }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (query) => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setMessage('');
    try {
      const filters = await parseFiltersWithAi(q);
      if (Object.keys(filters).length === 0) {
        setMessage('Could not find any filter in that request. Try rephrasing.');
      } else {
        onApply(filters);
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500"
          />
          <input
            className="w-full rounded-md border border-brand-200 bg-white py-2 pl-9 pr-3 text-sm"
            placeholder="Ask in plain language, e.g. active users from Delhi who never logged in"
            value={text}
            maxLength={300}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run(text)}
          />
        </div>
        <button className="ai-btn" disabled={loading} onClick={() => run(text)}>
          {loading ? 'Thinking...' : 'Apply with AI'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            className="example-chip"
            onClick={() => {
              setText(example);
              run(example);
            }}
          >
            {example}
          </button>
        ))}
      </div>

      {message && <p className="mt-2 text-sm text-rose-600">{message}</p>}
    </div>
  );
}

export default AiFilterBox;