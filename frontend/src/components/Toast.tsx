import type { FC } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="safelens-toast">
      <CheckCircle2 size={16} className="toast-icon" />
      <span>{message}</span>
    </div>
  );
};
