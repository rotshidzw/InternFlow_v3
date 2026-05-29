import { PropsWithChildren } from "react";

type SectionHeadingProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}>;

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  children,
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <div className={`flex flex-col gap-2 ${alignClass}`}>
      {eyebrow ? (
        <p className="if-marketing-eyebrow">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="if-page-title">{title}</h2>
      {subtitle ? <p className="if-page-subtitle max-w-3xl">{subtitle}</p> : null}
      {children}
    </div>
  );
}
