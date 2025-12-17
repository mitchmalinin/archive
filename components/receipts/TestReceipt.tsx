'use client';

export function TestReceipt() {
  return (
    <div className="relative font-mono text-gray-800">
      {/* Paper Background Wrapper */}
      <div className="bg-[#fffdf5] dark:bg-[#e8e8e0] border-b-2 border-dashed border-gray-400 pt-4">

        {/* Main Receipt Content */}
        <div className="p-3 lg:p-4">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-bold text-sm lg:text-base">
                RECEIPT #000000
              </div>
              <div className="text-xs text-gray-500 mt-1">
                WELCOME TO MEME RECEIPTS
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-300 mb-3" />

          {/* Steps */}
          <div className="space-y-2 text-xs lg:text-sm font-mono mb-3">
            <div className="flex items-baseline">
              <span className="opacity-60">1.</span>
              <span className="ml-2">Pick a token</span>
            </div>

            <div className="flex items-baseline">
              <span className="opacity-60">2.</span>
              <span className="ml-2">Receipts print every 30 second candle</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-300 mb-3" />

          {/* Note about low activity tokens */}
          <div className="text-[10px] text-gray-500 text-center italic">
            Note: Tokens with little volume or activity may not generate receipts
          </div>
        </div>

        {/* Footer decorations */}
        <div className="pt-4 pb-2 text-center opacity-50 text-[10px]">
          . . . . . . . . . . . . . . .
        </div>
      </div>

      {/* Torn bottom edge for test receipt */}
      <div className="h-4 torn-edge-bottom relative z-10" />
    </div>
  );
}
