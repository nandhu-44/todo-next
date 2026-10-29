import { toast } from "sonner";

interface Action { label: string; onClick: () => void }
const opts = (action?: Action) => (action ? { action, duration: 6000 } : undefined);

export const notify = {
  success: (title: string, action?: Action) => toast.success(title, opts(action)),
  error: (title: string) => toast.error(title),
  warning: (title: string) => toast.warning(title),
};
