import type { ReactElement } from "react";
import { Spinner } from "@/components/ui/Loader";
import type { DetailLayoutId } from "@/lib/theme/detail-layouts";

export type DetailSkeletonVariant = DetailLayoutId | "experience";

const PULSE = "animate-pulse bg-surface/50";

function Bar({ className }: { className: string }) {
  return <div className={`${PULSE} ${className}`} />;
}

function Playback({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-[var(--radius-xl)] bg-surface/50 ${className}`}
    >
      <Spinner className="h-10 w-10" />
    </div>
  );
}

function MetaRow({ centered = false }: { centered?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${centered ? "justify-center" : ""}`}>
      <Bar className="h-6 w-14 rounded" />
      <Bar className="h-4 w-24 rounded" />
      <Bar className="h-4 w-16 rounded" />
    </div>
  );
}

function GenreRow({ centered = false }: { centered?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-2 ${centered ? "justify-center" : ""}`}>
      {[0, 1, 2].map((index) => (
        <Bar key={index} className="h-6 w-20 rounded-full" />
      ))}
    </div>
  );
}

function ActionRow({ centered = false }: { centered?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${centered ? "justify-center" : ""}`}>
      <Bar className="h-11 w-32 rounded-lg" />
      <Bar className="h-11 w-28 rounded-lg" />
      <Bar className="h-11 w-10 rounded-lg" />
    </div>
  );
}

