"use client";

import { useEffect, useMemo, useState } from "react";

import type { NoteDto, SaveNoteSummaryMetadata, SummaryModelTier } from "@/features/notes/infrastructure/notesApi";
import { generateNoteSummary, saveNoteSummary } from "@/features/notes/infrastructure/notesApi";
import styles from "@/features/notes/ui/notes.module.css";

type Props = {
  note: NoteDto;
  onNoteUpdated: (note: NoteDto) => void;
};

type SummaryMetadata = Required<SaveNoteSummaryMetadata>;

function metadataFromNote(note: NoteDto): SummaryMetadata {
  return {
    modelTier: note.aiSummaryModelTier ?? null,
    inputTokens: note.aiSummaryInputTokens ?? null,
    outputTokens: note.aiSummaryOutputTokens ?? null,
    estimatedCostUsd: note.aiSummaryEstimatedCostUsd ?? null,
  };
}

function formatCost(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `비용 $${value.toFixed(6)}`;
}

export function NoteAiSummarySection({ note, onNoteUpdated }: Props) {
  const {
    id,
    aiSummary,
    aiSummaryModelTier,
    aiSummaryInputTokens,
    aiSummaryOutputTokens,
    aiSummaryEstimatedCostUsd,
  } = note;
  const [modelTier, setModelTier] = useState<SummaryModelTier>("gpt-5-nano");
  const [draft, setDraft] = useState(aiSummary ?? "");
  const [metadata, setMetadata] = useState<SummaryMetadata>(() => metadataFromNote(note));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(aiSummary ?? "");
    setMetadata({
      modelTier: aiSummaryModelTier ?? null,
      inputTokens: aiSummaryInputTokens ?? null,
      outputTokens: aiSummaryOutputTokens ?? null,
      estimatedCostUsd: aiSummaryEstimatedCostUsd ?? null,
    });
  }, [id, aiSummary, aiSummaryModelTier, aiSummaryInputTokens, aiSummaryOutputTokens, aiSummaryEstimatedCostUsd]);

  const costText = useMemo(() => formatCost(metadata.estimatedCostUsd), [metadata.estimatedCostUsd]);

  async function onGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const result = await generateNoteSummary(id, modelTier);
      setDraft(result.summary);
      setMetadata({
        modelTier: result.modelTier,
        inputTokens: result.inputTokens ?? null,
        outputTokens: result.outputTokens ?? null,
        estimatedCostUsd: result.estimatedCostUsd ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "요약 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  async function onSave() {
    const text = draft.trim();
    if (!text) {
      setError("저장할 요약 내용을 입력하세요.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await saveNoteSummary(id, text, metadata);
      onNoteUpdated(updated);
      setMetadata(metadataFromNote(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.summarySection} aria-label="노트 AI 요약">
      <div className={styles.summaryHeader}>
        <h2 className={styles.summaryTitle}>노트 AI 요약</h2>
      </div>

      {error ? <p className={styles.summaryError}>{error}</p> : null}

      <div className={styles.summaryToolbar}>
        <label className={styles.summaryTierLabel}>
          <select
            className={styles.select}
            value={modelTier}
            onChange={(e) => setModelTier(e.target.value as SummaryModelTier)}
            disabled={generating}
            aria-label="요약 모델"
          >
            <option value="gpt-5-nano">gpt-5-nano ($0.05 / $0.4)</option>
            <option value="gpt-5-mini">gpt-5-mini ($0.25 / $2)</option>
            <option value="gpt-5" disabled className={styles.disabledOption}>
              gpt-5 ($1.25 / $10)
            </option>
          </select>
        </label>
        <button
          type="button"
          className={styles.summaryGenBtn}
          disabled={generating || saving}
          onClick={() => void onGenerate()}
        >
          {generating ? "생성 중…" : aiSummary ? "요약 재생성" : "요약 생성"}
        </button>
        {costText ? <span className={styles.summaryCost}>{costText}</span> : null}
      </div>

      <label className={styles.summaryEditorLabel} htmlFor="note-ai-summary-draft">
        요약 내용
      </label>
      <textarea
        id="note-ai-summary-draft"
        className={styles.summaryTextarea}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        disabled={generating}
      />

      <div className={styles.summaryActions}>
        <button
          type="button"
          className={styles.summarySaveBtn}
          disabled={saving || generating || !draft.trim()}
          onClick={() => void onSave()}
        >
          {saving ? "저장 중…" : "요약 저장"}
        </button>
      </div>
    </section>
  );
}
