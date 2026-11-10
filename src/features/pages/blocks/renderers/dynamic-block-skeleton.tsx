type DynamicBlockSkeletonProps = {
  layout: "cards" | "rows";
  tabs?: number;
  items?: number;
  label: string;
};

export function DynamicBlockSkeleton({ layout, tabs = 0, items = 4, label }: DynamicBlockSkeletonProps) {
  return (
    <div className="dynamic-block-data-skeleton" role="status" aria-busy="true" aria-live="polite" aria-label={label}>
      <div className="block-skeleton-heading" aria-hidden="true">
        <span className="public-loading-shape" />
        <span className="public-loading-shape" />
      </div>
      {tabs ? (
        <div className="block-skeleton-tabs" aria-hidden="true">
          {Array.from({ length: Math.min(6, tabs) }, (_, index) => <span className="public-loading-shape" key={index} />)}
        </div>
      ) : null}
      {layout === "cards" ? (
        <div className="block-skeleton-cards columns-3" aria-hidden="true">
          {Array.from({ length: Math.min(6, Math.max(1, items)) }, (_, index) => (
            <article key={index}>
              <span className="public-loading-shape block-skeleton-card-icon" />
              <div className="block-skeleton-lines">
                <span className="public-loading-shape" />
                <span className="public-loading-shape" />
                <span className="public-loading-shape" />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="block-skeleton-rows" aria-hidden="true">
          {Array.from({ length: Math.min(6, Math.max(1, items)) }, (_, index) => (
            <div key={index}>
              <span className="public-loading-shape block-skeleton-row-icon" />
              <div className="block-skeleton-lines">
                <span className="public-loading-shape" />
                <span className="public-loading-shape" />
              </div>
              <span className="public-loading-shape block-skeleton-row-action" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
