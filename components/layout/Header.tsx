'use client'

interface HeaderProps {
  onToggleDarkMode?: () => void
}

export function Header({ onToggleDarkMode }: HeaderProps) {
  return (
    <header className="bg-black text-white text-[10px] md:text-xs py-2 px-6 flex justify-between items-center font-mono border-b border-gray-800 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <h1 className="uppercase tracking-widest opacity-50 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-500 text-[14px]">
            receipt_long
          </span>
          Meme Receipts
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-green-500 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          LIVE FEED
        </div>
      </div>
    </header>
  )
}
