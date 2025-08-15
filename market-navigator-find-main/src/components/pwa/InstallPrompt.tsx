import { useEffect, useState } from "react";
import { Download } from "lucide-react";

// Minimal TS type for the deferred install event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
  }, []);

  if (!visible || !deferred) return null;

  const handleInstall = async () => {
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      // Hide regardless of choice; we don't toast per app policy
      setVisible(false);
      setDeferred(null);
      console.log("[PWA] Install choice:", choice);
    } catch (err) {
      console.warn("[PWA] Install prompt failed:", err);
      setVisible(false);
      setDeferred(null);
    }
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
      <button
        onClick={handleInstall}
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-2 shadow-md hover:bg-blue-700 active:scale-[0.98]"
        aria-label="Add to Home Screen"
      >
        <Download className="h-4 w-4" />
        <span>Add to Home Screen</span>
      </button>
    </div>
  );
};

export default InstallPrompt;
