"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createEventExpense } from "../actions";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "RENT", label: "Аренда" },
  { value: "SALARY", label: "Гонорары" },
  { value: "TRANSPORT", label: "Транспорт" },
  { value: "SET", label: "Декорации" },
  { value: "COSTUME", label: "Костюмы/реквизит" },
  { value: "MARKETING", label: "Маркетинг" },
  { value: "PRINT", label: "Печать" },
  { value: "FOOD", label: "Питание" },
  { value: "OTHER", label: "Другое" },
];

type State =
  | { ok: true; nonce: number; message?: string }
  | { ok: false; nonce: number; error: string };

const initialState: State = { ok: true, nonce: 0 };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
    >
      {pending ? "..." : "Добавить расход"}
    </button>
  );
}

export default function ExpenseForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [state, formAction] = useFormState(createEventExpense as any, initialState);

  // Если успешно — чистим форму и обновляем страницу (чтобы список расходов обновился)
  useEffect(() => {
    if (state?.nonce && state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state?.nonce, state?.ok, router]);

  return (
    <div className="space-y-3">
      <form ref={formRef} action={formAction} className="grid gap-3 md:grid-cols-12">
        <input type="hidden" name="eventId" value={eventId} />

        <div className="md:col-span-3">
          <label className="mb-1 block text-xs text-neutral-500">Категория</label>
          <select
            name="category"
            defaultValue="SALARY"
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="mb-1 block text-xs text-neutral-500">Название</label>
          <input
            name="title"
            placeholder="Напр. Ягодкин / печать афиш"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="mt-1 text-[11px] text-neutral-400">
            Если в модели нет поля title/name — будет проигнорировано автоматически.
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-neutral-500">Сумма (₽)</label>
          <input
            name="amount"
            placeholder="5000"
            className="w-full rounded-md border px-3 py-2 text-sm"
            inputMode="decimal"
          />
        </div>

        <div className="md:col-span-3">
          <label className="mb-1 block text-xs text-neutral-500">Комментарий</label>
          <input
            name="comment"
            placeholder="необязательно"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-12 flex justify-start">
          <SubmitButton />
        </div>
      </form>

      {state && !state.ok ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
          {state.error}
        </div>
      ) : null}
    </div>
  );
}
