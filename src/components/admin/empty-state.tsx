import { InboxIcon } from "lucide-react";

export function EmptyState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
			<InboxIcon className="size-8 text-muted-foreground" aria-hidden />
			<div className="space-y-1">
				<p className="font-medium text-foreground">{title}</p>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}
