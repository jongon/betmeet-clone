import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | undefined;

function readSupabaseEnv() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url) {
		throw new Error(
			"Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Copy .env.example to .env and fill it in.",
		);
	}
	if (!anonKey) {
		throw new Error(
			"Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Copy .env.example to .env and fill it in.",
		);
	}

	return { url, anonKey };
}

export function createSupabaseBrowserClient() {
	if (client) return client;
	const { url, anonKey } = readSupabaseEnv();
	client = createBrowserClient(url, anonKey);
	return client;
}
