import { AnimatePresence, motion } from 'motion/react'
import type { GameEventAnnouncementData } from './gameEventPresentation.js'

export interface GameEventAnnouncementProps {
  announcement: GameEventAnnouncementData | null
}

export function GameEventAnnouncement({ announcement }: GameEventAnnouncementProps) {
  return (
    <AnimatePresence>
      {announcement && (
        <motion.div
          key={announcement.id}
          role="status"
          aria-live={announcement.kind === 'mahjong' ? 'assertive' : 'polite'}
          data-testid="game-event-announcement"
          data-event-kind={announcement.kind}
          className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center p-4"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.025 }}
          transition={{ duration: announcement.kind === 'mahjong' ? 0.22 : 0.14, ease: 'easeOut' }}
        >
          <div
            className={`min-w-48 rounded-xl border px-7 py-4 text-center shadow-2xl backdrop-blur-sm ${
              announcement.kind === 'mahjong'
                ? 'border-amber-300 bg-neutral-950/95 shadow-amber-400/20'
                : 'border-emerald-300/80 bg-neutral-950/90 shadow-black/50'
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-300">{announcement.actor}</div>
            <div
              className={`mt-1 font-bold tracking-[0.12em] ${
                announcement.kind === 'mahjong' ? 'text-4xl text-amber-300' : 'text-3xl text-emerald-300'
              }`}
            >
              {announcement.title}
            </div>
            <span className="sr-only">{announcement.detail}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
