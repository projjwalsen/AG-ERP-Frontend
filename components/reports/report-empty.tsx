"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox } from "lucide-react";

/**
 * Empty state shared by every report. Renders a card with an icon and a
 * message; `action` is an optional CTA (e.g. "Clear filters").
 */
export function ReportEmpty({
  message = "No data available",
  description,
  action,
}: {
  message?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">{message}</p>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
