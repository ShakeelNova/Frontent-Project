import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import type { ReactNode } from "react";

export interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered card chrome shared by all /auth/* pages. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
      <Card>
        <CardHeader>
          <h1 className="text-h3">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
        </CardHeader>
        <CardBody>{children}</CardBody>
        {footer ? <CardFooter className="text-sm text-muted">{footer}</CardFooter> : null}
      </Card>
    </div>
  );
}
