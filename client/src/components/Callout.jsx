import './Callout.css';

export default function Callout({ callout }) {
  if (!callout?.text) {
    return <div className="callout-line empty">Trade and roll callouts will appear here…</div>;
  }
  // key on id so the flash animation re-fires each time a new callout arrives
  return (
    <div className="callout-line" key={callout.id}>
      <span className="callout-text">{callout.text}</span>
    </div>
  );
}
