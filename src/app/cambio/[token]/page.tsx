import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCambiadorId, getCambioSessionId } from "@/lib/cambiador-identity";
import { buildCambioEntryState, type CambioEntryState } from "@/lib/cambio-entry";
import { buildRequestedStickers } from "@/lib/cambio-proposal";
import { getExchangeSettings } from "@/lib/exchange-settings-store";
import { getMissingInventory } from "@/lib/missing-store";
import { getToken } from "@/lib/qr-store";
import { getSessionById, resolveByTokenAndCambiadorId } from "@/lib/sessions-store";
import { NameForm } from "./name-form";
import { ProposalWizard } from "./proposal-wizard";

type PageProps = {
  params: Promise<{ token: string }>;
};

async function resolveViewState(token: string): Promise<CambioEntryState> {
  const qrToken = await getToken(token);
  const cookieStore = await cookies();
  const cambiadorId = getCambiadorId(cookieStore);
  const sessionResolutionByIdentity = cambiadorId
    ? await resolveByTokenAndCambiadorId(token, cambiadorId)
    : { kind: "none" as const };
  const sessionId = getCambioSessionId(cookieStore, token);
  const sessionByCookie = sessionId ? await getSessionById(sessionId) : null;
  const sessionResolution =
    sessionResolutionByIdentity.kind !== "none"
      ? sessionResolutionByIdentity
      : sessionByCookie && sessionByCookie.token === token && sessionByCookie.status === "open"
        ? { kind: "open" as const, session: sessionByCookie }
        : { kind: "none" as const };

  return buildCambioEntryState({
    token,
    hasActiveToken: Boolean(qrToken && qrToken.revokedAt === null),
    sessionResolution,
  });
}

function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Volver al inicio
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function CambioTokenPage({ params }: PageProps) {
  const { token } = await params;
  if (!token) notFound();

  const state = await resolveViewState(token);
  const qrToken = await getToken(token);

  const openSession = state.kind === "resume" ? await getSessionById(state.sessionId) : null;

  const exchangeSettings = qrToken ? await getExchangeSettings(qrToken.ownerEmail) : null;
  const missingInventory = qrToken ? await getMissingInventory(qrToken.ownerEmail) : null;
  const requestedStickers = missingInventory
    ? buildRequestedStickers(Object.keys(missingInventory.items))
    : [];

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Intercambio de cromos
        </h1>
        <p className="text-sm text-muted-foreground">Token: {token}</p>
      </header>

      {state.kind === "invalid-token" ? (
        <ErrorState
          title="QR invalido"
          description="El formato del codigo no es correcto. Escanea nuevamente el QR del coleccionista."
        />
      ) : null}

      {state.kind === "revoked-token" ? (
        <ErrorState
          title="QR no disponible"
          description="Este QR ya no esta activo. Pide al coleccionista generar uno nuevo."
        />
      ) : null}

      {state.kind === "closed-session" ? (
        <ErrorState
          title="Sesion cerrada"
          description="Ya existe una sesion cerrada para este QR en este dispositivo. Pide un QR nuevo para continuar."
        />
      ) : null}

      {state.kind === "resume" ? (
        openSession && exchangeSettings ? (
          <ProposalWizard
            token={token}
            sessionId={openSession.id}
            cambiadorName={state.cambiadorName}
            requestedStickers={requestedStickers}
            initialProposal={openSession.proposal ?? null}
            globalSettings={exchangeSettings.global}
            overrides={exchangeSettings.overrides}
          />
        ) : null
      ) : null}

      {state.kind === "create" ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Ingresa a la sesion</CardTitle>
            <CardDescription>
              Escribe tu nombre para crear la sesion. Puedes enviar con Enter o con el boton
              Aceptar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NameForm token={token} />
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
