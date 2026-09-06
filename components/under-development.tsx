import * as React from "react";
import { Wrench } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface UnderDevelopmentProps {
  icon?: React.ReactNode;
  title?: string;
  description?: React.ReactNode; // ← was string
}

export function UnderDevelopment({
  icon = <Wrench />,
  title = "Under Development",
  description = "This page is a work in progress. Content will appear here once ready.",
}: UnderDevelopmentProps) {
  return (
    <div className="flex min-h-100 items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">{icon}</EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
