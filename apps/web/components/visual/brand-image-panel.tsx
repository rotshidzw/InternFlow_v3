import { PropsWithChildren } from "react";
import type { BrandImageSpec } from "@/lib/brand-imagery";

type BrandImagePanelProps = PropsWithChildren<{
  image: BrandImageSpec;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  imageClassName?: string;
}>;

export function BrandImagePanel({
  image,
  eyebrow,
  title,
  description,
  className,
  imageClassName,
  children,
}: BrandImagePanelProps) {
  return (
    <article className={["if-panel overflow-hidden", className].filter(Boolean).join(" ")}>
      <div className={["relative h-64", imageClassName].filter(Boolean).join(" ")}>
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="if-image-overlay absolute inset-0" aria-hidden />
        {(eyebrow || title || description || children) && (
          <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
            {eyebrow ? (
              <p className="text-[11px] uppercase tracking-[0.2em] text-brand-accentStrong/95">
                {eyebrow}
              </p>
            ) : null}
            {title ? <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-white/85">{description}</p> : null}
            {children}
          </div>
        )}
      </div>
    </article>
  );
}