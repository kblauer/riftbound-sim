import type { CatalogCard } from "@riftbound-sim/protocol";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const frame =
  "relative h-card-h w-card-w shrink-0 select-none overflow-hidden rounded-lg border shadow-md";

interface CardViewProps extends ComponentProps<"div"> {
  /** Catalog id (`printing_id`), used for the fallback label when no catalog entry exists. */
  cardId: string;
  /** Catalog entry, when the catalog is loaded and knows this card. */
  card?: CatalogCard;
}

/** A face-up card. Shows the art when the catalog has it, otherwise a labelled placeholder. */
export function CardView({ cardId, card, className, ...props }: CardViewProps) {
  const name = card?.name ?? cardId.replace(/^placeholder-/, "Card ");
  const image = card?.image_small ?? card?.image_normal;

  return (
    <div data-testid="card" title={name} className={cn(frame, "bg-card", className)} {...props}>
      {image ? (
        // Art is loaded by URL from RiftHunt's CDN and never stored by this app.
        <img
          src={image}
          alt={name}
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full flex-col justify-between bg-linear-to-b from-accent to-card p-2">
          <span className="text-xs font-semibold leading-tight">{name}</span>
          {card?.energy != null && (
            <span className="self-end rounded bg-primary px-1.5 text-xs font-bold text-primary-foreground">
              {card.energy}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** A face-down card, used for the opponent's hand. */
export function CardBack({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-testid="card-back"
      className={cn(
        frame,
        "bg-[repeating-linear-gradient(45deg,var(--secondary),var(--secondary)_6px,var(--accent)_6px,var(--accent)_12px)]",
        className,
      )}
      {...props}
    />
  );
}
