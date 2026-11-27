import { Fragment } from "react";

/** Renders text with line breaks where the admin typed newlines. */
export function Lines({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}

/** Hero headline: newlines become line breaks and the last word gets the accent colour (the .hero-title span). */
export function HeroTitleLines({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1;
        const idx = line.trimEnd().lastIndexOf(" ");
        const head = isLast && idx >= 0 ? line.slice(0, idx + 1) : isLast ? "" : line;
        const tail = isLast ? (idx >= 0 ? line.slice(idx + 1) : line) : "";
        return (
          <Fragment key={i}>
            {i > 0 && <br />}
            {head}
            {isLast && tail && <span>{tail}</span>}
          </Fragment>
        );
      })}
    </>
  );
}
