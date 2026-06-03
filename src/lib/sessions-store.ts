import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SessionsArraySchema, type Session } from "@/lib/sessions";

const DATA_DIR = path.join(process.cwd(), "data");
const RUNTIME_FILE = path.join(DATA_DIR, "sessions.json");
const SEED_FILE = path.join(DATA_DIR, "sessions.seed.json");

async function ensureRuntimeFile(): Promise<void> {
	await mkdir(DATA_DIR, { recursive: true });
	try {
		await readFile(RUNTIME_FILE, "utf8");
	} catch {
		await copyFile(SEED_FILE, RUNTIME_FILE);
	}
}

async function readSessions(): Promise<Session[]> {
	await ensureRuntimeFile();
	const raw = await readFile(RUNTIME_FILE, "utf8");
	const parsed: unknown = JSON.parse(raw);
	return SessionsArraySchema.parse(parsed);
}

async function writeSessions(sessions: Session[]): Promise<void> {
	await ensureRuntimeFile();
	await writeFile(RUNTIME_FILE, JSON.stringify(sessions, null, 2), "utf8");
}

function findSession(sessions: Session[], id: string): Session | undefined {
	return sessions.find((s) => s.id === id);
}

function isOpen(session: Session | undefined): session is Session {
	return session !== undefined && session.status === "open";
}

export async function getAllSessions(): Promise<Session[]> {
	return readSessions();
}

export async function acceptSession(id: string): Promise<void> {
	const sessions = await readSessions();
	const target = findSession(sessions, id);
	if (!isOpen(target)) return;
	const next = sessions.map((s) => (s.id === id ? { ...s, status: "closed" as const } : s));
	await writeSessions(next);
}

export async function rejectSession(id: string): Promise<void> {
	const sessions = await readSessions();
	const target = findSession(sessions, id);
	if (!isOpen(target)) return;
	const next = sessions.map((s) => (s.id === id ? { ...s, status: "closed" as const } : s));
	await writeSessions(next);
}
