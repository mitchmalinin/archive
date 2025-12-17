'use client'

import { useUIStore } from '@/stores/uiStore'
import { useCallback, useRef } from 'react'

// Sound file paths
const SOUNDS = {
  buttonPress: '/sounds/keyboard.mp3',
  receiptPrinting: '/sounds/recepit-printing.mp3',
  tear: '/sounds/tear.m4a',
} as const

type SoundName = keyof typeof SOUNDS

export function useSound() {
  const isMuted = useUIStore((state) => state.isMuted)
  const audioRefs = useRef<Map<SoundName, HTMLAudioElement>>(new Map())

  const getAudio = useCallback((name: SoundName): HTMLAudioElement => {
    let audio = audioRefs.current.get(name)
    if (!audio) {
      audio = new Audio(SOUNDS[name])
      audioRefs.current.set(name, audio)
    }
    return audio
  }, [])

  const play = useCallback(
    (name: SoundName, maxDuration?: number) => {
      if (isMuted) return

      const audio = getAudio(name)
      // Reset to start if already playing
      audio.currentTime = 0
      audio.play().catch(() => {
        // Ignore autoplay errors
      })

      // Stop after max duration if specified
      if (maxDuration) {
        setTimeout(() => {
          audio.pause()
          audio.currentTime = 0
        }, maxDuration)
      }
    },
    [isMuted, getAudio]
  )

  const stop = useCallback((name: SoundName) => {
    const audio = audioRefs.current.get(name)
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  return {
    playButtonPress: useCallback(() => play('buttonPress'), [play]),
    playReceiptPrinting: useCallback(() => play('receiptPrinting', 2600), [play]), // Stop after 2.6s
    stopReceiptPrinting: useCallback(() => stop('receiptPrinting'), [stop]),
    playReceiptTear: useCallback(() => play('tear'), [play]),
  }
}
