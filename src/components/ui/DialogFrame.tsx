"use client";

import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

interface DialogFrameProps extends Pick<ComponentPropsWithoutRef<"div">, "aria-describedby" | "id"> {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
}

type InertHTMLElement = HTMLElement & { inert?: boolean };

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

function setBackgroundInert(overlay: HTMLElement): () => void {
  const parent = overlay.parentElement;
  if (!parent) {
    return () => {};
  }

  const siblings = Array.from(parent.children).filter(
    (child): child is InertHTMLElement => child instanceof HTMLElement && child !== overlay
  );
  const previousState = siblings.map((element) => ({
    element,
    inert: element.inert ?? false,
    ariaHidden: element.getAttribute("aria-hidden"),
  }));

  siblings.forEach((element) => {
    element.inert = true;
    element.setAttribute("aria-hidden", "true");
  });

  return () => {
    previousState.forEach(({ element, inert, ariaHidden }) => {
      element.inert = inert;
      if (ariaHidden === null) {
        element.removeAttribute("aria-hidden");
      } else {
        element.setAttribute("aria-hidden", ariaHidden);
      }
    });
  };
}

export function DialogFrame({
  isOpen,
  onClose,
  labelledBy,
  children,
  overlayClassName = "absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-4",
  panelClassName = "",
  ...props
}: DialogFrameProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const restoreFocus = () => {
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };

    if (!isOpen) {
      restoreFocus();
      return;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreBackground = overlayRef.current
      ? setBackgroundInert(overlayRef.current)
      : () => {};
    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const firstFocusable = getFocusableElements(panel)[0];
      (firstFocusable ?? panel).focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      restoreBackground();
      restoreFocus();
    };
  }, [isOpen]);

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusable = getFocusableElements(panel);
    if (focusable.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          aria-labelledby={labelledBy}
          aria-modal="true"
          className={overlayClassName}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          {...props}
        >
          <motion.div
            ref={panelRef}
            className={panelClassName}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handlePanelKeyDown}
            tabIndex={-1}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
