import { useState, useEffect, useRef } from "react";

interface ShortcutHandlers {
  onRun?: () => void;
  onSubmit?: () => void;
  onFormat?: () => void;
  onNextProblem?: () => void;
  onPrevProblem?: () => void;
}

export function useWorkspaceShortcuts(handlers: ShortcutHandlers) {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mac = /Mac|iPod|iPhone|iPad/.test(navigator.platform) || 
                  /Macintosh/.test(navigator.userAgent);
      setIsMac(mac);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      // Cmd/Ctrl + Enter -> Run Code
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        handlersRef.current.onRun?.();
        return;
      }

      // Cmd/Ctrl + Shift + Enter -> Submit Code
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        handlersRef.current.onSubmit?.();
        return;
      }

      // Cmd/Ctrl + Alt + F or Shift + Alt + F -> Format Code
      if (
        e.altKey &&
        (e.metaKey || e.ctrlKey || e.shiftKey) &&
        (e.key === "f" || e.key === "F")
      ) {
        e.preventDefault();
        handlersRef.current.onFormat?.();
        return;
      }

      // Alt + N or Alt + ArrowRight -> Next Problem
      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.key === "n" || e.key === "N" || e.key === "ArrowRight")
      ) {
        if (!isInput) {
          e.preventDefault();
          handlersRef.current.onNextProblem?.();
        }
        return;
      }

      // Alt + P or Alt + ArrowLeft -> Previous Problem
      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (e.key === "p" || e.key === "P" || e.key === "ArrowLeft")
      ) {
        if (!isInput) {
          e.preventDefault();
          handlersRef.current.onPrevProblem?.();
        }
        return;
      }

      // Shift + ? -> Shortcuts Modal
      if (!isInput && e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isShortcutsOpen,
    setIsShortcutsOpen,
    isMac,
    modKey: isMac ? "⌘" : "Ctrl",
    altKey: isMac ? "⌥" : "Alt",
  };
}
