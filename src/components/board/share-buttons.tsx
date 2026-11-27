"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copy link + native share sheet (where available) + post on X. */
export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the address bar instead.");
    }
  };
  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, text });
        return;
      } catch {
        /* cancelled */
      }
    }
    copy();
  };
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={share}>
        <Share2 /> Share
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={copy} aria-live="polite">
        {copied ? <Check /> : <Link2 />} {copied ? "Copied" : "Copy link"}
      </Button>
      <Button asChild variant="secondary" size="sm">
        <a href={intent} target="_blank" rel="noopener noreferrer">
          Post on X
        </a>
      </Button>
    </div>
  );
}
