export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return <img src="/logo.svg" alt="" aria-hidden="true" className={className} />;
}
