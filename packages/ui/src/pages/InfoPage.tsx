import { AppHeader } from '../components/AppHeader.js'
import { SiteFooter } from '../components/SiteFooter.js'

export function InfoPage({ title, children }: { title: string; children: string }) {
  return <div className="flex min-h-svh flex-col bg-[#fbfaf5] text-stone-900"><AppHeader /><main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-8"><h1 className="font-serif text-4xl font-semibold text-emerald-950">{title}</h1><p className="mt-6 max-w-2xl leading-8 text-stone-600">{children}</p></main><SiteFooter /></div>
}
