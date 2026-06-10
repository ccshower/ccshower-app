export function AppShell({
  children,
  /** Workspace /os/[id] — menos padding vertical */
  operational = false,
}: {
  children: React.ReactNode;
  operational?: boolean;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-cc-canvas">
      <main
        className={`mx-auto w-full max-w-5xl flex-1 px-3 ${
          operational ? "pt-2 pb-5 sm:pt-2.5" : "py-5 sm:py-6"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
