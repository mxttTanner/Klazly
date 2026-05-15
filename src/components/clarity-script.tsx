import Script from "next/script";

/**
 * Microsoft Clarity session replay. Free, unlimited sessions. Reads
 * project ID from NEXT_PUBLIC_CLARITY_PROJECT_ID — when the var is
 * empty (local dev or you didn't sign up yet) the component renders
 * nothing, so we don't waste a network request loading a script that
 * can't initialise.
 *
 * Clarity auto-masks form inputs by default (passwords, emails,
 * credit cards). For phone numbers and free-text fields we add the
 * `data-clarity-mask="True"` attribute on the elements directly,
 * checked in src/app/(auth)/login/login-form.tsx and the parent /
 * teacher invite forms.
 *
 * Loaded with strategy="afterInteractive" so it doesn't block first
 * paint or hydration.
 */
export function ClarityScript() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId) return null;
  return (
    <Script id="clarity-script" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${projectId}");
      `}
    </Script>
  );
}
