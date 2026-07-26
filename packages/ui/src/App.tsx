const SEATS = [
  { wind: 'N', className: 'row-start-1 col-start-2 justify-self-center' },
  { wind: 'W', className: 'row-start-2 col-start-1 justify-self-center' },
  { wind: 'E', className: 'row-start-2 col-start-3 justify-self-center' },
  { wind: 'S', className: 'row-start-3 col-start-2 justify-self-center' },
] as const

function App() {
  return (
    <div className="min-h-svh bg-neutral-900 text-neutral-100 flex flex-col">
      <header className="px-4 py-3 border-b border-neutral-700">
        <h1 className="text-xl font-semibold tracking-tight">MCR Mahjong Trainer</h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div
          data-testid="board"
          className="grid grid-cols-3 grid-rows-3 gap-4 w-full max-w-xl aspect-square"
        >
          {SEATS.map(({ wind, className }) => (
            <div
              key={wind}
              className={`${className} w-16 h-16 rounded-full border-2 border-emerald-500 flex items-center justify-center text-2xl font-bold`}
            >
              {wind}
            </div>
          ))}

          <div className="row-start-2 col-start-2 flex flex-col items-center justify-center gap-2 rounded-lg bg-neutral-800 border border-neutral-700">
            <span className="text-sm text-neutral-400">Wall</span>
            <span className="text-2xl font-mono">144</span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
