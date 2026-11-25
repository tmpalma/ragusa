import { useMemo, type ReactNode } from "react";
import { parseCatalogProse, type ProseInline } from "../domain/parseCatalogProse";
import styles from "./CatalogProse.module.css";

function renderInlines(inlines: ProseInline[], keyPrefix: string): ReactNode[] {
  return inlines.map((inline, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (inline.type) {
      case "text":
        return inline.text ? <span key={key}>{inline.text}</span> : null;
      case "strong":
        return (
          <strong key={key}>
            {renderInlines(inline.inlines, `${keyPrefix}-s`)}
          </strong>
        );
      case "em":
        return (
          <em key={key}>
            {renderInlines(inline.inlines, `${keyPrefix}-e`)}
          </em>
        );
      default:
        return null;
    }
  });
}

interface CatalogProseProps {
  children: string;
  className?: string;
  /** Use `inline` inside table cells or after a leading `<strong>`. */
  variant?: "block" | "inline";
}

export function CatalogProse({ children, className, variant = "block" }: CatalogProseProps) {
  const blocks = useMemo(() => parseCatalogProse(children), [children]);

  if (blocks.length === 0) return null;

  if (variant === "inline") {
    const flat = blocks.flatMap((block) =>
      block.type === "paragraph" ? block.inlines : block.items.flat(),
    );
    return (
      <span className={[styles.inline, className].filter(Boolean).join(" ")}>
        {renderInlines(flat, "inline")}
      </span>
    );
  }

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "list") {
          return (
            <ul key={`list-${blockIndex}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`item-${blockIndex}-${itemIndex}`}>{renderInlines(item, `li-${blockIndex}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${blockIndex}`}>{renderInlines(block.inlines, `p-${blockIndex}`)}</p>
        );
      })}
    </div>
  );
}