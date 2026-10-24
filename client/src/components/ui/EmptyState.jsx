const EmptyState = ({ icon: Icon, title, text, action, className = '' }) => (
  <div className={`flex flex-col items-center px-6 py-14 text-center animate-fade-up ${className}`}>
    {Icon && (
      <span className="checker mb-5 grid size-16 place-items-center rounded-2xl border border-line">
        <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-text backdrop-blur">
          <Icon size={22} />
        </span>
      </span>
    )}
    <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
    {text && <p className="mt-1.5 max-w-sm text-sm text-fg-3">{text}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export default EmptyState
