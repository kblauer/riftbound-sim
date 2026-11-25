import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Action, CardInstance, PlayerView } from "@riftbound-sim/engine";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CardLookup } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { CardBack, CardView } from "./card-view.tsx";

const BOARD_ZONE = "board";

interface BoardProps {
  view: PlayerView;
  onAction: (action: Action) => void;
  /** Resolves a card id to its catalog entry. Cards it does not know render as placeholders. */
  lookup?: CardLookup;
}

/**
 * The play surface. It renders a PlayerView and reports intents through `onAction`; it
 * holds no game rules, so the same component serves AI matches (local engine) and
 * online matches (server-sent views).
 *
 * Drag a card from your hand onto your board to play it, or drag within the hand to
 * reorder. Hand order is a display preference kept here, not game state.
 */
export function Board({ view, onAction, lookup }: BoardProps) {
  const yourTurn = view.status === "active" && view.activePlayer === view.you.id;
  const [handOrder, setHandOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Keep the player's ordering, drop cards that left the hand, append newly drawn ones.
  const handIds = view.you.hand.map((c) => c.instanceId).join(",");
  useEffect(() => {
    const ids = handIds ? handIds.split(",") : [];
    setHandOrder((order) => [
      ...order.filter((id) => ids.includes(id)),
      ...ids.filter((id) => !order.includes(id)),
    ]);
  }, [handIds]);

  const hand = useMemo(() => {
    const byId = new Map(view.you.hand.map((c) => [c.instanceId, c]));
    const ordered = handOrder.flatMap((id) => byId.get(id) ?? []);
    // Before the effect above has run for a new card, fall back to engine order.
    return ordered.length === view.you.hand.length ? ordered : view.you.hand;
  }, [handOrder, view.you.hand]);

  const sensors = useSensors(
    // A small movement threshold keeps clicks and taps from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dragging = draggingId ? view.you.hand.find((c) => c.instanceId === draggingId) : undefined;

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const cardId = String(event.active.id);
    const target = event.over ? String(event.over.id) : null;
    if (!target || target === cardId) return;

    if (target === BOARD_ZONE) {
      if (yourTurn) onAction({ type: "playCard", player: view.you.id, instanceId: cardId });
      return;
    }
    setHandOrder((order) => {
      const from = order.indexOf(cardId);
      const to = order.indexOf(target);
      return from === -1 || to === -1 ? order : arrayMove(order, from, to);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 bg-board p-3 sm:p-4" data-testid="board">
        {/* Opponent */}
        <section aria-label="Opponent" className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Opponent · deck {view.opponent.deckCount} · hand {view.opponent.handCount}
            </span>
          </div>
          <div className="flex h-12 justify-center gap-1 overflow-hidden" aria-hidden>
            {Array.from({ length: view.opponent.handCount }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: face-down cards are interchangeable
              <CardBack key={i} className="-mt-24" />
            ))}
          </div>
          <Zone
            label="Opponent's board"
            cards={view.opponent.board}
            lookup={lookup}
            testId="opponent-board"
          />
        </section>

        {/* You */}
        <section aria-label="You" className="flex min-h-0 flex-1 flex-col gap-2">
          <DroppableZone
            label="Your board"
            cards={view.you.board}
            lookup={lookup}
            canDrop={yourTurn && draggingId !== null}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground" data-testid="turn-status">
              {view.status === "finished"
                ? view.winner === view.you.id
                  ? "You won"
                  : "You lost"
                : yourTurn
                  ? `Your turn (turn ${view.turn})`
                  : `Opponent's turn (turn ${view.turn})`}
              {" · "}deck {view.you.deckCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={view.status !== "active"}
                onClick={() => onAction({ type: "concede", player: view.you.id })}
              >
                Concede
              </Button>
              <Button
                disabled={!yourTurn}
                onClick={() => onAction({ type: "endTurn", player: view.you.id })}
              >
                End turn
              </Button>
            </div>
          </div>

          <SortableContext
            items={hand.map((c) => c.instanceId)}
            strategy={horizontalListSortingStrategy}
          >
            <ul
              aria-label="Your hand"
              data-testid="hand"
              className="flex min-h-card-h justify-center gap-2"
            >
              {hand.map((card) => (
                <HandCard key={card.instanceId} card={card} lookup={lookup} />
              ))}
            </ul>
          </SortableContext>
        </section>
      </div>

      <DragOverlay zIndex={50} dropAnimation={null}>
        {dragging && (
          <CardView
            cardId={dragging.cardId}
            card={lookup?.(dragging.cardId)}
            className="rotate-3 cursor-grabbing shadow-2xl ring-2 ring-primary"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function HandCard({ card, lookup }: { card: CardInstance; lookup?: CardLookup }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.instanceId,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "cursor-grab touch-none list-none rounded-lg outline-none transition-[translate] hover:-translate-y-2 focus-visible:ring-2 focus-visible:ring-ring",
        // The overlay shows the moving card; the slot stays as a faint gap marker.
        isDragging && "opacity-30",
      )}
      {...attributes}
      {...listeners}
    >
      <CardView cardId={card.cardId} card={lookup?.(card.cardId)} />
    </li>
  );
}

interface ZoneProps {
  label: string;
  cards: CardInstance[];
  lookup?: CardLookup;
  testId?: string;
  className?: string;
}

function Zone({ label, cards, lookup, testId, className }: ZoneProps) {
  return (
    <ul
      aria-label={label}
      data-testid={testId}
      className={cn(
        "flex min-h-[calc(var(--card-h)+1rem)] flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed bg-zone p-2 transition-colors",
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {cards.map((card) => (
          <motion.li
            key={card.instanceId}
            layout
            initial={{ opacity: 0, scale: 0.7, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="list-none"
          >
            <CardView cardId={card.cardId} card={lookup?.(card.cardId)} />
          </motion.li>
        ))}
      </AnimatePresence>
      {cards.length === 0 && <li className="list-none text-sm text-muted-foreground">{label}</li>}
    </ul>
  );
}

function DroppableZone({ canDrop, ...props }: ZoneProps & { canDrop: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: BOARD_ZONE });
  return (
    <div ref={setNodeRef} className="flex-1">
      <Zone
        {...props}
        testId="your-board"
        className={cn(
          "h-full",
          canDrop && "border-primary/70",
          canDrop && isOver && "border-solid bg-zone-active",
        )}
      />
    </div>
  );
}
