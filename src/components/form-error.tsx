interface FormErrorProps {
  messages?: string[];
  id?: string;
}

export function FormError({ messages, id }: FormErrorProps) {
  if (!messages?.length) return null;
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {messages.map((msg, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: error messages have no stable id
        <p key={i}>{msg}</p>
      ))}
    </div>
  );
}
