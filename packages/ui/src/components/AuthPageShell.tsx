import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader.js'
import { SiteFooter } from './SiteFooter.js'

export function AuthPageShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <div className="flex min-h-svh flex-col bg-[#fbfaf5] text-stone-900"><AppHeader /><main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12"><div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-lg shadow-emerald-950/5 sm:p-8"><h1 className="font-serif text-4xl font-semibold text-emerald-950">{title}</h1><p className="mt-3 leading-7 text-stone-600">{intro}</p>{children}</div></main><SiteFooter /></div>
}

export const INPUT_CLASS = 'mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20'
export const PRIMARY_BUTTON_CLASS = 'min-h-12 w-full rounded-xl bg-emerald-900 px-5 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50'
