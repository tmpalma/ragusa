import { useState, type ReactNode, type SyntheticEvent } from "react";
import styles from "./CollapsiblePane.module.css";

export function CollapsiblePane({
  title,
  summaryActions,
  children,
  defaultOpen = true,
  variant = "default",
}: {
  title: ReactNode;
  summaryActions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: "default" | "nested";
}) {
  const [open, setOpen] = useState(defaultOpen);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    setOpen(event.currentTarget.open);
  }

  return (
    <details
      className={`${styles.pane} ${variant === "nested" ? styles.nested : ""}`}
      open={open}
      onToggle={handleToggle}
    >
      <summary className={styles.summary}>
        <span className={styles.summaryLeading}>
          <span className={styles.summaryTitle}>{title}</span>
          <span aria-hidden="true" className={styles.expandIndicator}>
            {open ? "(-)" : "(+)"}
          </span>
        </span>
        {summaryActions ? <span className={styles.summaryActions}>{summaryActions}</span> : null}
      </summary>
      {children}
    </details>
  );
}
