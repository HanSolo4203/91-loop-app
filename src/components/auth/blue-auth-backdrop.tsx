/** Shared blue gradient + floating bokeh used on login and kiosk PIN screens. */
export function BlueAuthBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {/* Bokeh circles */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-32 right-20 w-24 h-24 bg-cyan-300/30 rounded-full blur-lg animate-bounce" />
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-300/15 rounded-full blur-2xl animate-pulse" />
        <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-cyan-400/25 rounded-full blur-lg animate-bounce" />
        <div className="absolute top-1/2 left-1/3 w-36 h-36 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-cyan-200/30 rounded-full blur-md animate-bounce" />

        {/* Moving particles */}
        <div className="absolute top-20 left-1/2 w-2 h-2 bg-white/40 rounded-full animate-ping" />
        <div className="absolute top-40 right-1/3 w-1 h-1 bg-cyan-300/60 rounded-full animate-ping" />
        <div className="absolute bottom-32 left-1/5 w-3 h-3 bg-blue-200/50 rounded-full animate-ping" />
        <div className="absolute bottom-60 right-1/5 w-2 h-2 bg-white/30 rounded-full animate-ping" />
      </div>
    </>
  );
}
