// BioContent.jsx — sanitized HTML rendering + sandboxed iframe for full documents.
// npm install dompurify  (if not already present)
import React, { useRef, useState } from "react";
import DOMPurify from "dompurify";
import { isFullHtmlDocument } from "../utils";

export default function BioContent({ bioHtml }) {
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState(600);

  if (!bioHtml) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-10 text-center text-slate-500">
        No bio or article added yet
      </div>
    );
  }

  if (isFullHtmlDocument(bioHtml)) {
    return (
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
        {/*
          sandbox intentionally omits "allow-scripts" — do not add it.
          allow-same-origin + allow-scripts together would let injected
          script read/modify the parent-origin document via this iframe.
        */}
        <iframe
          ref={iframeRef}
          srcDoc={bioHtml}
          title="Biography"
          sandbox="allow-same-origin"
          className="w-full block"
          style={{ height: iframeHeight, border: "none" }}
          onLoad={() => {
            try {
              const doc = iframeRef.current?.contentDocument;
              if (doc?.body) setIframeHeight(doc.body.scrollHeight + 40);
            } catch {
              /* cross-origin or blocked access — keep default height */
            }
          }}
          loading="lazy"
        />
      </div>
    );
  }

  const clean = DOMPurify.sanitize(bioHtml, {
    ALLOWED_TAGS: ["p", "b", "strong", "i", "em", "u", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "br", "img", "figure", "figcaption"],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
  });

  return (
    <div
      className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-8 w-full prose prose-neutral prose-headings:font-display prose-headings:uppercase prose-a:text-indigo-600 max-w-none shadow-lg shadow-slate-200/20"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
