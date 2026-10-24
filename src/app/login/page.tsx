import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";

interface LoginPageProps {
	searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const { redirect: redirectTo = "/", error } = await searchParams;

	// Already signed in → bounce to the target.
	const user = await getCurrentUser();
	if (user) redirect(redirectTo);

	return (
		<div className="min-h-screen w-full bg-bg flex flex-col items-center justify-center px-6 py-12 relative">
			<Link
				href="/"
				className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs text-fg-secondary bg-surface/60 border border-border hover:bg-surface-hover hover:text-fg px-3.5 py-2 rounded-lg transition-all"
			>
				<ArrowLeft className="w-3.5 h-3.5" />
				<span>Back to Home</span>
			</Link>

			{error && (
				<div className="w-full max-w-md mb-5 flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
					<AlertCircle className="w-4 h-4 flex-none mt-0.5" />
					<span>{error}</span>
				</div>
			)}

			<AuthForm redirect={redirectTo} />
		</div>
	);
}
