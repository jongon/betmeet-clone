"use client";

import { Bell, Heart, Star, Trophy } from "lucide-react";
import type * as React from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, role, className }: { name: string; role: string; className: string }) {
  return (
    <div className="space-y-2">
      <div className={cn("h-16 w-full rounded-lg border shadow-sm", className)} />
      <div>
        <div className="font-mono text-xs font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{role}</div>
      </div>
    </div>
  );
}

const swatches = [
  { name: "--background", role: "Fondo (crema)", className: "bg-background" },
  { name: "--foreground", role: "Texto", className: "bg-foreground" },
  { name: "--card", role: "Superficie tarjeta", className: "bg-card" },
  { name: "--primary", role: "Azul FIFA", className: "bg-primary" },
  {
    name: "--secondary",
    role: "Superficie azulada",
    className: "bg-secondary",
  },
  { name: "--muted", role: "Atenuado", className: "bg-muted" },
  { name: "--accent", role: "Hover sutil", className: "bg-accent" },
  { name: "--brand", role: "Rojo marca (CTA)", className: "bg-brand" },
  {
    name: "--destructive",
    role: "Rojo error",
    className: "bg-destructive",
  },
  { name: "--border", role: "Bordes", className: "bg-border" },
] as const;

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b pb-8">
        <div className="space-y-2">
          <p className="label-stadium text-xs text-brand">Design System</p>
          <h1 className="text-4xl font-bold tracking-tight text-balance">Cromos Mundial 2026</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Base visual del aplicativo de intercambio de cromos. Usa el toggle para revisar light y
            dark mode.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="space-y-16 py-12">
        {/* Paleta */}
        <Section
          title="Paleta"
          description="Tokens semánticos del tema (oklch). Todos los componentes los consumen."
        >
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
            {swatches.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>
        </Section>

        {/* Tipografía */}
        <Section
          title="Tipografía"
          description="Sora para titulares (display) + Inter para cuerpo."
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="label-stadium text-xs text-muted-foreground">Display · Sora</span>
              <p className="font-display text-5xl font-bold tracking-tight">Aa Bb Cc 2026</p>
              <p className="font-display text-3xl font-semibold">¡Que empiece el Mundial!</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <span className="label-stadium text-xs text-muted-foreground">Cuerpo · Inter</span>
              <p className="max-w-2xl text-base leading-relaxed">
                Colecciona, intercambia y completa tu álbum del Mundial 2026. Encuentra a otros
                coleccionistas y consigue ese cromo que te falta para llenar la página.
              </p>
              <p className="font-mono text-sm text-muted-foreground">mono · 0123456789</p>
            </div>
          </div>
        </Section>

        {/* Componentes */}
        <Section
          title="Componentes"
          description="Galería de componentes base en sus variantes y estados."
        >
          <div className="space-y-10">
            {/* Buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Buttons</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button>Default</Button>
                <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                  Brand CTA
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Favorito">
                  <Heart />
                </Button>
              </div>
            </div>

            {/* Badges */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Badges</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge className="bg-brand text-brand-foreground">
                  <Star /> Estrella
                </Badge>
              </div>
            </div>

            {/* Cromo card */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Card — ejemplo de cromo</h3>
              <Card className="max-w-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="size-5 text-brand" />
                    Lionel Messi
                  </CardTitle>
                  <CardDescription>Argentina · Delantero · #10</CardDescription>
                  <CardAction>
                    <Badge variant="secondary">Repe</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Cromo brillante de la colección oficial. Disponible para intercambio.
                </CardContent>
                <CardFooter className="gap-3">
                  <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                    Proponer cambio
                  </Button>
                  <Button variant="outline">Ver detalle</Button>
                </CardFooter>
              </Card>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Inputs & controles</h3>
              <div className="grid max-w-md gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ds-email">Email</Label>
                  <Input id="ds-email" type="email" placeholder="coleccionista@mundial.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ds-disabled">Deshabilitado</Label>
                  <Input id="ds-disabled" disabled placeholder="No editable" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="ds-switch" defaultChecked />
                  <Label htmlFor="ds-switch">Notificar intercambios</Label>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Tabs</h3>
              <Tabs defaultValue="album" className="max-w-md">
                <TabsList>
                  <TabsTrigger value="album">Álbum</TabsTrigger>
                  <TabsTrigger value="cambios">Cambios</TabsTrigger>
                  <TabsTrigger value="repes">Repes</TabsTrigger>
                </TabsList>
                <TabsContent value="album" className="text-sm text-muted-foreground">
                  Tu progreso del álbum: 320 / 670 cromos.
                </TabsContent>
                <TabsContent value="cambios" className="text-sm text-muted-foreground">
                  Tienes 3 propuestas de intercambio pendientes.
                </TabsContent>
                <TabsContent value="repes" className="text-sm text-muted-foreground">
                  42 cromos repetidos listos para cambiar.
                </TabsContent>
              </Tabs>
            </div>

            {/* Overlays + feedback */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Overlays & feedback</h3>
              <div className="flex flex-wrap items-center gap-3">
                {/* Dialog */}
                <Dialog>
                  <DialogTrigger render={<Button variant="outline" />}>Abrir diálogo</DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar intercambio</DialogTitle>
                      <DialogDescription>
                        Vas a proponer cambiar tu Messi (#10) por un Mbappé (#10). ¿Continuar?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
                      <DialogClose
                        render={
                          <Button className="bg-brand text-brand-foreground hover:bg-brand/90" />
                        }
                      >
                        Confirmar
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" />}>
                    Menú
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Mi colección</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Ver álbum</DropdownMenuItem>
                    <DropdownMenuItem>Mis repes</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">Eliminar cuenta</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Tooltip */}
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="outline" size="icon" aria-label="Info" />}
                  >
                    <Bell />
                  </TooltipTrigger>
                  <TooltipContent>Notificaciones de cambios</TooltipContent>
                </Tooltip>

                {/* Toast */}
                <Button
                  variant="secondary"
                  onClick={() =>
                    toast.success("¡Intercambio propuesto!", {
                      description: "Te avisaremos cuando respondan.",
                    })
                  }
                >
                  Mostrar toast
                </Button>
              </div>
            </div>

            {/* Avatars */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Avatars</h3>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
                  <AvatarFallback>JG</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>M10</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
