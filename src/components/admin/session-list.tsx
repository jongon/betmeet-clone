"use client";

import { useMemo, useState } from "react";
import type { Session } from "@/lib/sessions";
import { EmptyState } from "@/components/admin/empty-state";
import { FilterBar, type StatusFilter } from "@/components/admin/filter-bar";
import { SessionRow } from "@/components/admin/session-row";

function filterSessions(
	sessions: ReadonlyArray<Session>,
	name: string,
	status: StatusFilter,
): Session[] {
	const needle = name.trim().toLowerCase();
	return sessions.filter((session) => {
		if (status !== "all" && session.status !== status) return false;
		if (needle && !session.cambiadorName.toLowerCase().includes(needle)) return false;
		return true;
	});
}

export function SessionList({ sessions }: { sessions: ReadonlyArray<Session> }) {
	const [name, setName] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");

	const filtered = useMemo(
		() => filterSessions(sessions, name, status),
		[sessions, name, status],
	);

	const isServerEmpty = sessions.length === 0;
	const hasFilter = name.trim().length > 0 || status !== "all";

	return (
		<section className="space-y-4">
			{!isServerEmpty ? (
				<FilterBar
					name={name}
					onNameChange={setName}
					status={status}
					onStatusChange={setStatus}
				/>
			) : null}

			{isServerEmpty ? (
				<EmptyState
					title="Sin sesiones todavía"
					description="Cuando un cambiador escanee tu QR y ofrezca cromos, verás sus solicitudes aquí."
				/>
			) : filtered.length === 0 ? (
				<EmptyState
					title="Sin resultados"
					description={
						hasFilter
							? "No hay sesiones que coincidan con tu búsqueda. Prueba a quitar filtros."
							: "No hay sesiones en este estado."
					}
				/>
			) : (
				<ul className="flex flex-col gap-3">
					{filtered.map((session) => (
						<SessionRow key={session.id} session={session} />
					))}
				</ul>
			)}
		</section>
	);
}
