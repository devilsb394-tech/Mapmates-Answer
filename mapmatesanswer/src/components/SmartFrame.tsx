// components/SmartFrame.tsx
// Drop-in replacement for <iframe> that uses Electron's native <webview>
// when running inside the desktop app, and falls back to <iframe> in the browser.
// Keeps all existing props you were passing to <iframe> working.

import { useEffect, useRef } from 'react';

declare global {
  // Minimal typing for Electron's <webview> custom element
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          allowpopups?: string | boolean;
          partition?: string;
          useragent?: string;
          webpreferences?: string;
          httpreferrer?: string;
          disablewebsecurity?: string | boolean;
          nodeintegration?: string | boolean;
        },
        HTMLElement
      >;
    }
  }
}

const isElectron = typeof navigator !== 'undefined' &&
  /Electron/i.test(navigator.userAgent);

export interface SmartFrameProps {
  src?: string;
  srcDoc?: string;
  className?: string;
  allow?: string;
  allowFullScreen?: boolean;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  title?: string;
}

export function SmartFrame({
  src,
  srcDoc,
  className,
  allow,
  allowFullScreen,
  referrerPolicy,
  title,
}: SmartFrameProps) {
  const ref = useRef<HTMLElement | null>(null);

  // If we have srcDoc (inline HTML), always use iframe — webview doesn't support it.
  if (srcDoc || !isElectron) {
    return (
      <iframe
        src={src}
        srcDoc={srcDoc}
        className={className}
        allow={allow}
        allowFullScreen={allowFullScreen}
        referrerPolicy={referrerPolicy}
        title={title}
      />
    );
  }

  useEffect(() => {
    const el = ref.current as any;
    if (!el) return;
    const onNewWindow = (e: any) => {
      // Keep popups inside the same webview instead of opening Chrome
      e.preventDefault?.();
      if (e.url) el.src = e.url;
    };
    el.addEventListener?.('new-window', onNewWindow);
    return () => el.removeEventListener?.('new-window', onNewWindow);
  }, []);

  return (
    <webview
      ref={ref as any}
      src={src}
      className={className}
      allowpopups={'true' as any}
      partition="persist:mapmates"
      webpreferences="contextIsolation=yes, javascript=yes, plugins=yes"
      // @ts-ignore — custom element attribute
      style={{ display: 'inline-flex', width: '100%', height: '100%' }}
    />
  );
}

export default SmartFrame;
