type SystemNoticeProps = {
  title: string;
  message: string;
};

export function SystemNotice({ title, message }: SystemNoticeProps) {
  return (
    <aside className="system-notice" role="status" aria-live="polite">
      <span className="system-notice__indicator" aria-hidden="true" />
      <div>
        <p>{title}</p>
        <span>{message}</span>
      </div>
    </aside>
  );
}
