export const ThinkingDots = () => (
  <span className="inline-flex items-center gap-1" aria-hidden="true">
    {[0, 150, 300].map((delay) => (
      <span
        key={delay}
        className="h-1.5 w-1.5 animate-bounce bg-muted-foreground/70"
        style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
      />
    ))}
  </span>
);

export default ThinkingDots;
