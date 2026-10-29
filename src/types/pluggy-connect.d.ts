// The Pluggy Connect widget, loaded from its CDN in index.html.
interface PluggyConnectOptions {
  connectToken: string;
  includeSandbox?: boolean;
  /** Item id to reconnect instead of creating a new connection. */
  updateItem?: string;
  onSuccess?: (data: { item: { id: string } }) => void | Promise<void>;
  onError?: (error: { message?: string } | undefined) => void;
}

interface Window {
  PluggyConnect: new (options: PluggyConnectOptions) => { init(): Promise<void> };
}
