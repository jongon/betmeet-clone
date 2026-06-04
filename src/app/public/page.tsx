import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PublicHome() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="font-display text-3xl tracking-tight text-foreground">Zona pública</h1>
        <p className="text-sm text-muted-foreground">
          Acceso para usuarios no autenticados. Aquí vivirán las vistas de intercambio (cambio de
          cromos) y otras pantallas compartidas mediante QR o enlace.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Próximamente</CardTitle>
          <CardDescription>
            Este espacio está reservado. El contenido (por ejemplo, `/cambio/[token]`) se cubrirá en
            futuros changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta página se renderiza sin autenticación — el proxy la omite por construcción al no
          estar incluida en su matcher.
        </CardContent>
      </Card>
    </main>
  );
}
