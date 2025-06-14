interface EmailDisplayProps {
  email: string;
  className?: string;
}

export function EmailDisplay({ email, className }: EmailDisplayProps) {
  return (
    <span className={className}>
      {email}
    </span>
  );
}
