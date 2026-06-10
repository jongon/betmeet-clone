import { Separator } from "@/components/ui/separator";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Liga Mundial 2026</h1>
          <p className="text-sm text-muted-foreground">Predicciones del FIFA World Cup</p>
        </div>
        <Separator />
        {children}
      </div>
    </div>
  );
}
