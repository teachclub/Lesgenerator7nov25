import * as React from "react";

export const Alert: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className = "", children, ...rest }) => {
  return (
    <div
      role="alert"
      className={`rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export const AlertTitle: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className = "", children, ...rest }) => (
  <div className={`font-semibold mb-1 ${className}`} {...rest}>
    {children}
  </div>
);

export const AlertDescription: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className = "", children, ...rest }) => (
  <div className={className} {...rest}>
    {children}
  </div>
);

