export default function EmptyState({ title = "No matching records", text = "Try changing your filters." }) {
  return <div className="empty-state"><strong>{title}</strong><span>{text}</span></div>;
}
