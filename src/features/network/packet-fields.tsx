export interface PacketField {
  label: string;
  value: string | number;
  bits: number;
  help?: string;
  changed?: boolean;
}

function FieldList({ fields }: { fields: PacketField[] }) {
  return (
    <dl>
      {fields.map((field) => (
        <div
          key={field.label}
          data-field={field.label}
          className={field.changed ? "field-changed" : undefined}
        >
          <dt>
            {field.label}
            <span className="packet-field-size">{field.bits} bits</span>
            {field.changed && <span>Changed</span>}
          </dt>
          <dd>
            <span className="packet-field-value">{field.value}</span>
            {field.help && (
              <small className="packet-field-help">{field.help}</small>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PacketLayer({
  title,
  subtitle,
  className,
  explanation,
  fields,
  more,
  bytes,
  byteLabel,
}: {
  title: string;
  subtitle: string;
  className: string;
  explanation: string;
  fields: PacketField[];
  more: PacketField[];
  bytes?: readonly number[];
  byteLabel?: string;
}) {
  return (
    <section
      className={"inspector-layer " + className}
      aria-label={title + " header"}
    >
      <h3>
        {title} <span>{subtitle}</span>
      </h3>
      <p className="packet-layer-explanation">{explanation}</p>
      <FieldList fields={fields} />
      <details className="packet-field-details">
        <summary>Show all {title} fields</summary>
        <FieldList fields={more} />
        {bytes && (
          <div className="packet-bytes">
            <p>{byteLabel}</p>
            <code>
              {bytes
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join(" ")}
            </code>
          </div>
        )}
      </details>
    </section>
  );
}

export function hex(value: number) {
  return "0x" + value.toString(16).padStart(4, "0");
}
