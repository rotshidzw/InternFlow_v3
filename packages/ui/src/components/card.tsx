import { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren) {
  return (
    <div className="if-panel rounded-2xl p-4">
      {children}
    </div>
  );
}
