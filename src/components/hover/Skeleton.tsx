export default function Skeleton({ className = "" }: { className?: string }) {
	return (
		<span
			aria-hidden
			className={`block rounded-md bg-white/10 motion-safe:animate-pulse ${className}`}
		/>
	);
}
