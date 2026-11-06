"use client";

import { queryKeys } from "@/api/query-keys";

import { getHelpArticle } from "@/api/services/help";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Contextual help (Phase 7): the article for `featureId` comes from the
 * backend/config seam — never hardcoded links. When a feature has no
 * article (or help is unavailable), a minimal explanation shows instead
 * of a broken link.
 */
export function HelpButton({
  featureId,
  featureLabel,
}: {
  featureId: string;
  featureLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: queryKeys.help(featureId),
    queryFn: () => getHelpArticle(featureId),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const article = query.data;

  return (
    <>
      <Button
        variant="subtle"
        onClick={() => setOpen(true)}
        aria-label={`Help: ${featureLabel}`}
      >
        ? Help
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={article?.title ?? `About ${featureLabel}`}
        footer={
          <Button variant="subtle" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        {query.isPending ? (
          <div role="status" aria-label="Loading help" className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : article ? (
          <div className="flex flex-col gap-3 text-sm">
            <p>{article.summary}</p>
            {article.bullets.length ? (
              <ul className="list-disc flex-col gap-1 pl-5 text-muted">
                {article.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
            {article.docUrl || article.videoUrl ? (
              <p className="flex flex-wrap gap-4">
                {article.docUrl ? (
                  <a
                    href={article.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline"
                  >
                    Read the full guide ↗
                  </a>
                ) : null}
                {article.videoUrl ? (
                  <a
                    href={article.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline"
                  >
                    Watch the video tutorial ↗
                  </a>
                ) : null}
              </p>
            ) : (
              <p className="text-muted">
                A longer guide for this feature will appear here once your
                help center is connected.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Help for {featureLabel} isn&apos;t available yet. Everything on
            this screen works through your organization&apos;s backend — if
            something looks wrong, note the request ID shown with any error
            and contact your administrator.
          </p>
        )}
      </Dialog>
    </>
  );
}