function Overview({ lines = 3, centered = false }: { lines?: number; centered?: boolean }) {
  return (
    <div className={`w-full max-w-2xl space-y-2 ${centered ? "mx-auto" : ""}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Bar key={index} className={`h-3.5 rounded ${index === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

function ClassicSkeleton() {
  return (
    <div className="min-h-screen w-full flex-1 bg-bg pb-16">
      <div className="w-full px-3 pt-16 sm:px-6 md:px-12 md:pt-18">
        <Playback />
      </div>
      <div className="px-6 pt-8 md:px-12">
        <Bar className="mb-4 h-11 w-2/3 max-w-md rounded-lg" />
        <div className="mb-6">
          <MetaRow />
        </div>
        <div className="mb-6">
          <GenreRow />
        </div>
        <Overview />
        <div className="mt-6">
          <ActionRow />
        </div>
      </div>
    </div>
  );
}

function StageSkeleton() {
  return (
    <div className="relative min-h-screen w-full flex-1 overflow-x-hidden bg-bg pb-20">
      <div
        className="absolute inset-0 bg-linear-to-b from-surface/40 via-bg/40 to-bg"
        aria-hidden="true"
      />
      <section className="relative z-10 flex min-h-svh items-center pt-[6.5rem] pb-4 max-[640px]:pt-24">
        <div className="mx-auto grid w-full max-w-[92rem] grid-cols-1 items-center gap-0 px-6 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] min-[1100px]:gap-10">
          <div className="flex flex-col items-center gap-3">
            <Bar className="h-2.5 w-40 rounded-full" />
            <Bar className="h-12 w-11/12 rounded-lg" />
            <MetaRow centered />
            <Overview lines={2} centered />
            <ActionRow centered />
          </div>
          <Playback className="mt-10 shadow-[0_40px_90px_-50px_rgba(0,0,0,0.9)] min-[1100px]:mt-0" />
        </div>
      </section>
    </div>
  );
}

function DossierSkeleton() {
  return (
    <div className="min-h-screen w-full flex-1 bg-bg pb-20">
      <div className="mx-auto w-full max-w-[76rem] px-6 pt-[6.25rem]">
        <div className="border-b border-border pb-4">
          <Bar className="h-2.5 w-44 rounded-full" />
          <Bar className="mt-3 h-12 w-3/4 max-w-lg rounded-lg" />
          <Bar className="mt-3 h-4 w-1/2 max-w-md rounded" />
        </div>
        <div className="grid grid-cols-1 gap-8 pt-7 min-[901px]:grid-cols-[minmax(230px,310px)_minmax(0,1fr)] min-[901px]:gap-12">
          <aside className="space-y-5">
            <Bar className="aspect-[2/3] w-full rounded-[var(--radius-xl)]" />
            <div className="grid grid-cols-2 gap-3 border-y border-border py-3">
              <div>
                <Bar className="h-2.5 w-16 rounded" />
                <Bar className="mt-2 h-5 w-10 rounded" />
              </div>
              <div>
                <Bar className="h-2.5 w-12 rounded" />
                <Bar className="mt-2 h-5 w-12 rounded" />
              </div>
            </div>
            <div className="space-y-2.5">
              <Bar className="h-10 w-full rounded-lg" />
              <Bar className="h-10 w-full rounded-lg" />
            </div>
          </aside>
          <article className="space-y-4">
            <MetaRow />
            <GenreRow />
            <Overview lines={4} />
            <Playback />
          </article>
        </div>
      </div>
    </div>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="min-h-screen w-full flex-1 bg-bg pb-20">
      <div className="mx-auto w-full max-w-[84rem] px-6 pt-[7rem]">
        <div className="grid grid-cols-1 gap-4 min-[1101px]:grid-cols-[minmax(0,1fr)_25rem] min-[1101px]:grid-rows-[auto_auto] min-[1101px]:gap-5">
          <div className="min-[1101px]:col-start-1 min-[1101px]:row-span-2 min-[1101px]:row-start-1">
            <Playback className="shadow-[0_40px_90px_-60px_rgba(0,0,0,0.9)]" />
          </div>
          <div className="space-y-4 rounded-[var(--radius-xl)] border border-border bg-card/70 p-6 min-[1101px]:col-start-2 min-[1101px]:row-start-1">
            <Bar className="h-2.5 w-28 rounded-full" />
            <Bar className="h-8 w-10/12 rounded-lg" />
            <MetaRow />
            <div className="grid grid-cols-3 gap-2.5 border-y border-border py-3">
              <div>
                <Bar className="h-2.5 w-12 rounded" />
                <Bar className="mt-2 h-5 w-8 rounded" />
              </div>
              <div>
                <Bar className="h-2.5 w-10 rounded" />
                <Bar className="mt-2 h-5 w-12 rounded" />
              </div>
              <div>
                <Bar className="h-2.5 w-14 rounded" />
                <Bar className="mt-2 h-5 w-8 rounded" />
              </div>
            </div>
            <ActionRow />
          </div>
          <div className="space-y-3 rounded-[var(--radius-xl)] border border-border bg-card/70 p-6 min-[1101px]:col-start-2 min-[1101px]:row-start-2">
            <Bar className="h-4 w-2/3 rounded" />
            <Overview lines={4} />
            <GenreRow />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The clone experiences open on a full-bleed backdrop with the copy over it. */
function ExperienceSkeleton() {
  return (
    <div className="relative min-h-screen w-full flex-1 overflow-hidden bg-bg">
      <div className="absolute inset-0 animate-pulse bg-surface/40" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-linear-to-t from-bg via-bg/55 to-transparent"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[80rem] flex-col justify-end gap-4 px-6 pt-24 pb-16 md:px-10">
        <Bar className="h-2.5 w-36 rounded-full" />
        <Bar className="h-14 w-3/4 max-w-2xl rounded-lg" />
        <MetaRow />
        <Overview />
        <ActionRow />
      </div>
    </div>
  );
}

const SHAPES: Record<DetailSkeletonVariant, () => ReactElement> = {
  classic: ClassicSkeleton,
  stage: StageSkeleton,
  dossier: DossierSkeleton,
  console: ConsoleSkeleton,
  experience: ExperienceSkeleton,
};

export default function DetailSkeleton({ layout }: { layout: DetailSkeletonVariant }) {
  const Shape = SHAPES[layout];
  return (
    <div data-detail-skeleton={layout} className="w-full flex-1">
      <Shape />
    </div>
  );
}
