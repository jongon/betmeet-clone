import { notFound } from "next/navigation";
import { EmptyState } from "@/components/admin/empty-state";
import { AdminNavLink } from "@/components/admin/nav-link";
import { SessionDecisionActions } from "@/components/admin/session-decision-actions";
import { SessionStatusBadge } from "@/components/admin/session-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildAdminBlockDetail,
  buildAdminProposalOverview,
  canAdminDecideSession,
  formatAdminSessionDate,
  getAdminSessionBackHref,
  getAdminSessionBackLabel,
  isAdminSessionReadOnly,
} from "@/lib/admin-session-detail";
import { ALL_TYPE_LABEL } from "@/lib/exchange-settings";
import { getSessionById } from "@/lib/sessions-store";
import { getAdminEmail } from "@/lib/supabase/server";

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  void (await getAdminEmail());

  const { id } = await params;
  const session = await getSessionById(id);

  if (!session) {
    notFound();
  }

  const proposal = session.proposal;
  const canDecide = canAdminDecideSession(session);
  const isReadOnly = isAdminSessionReadOnly(session);
  const backHref = getAdminSessionBackHref(session);
  const backLabel = getAdminSessionBackLabel(session);
  const overview = proposal ? buildAdminProposalOverview(proposal) : null;

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 px-4 py-10 pb-28 md:pb-10">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <AdminNavLink href={backHref}>{backLabel}</AdminNavLink>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl tracking-tight text-foreground">
                  Propuesta de {session.cambiadorName}
                </h1>
                <SessionStatusBadge session={session} />
                {proposal ? (
                  <span className="inline-flex h-6 items-center rounded-full border border-border px-2.5 text-xs font-medium text-muted-foreground">
                    {proposal.status === "pending" ? "Pendiente" : "Borrador"}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                Creada el {formatAdminSessionDate(session.createdAt)}
              </p>
              <p className="text-sm text-muted-foreground">
                {session.archivedAt
                  ? "Esta sesión pertenece al historial archivado y solo puede consultarse."
                  : isReadOnly
                    ? "La sesión ya fue cerrada. Puedes revisar la propuesta, pero no cambiar la decisión."
                    : "Revisa el intercambio completo antes de aprobarlo o rechazarlo."}
              </p>
            </div>
          </div>

          {canDecide ? (
            <div className="hidden md:flex md:shrink-0">
              <SessionDecisionActions
                sessionId={session.id}
                cambiadorName={session.cambiadorName}
                acceptRedirectTo="/admin"
              />
            </div>
          ) : null}
        </div>
      </header>

      {!proposal ? (
        <section className="space-y-4">
          <EmptyState
            title="Sin propuesta guardada"
            description="Esta sesión todavía no tiene una propuesta persistida para revisar."
          />
          <div className="flex justify-center">
            <AdminNavLink href={backHref}>{backLabel}</AdminNavLink>
          </div>
        </section>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Balance del intercambio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`rounded-xl border p-4 ${
                  overview?.balance.isExact
                    ? "border-chart-4/35 bg-chart-4/8 text-foreground"
                    : "border-destructive/30 bg-destructive/5 text-foreground"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span>
                    Recibe el coleccionista: <strong>{overview?.balance.offeredUnits}</strong>
                  </span>
                  <span>
                    Recibe el cambiador: <strong>{overview?.balance.requestedUnits}</strong>
                  </span>
                  <span>
                    Delta: <strong>{overview?.balance.delta}</strong>
                  </span>
                </div>
                <p className="mt-2 text-sm">{overview?.balanceReason}</p>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recibe el coleccionista</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {proposal.blocks.map((block) => (
                    <li
                      key={block.requestedStickerCode}
                      className="rounded-xl border border-border bg-background px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {block.requestedStickerCode}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {block.requestedStickerLabel} ·{" "}
                            {ALL_TYPE_LABEL[block.requestedStickerType]}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">1 unidad</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recibe el cambiador</CardTitle>
              </CardHeader>
              <CardContent>
                {overview && overview.requestedRepeateds.length > 0 ? (
                  <ul className="space-y-3">
                    {overview.requestedRepeateds.map((item) => (
                      <li
                        key={item.stickerCode}
                        className="rounded-xl border border-border bg-background px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{item.stickerCode}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.label} · {ALL_TYPE_LABEL[item.type]}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Esta propuesta no pide repetidos del coleccionista.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="font-display text-2xl tracking-tight text-foreground">
                Detalle por bloque
              </h2>
              <p className="text-sm text-muted-foreground">
                Regla aplicada, decisión del cambiador y contenido final de cada bloque.
              </p>
            </div>

            <ul className="space-y-4">
              {proposal.blocks.map((block) => {
                const detail = buildAdminBlockDetail(block);

                return (
                  <li key={block.requestedStickerCode}>
                    <Card size="sm">
                      <CardHeader className="gap-2 sm:flex sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <CardTitle>{block.requestedStickerCode}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {block.requestedStickerLabel} ·{" "}
                            {ALL_TYPE_LABEL[block.requestedStickerType]}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-6 items-center rounded-full border border-border px-2.5 text-xs font-medium text-muted-foreground">
                            {block.rule.label}
                          </span>
                          <span className="inline-flex h-6 items-center rounded-full border border-border px-2.5 text-xs font-medium text-foreground">
                            {block.modeLabel}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Regla visible
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {detail.ruleOptions.map((option) => (
                              <span
                                key={`${block.requestedStickerCode}-${option}`}
                                className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground"
                              >
                                {option}
                              </span>
                            ))}
                          </div>
                        </div>

                        {block.mode === "counteroffer" ? (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                Contraoferta final
                              </p>
                              {detail.counterofferOffers.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {detail.counterofferOffers.map((offer) => (
                                    <span
                                      key={`${block.requestedStickerCode}-${offer}`}
                                      className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground"
                                    >
                                      {offer}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No ofrece cantidades abstractas en esta contraoferta.
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                Cromos exactos
                              </p>
                              {detail.exactStickerSummaries.length > 0 ? (
                                <ul className="space-y-2">
                                  {detail.exactStickerSummaries.map((item) => (
                                    <li
                                      key={`${block.requestedStickerCode}-${item.stickerCode}`}
                                      className="rounded-xl border border-border bg-background px-3 py-2"
                                    >
                                      <p className="font-medium text-foreground">
                                        {item.stickerCode}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {item.label} · {ALL_TYPE_LABEL[item.type]}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No añadió cromos exactos en esta contraoferta.
                                </p>
                              )}
                            </div>

                            {block.counteroffer?.note ? (
                              <div className="space-y-1">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                  Nota del cambiador
                                </p>
                                <p className="text-sm text-foreground">{block.counteroffer.note}</p>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                              Cumple la regla con
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {block.fulfillRequirements.map((requirement) => (
                                <span
                                  key={`${block.requestedStickerCode}-${requirement.offerType}`}
                                  className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground"
                                >
                                  {requirement.quantity} {ALL_TYPE_LABEL[requirement.offerType]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {canDecide ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="mx-auto max-w-5xl">
            <SessionDecisionActions
              sessionId={session.id}
              cambiadorName={session.cambiadorName}
              acceptRedirectTo="/admin"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
