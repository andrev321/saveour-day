"use client";
import {
  QUESTION_POLICY,
  type QuestionValue,
  type RsvpQuestion,
} from "@invitations/domain/rsvp-questions";

export function QuestionField({
  question,
  value,
  onChange,
  disabled,
  namePrefix,
  copy,
}: {
  question: RsvpQuestion;
  value: QuestionValue | undefined;
  onChange: (next: QuestionValue | undefined) => void;
  disabled?: boolean;
  namePrefix: string;
  copy: { otherOption: string; otherPlaceholder: string };
}) {
  const title = (
    <>
      {question.label}
      {question.required && <span aria-hidden="true"> *</span>}
    </>
  );

  if (question.type === "text") {
    const text = value && "text" in value ? value.text : "";
    return (
      <label>
        <span>{title}</span>
        {question.help && <small>{question.help}</small>}
        <textarea
          rows={2}
          maxLength={QUESTION_POLICY.maxTextAnswerLength}
          disabled={disabled}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v.trim().length > 0 ? { text: v } : undefined);
          }}
        />
      </label>
    );
  }

  if (question.type === "number") {
    const num = value && "number" in value ? value.number : "";
    const current = typeof num === "number" ? num : 0;
    return (
      <div>
        <span>{title}</span>
        {question.help && <small>{question.help}</small>}
        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            disabled={disabled || current <= 0}
            aria-label="-"
            onClick={() => onChange({ number: Math.max(0, current - 1) })}
          >
            −
          </button>
          <input
            type="number"
            min={QUESTION_POLICY.minNumber}
            max={QUESTION_POLICY.maxNumber}
            step={1}
            disabled={disabled}
            value={num}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange(undefined);
                return;
              }
              const parsed = Number.parseInt(raw, 10);
              if (Number.isFinite(parsed)) {
                onChange({
                  number: Math.max(
                    QUESTION_POLICY.minNumber,
                    Math.min(QUESTION_POLICY.maxNumber, parsed),
                  ),
                });
              }
            }}
          />
          <button
            type="button"
            disabled={
              disabled ||
              (typeof num === "number" && num >= QUESTION_POLICY.maxNumber)
            }
            aria-label="+"
            onClick={() =>
              onChange({
                number: Math.min(
                  QUESTION_POLICY.maxNumber,
                  typeof num === "number" ? num + 1 : 1,
                ),
              })
            }
          >
            +
          </button>
        </div>
      </div>
    );
  }

  const selectedIds = value && "optionIds" in value ? value.optionIds : [];
  const otherText = value && "other" in value ? (value.other ?? "") : "";
  const isOtherActive =
    value && "other" in value && typeof value.other === "string";

  if (question.type === "single") {
    const selectedId = selectedIds[0] ?? "";
    if (question.options.length === 2 && !question.allowOther) {
      return (
        <fieldset disabled={disabled}>
          <legend>{title}</legend>
          {question.help && <small>{question.help}</small>}
          <div role="radiogroup" style={{ display: "inline-flex", gap: 6 }}>
            {question.options.map((opt) => {
              const active = selectedId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => onChange({ optionIds: [opt.id] })}
                  style={{ fontWeight: active ? 700 : 400 }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }
    return (
      <fieldset disabled={disabled}>
        <legend>{title}</legend>
        {question.help && <small>{question.help}</small>}
        {question.options.map((opt) => (
          <label key={opt.id}>
            <input
              type="radio"
              name={`${namePrefix}-${question.id}`}
              checked={!isOtherActive && selectedId === opt.id}
              onChange={() => onChange({ optionIds: [opt.id] })}
            />{" "}
            {opt.label}
          </label>
        ))}
        {question.allowOther && (
          <div>
            <label>
              <input
                type="radio"
                name={`${namePrefix}-${question.id}`}
                checked={Boolean(isOtherActive)}
                onChange={() =>
                  onChange({ optionIds: [], other: otherText || "" })
                }
              />{" "}
              {copy.otherOption}
            </label>
            {isOtherActive && (
              <input
                type="text"
                maxLength={QUESTION_POLICY.maxOtherLength}
                placeholder={copy.otherPlaceholder}
                value={otherText}
                onChange={(e) =>
                  onChange({ optionIds: [], other: e.target.value })
                }
              />
            )}
          </div>
        )}
      </fieldset>
    );
  }

  // multi
  return (
    <fieldset disabled={disabled}>
      <legend>{title}</legend>
      {question.help && <small>{question.help}</small>}
      {question.options.map((opt) => {
        const checked = selectedIds.includes(opt.id);
        return (
          <label key={opt.id}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                const nextIds = e.target.checked
                  ? [...selectedIds, opt.id]
                  : selectedIds.filter((id) => id !== opt.id);
                if (nextIds.length === 0 && !isOtherActive) {
                  onChange(undefined);
                } else {
                  onChange({
                    optionIds: nextIds,
                    ...(isOtherActive ? { other: otherText } : {}),
                  });
                }
              }}
            />{" "}
            {opt.label}
          </label>
        );
      })}
      {question.allowOther && (
        <div>
          <label>
            <input
              type="checkbox"
              checked={Boolean(isOtherActive)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange({ optionIds: selectedIds, other: otherText || "" });
                } else if (selectedIds.length === 0) {
                  onChange(undefined);
                } else {
                  onChange({ optionIds: selectedIds });
                }
              }}
            />{" "}
            {copy.otherOption}
          </label>
          {isOtherActive && (
            <input
              type="text"
              maxLength={QUESTION_POLICY.maxOtherLength}
              placeholder={copy.otherPlaceholder}
              value={otherText}
              onChange={(e) =>
                onChange({ optionIds: selectedIds, other: e.target.value })
              }
            />
          )}
        </div>
      )}
    </fieldset>
  );
}
