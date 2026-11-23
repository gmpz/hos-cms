import type { CSSProperties, ReactNode } from "react";

export function PublicIndexHero({ eyebrow, title, description, className = "", style, children }: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <header className={`public-news-index-hero public-index-hero${className ? ` ${className}` : ""}`} style={style}>
      <div className="public-index-hero-container">
        <div className="public-index-hero-content">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          {description ? <span>{description}</span> : null}
        </div>
      </div>
      {children}
    </header>
  );
}
