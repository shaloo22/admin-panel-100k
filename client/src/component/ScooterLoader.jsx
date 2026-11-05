function ScooterLoader({ label = 'Loading...' }) {
  return (
    <div role="status" className="flex flex-col items-center gap-1 py-6">
      <div className="scooter-track">
        <div className="scooter">
          <svg width="64" height="40" viewBox="0 0 64 40" fill="none">
            <g className="scooter-body">
              <rect x="13" y="10" width="16" height="5" rx="2.5" fill="#1e293b" />
              <path
                d="M10 27 C10 18 16 16 22 16 L30 16 L34 26 H44 L48 12"
                stroke="#4f46e5"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M48 12 L52 30" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
              <path d="M44 9 H53" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            </g>
            <g className="scooter-wheel">
              <circle cx="14" cy="31" r="7" stroke="#1e293b" strokeWidth="3" />
              <path d="M14 25 V37" stroke="#94a3b8" strokeWidth="2" />
            </g>
            <g className="scooter-wheel">
              <circle cx="52" cy="31" r="7" stroke="#1e293b" strokeWidth="3" />
              <path d="M52 25 V37" stroke="#94a3b8" strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  );
}

export default ScooterLoader;