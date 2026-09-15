"use client";

import { useEffect, useRef, useState } from "react";
import { FolderOpen, Save, Trash2 } from "lucide-react";
import type { WorkspaceSnapshot } from "@/repositories/playgrounds/workspace-snapshot";
import {
  MAX_PLAYGROUNDS,
  type SavedPlayground,
} from "@/repositories/playgrounds/playground-repository";
import {
  removePlayground,
  savePlayground,
  useSavedPlaygrounds,
} from "./use-saved-playgrounds";
import "./playground-library.css";

export function PlaygroundLibrary({
  workspace,
  hasDraft,
  onLoad,
}: {
  workspace: WorkspaceSnapshot;
  hasDraft: boolean;
  onLoad: (workspace: WorkspaceSnapshot) => void;
}) {
  const library = useSavedPlaygrounds();
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{
    kind: "load" | "delete";
    item: SavedPlayground;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const selector = useRef<HTMLSelectElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const focusNameOnClose = useRef(false);
  const selected = library.items.find((item) => item.id === selectedId);
  useEffect(() => {
    if (pending) {
      dialog.current?.showModal();
      cancel.current?.focus();
    }
  }, [pending]);

  function finishAction() {
    if (!pending) return;
    if (pending.kind === "load") {
      onLoad(structuredClone(pending.item.workspace));
      setMessage(
        `Opened “${pending.item.name}”. Changes stay in the workspace until you save another snapshot.`,
      );
    } else {
      const result = removePlayground(pending.item.id);
      if (!result.ok) {
        setError(result.error);
        dialog.current?.close();
        return;
      }
      setSelectedId("");
      focusNameOnClose.current = true;
      setMessage(
        `Deleted “${pending.item.name}”. Your open workspace is unchanged.`,
      );
    }
    setError("");
    dialog.current?.close();
  }

  return (
    <section
      className="playground-library"
      aria-labelledby="saved-networks-heading"
    >
      <div className="library-heading">
        <div>
          <p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p>
          <h2 id="saved-networks-heading">Saved networks</h2>
        </div>
        <span className="library-count">
          {library.items.length} / {MAX_PLAYGROUNDS}
        </span>
      </div>
      <p id="library-description" className="library-description">
        Save a named snapshot of your devices, cables, layout, and packet
        settings. Snapshots stay in this browser. Save a new name to keep
        another version.
      </p>
      <div className="library-controls">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            setMessage("");
            if (hasDraft) {
              setError(
                "Apply device changes and add any unfinished routes before saving.",
              );
              return;
            }
            if (
              !Number.isInteger(workspace.ttl) ||
              workspace.ttl < 1 ||
              workspace.ttl > 255
            ) {
              setError(
                "Set Initial TTL to a whole number from 1 to 255 before saving.",
              );
              return;
            }
            const result = savePlayground({
              id: crypto.randomUUID(),
              name,
              updatedAt: new Date().toISOString(),
              workspace,
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            const added = result.items.find(
              (item) => item.name === name.trim(),
            );
            setSelectedId(added?.id ?? "");
            setMessage(`Saved “${name.trim()}” in this browser.`);
            setName("");
          }}
        >
          <label htmlFor="network-save-name">Snapshot name</label>
          <div className="library-action-row">
            <input
              ref={nameInput}
              id="network-save-name"
              value={name}
              maxLength={60}
              required
              placeholder="e.g. My first routed network"
              onChange={(event) => setName(event.target.value)}
              aria-describedby={
                hasDraft ? "library-draft-note" : "library-description"
              }
            />
            <button
              type="submit"
              className="button"
              disabled={
                !library.ready ||
                Boolean(library.error) ||
                hasDraft ||
                library.items.length >= MAX_PLAYGROUNDS
              }
            >
              <Save size={16} aria-hidden="true" /> Save network
            </button>
          </div>
        </form>
        <div>
          <label htmlFor="saved-network">Saved network</label>
          <div className="library-action-row">
            <select
              id="saved-network"
              ref={selector}
              value={selected?.id ?? ""}
              disabled={!library.ready || !library.items.length}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setError("");
                setMessage("");
              }}
            >
              <option value="">
                {library.items.length
                  ? "Choose a snapshot"
                  : "No saved networks yet"}
              </option>
              {library.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button button-secondary"
              disabled={!selected}
              onClick={() =>
                selected && setPending({ kind: "load", item: selected })
              }
            >
              <FolderOpen size={16} aria-hidden="true" /> Open network
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={!selected}
              onClick={() =>
                selected && setPending({ kind: "delete", item: selected })
              }
            >
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
          </div>
        </div>
      </div>
      {hasDraft && (
        <p id="library-draft-note" className="library-note">
          You have unapplied device changes. Apply configuration and add any
          unfinished routes before saving.
          <a className="text-link" href="#network-configuration">
            {" "}
            Go to configuration →
          </a>
        </p>
      )}
      {library.items.length >= MAX_PLAYGROUNDS && (
        <p className="library-note">
          Your library is full. Delete a snapshot to make room for another.
        </p>
      )}
      {(error || library.error) && (
        <p className="form-error" role="alert">
          {error || library.error} Your open network is unchanged.
        </p>
      )}
      <p className="library-status" role="status">
        {message}
      </p>
      <dialog
        ref={dialog}
        className="library-dialog"
        aria-labelledby="library-dialog-heading"
        aria-describedby="library-dialog-description"
        onClose={() => {
          setPending(null);
          if (focusNameOnClose.current) {
            nameInput.current?.focus();
            focusNameOnClose.current = false;
          }
        }}
      >
        <h2 id="library-dialog-heading">
          {pending?.kind === "delete"
            ? "Delete this snapshot?"
            : "Open this snapshot?"}
        </h2>
        <p id="library-dialog-description">
          {pending?.kind === "delete"
            ? `“${pending.item.name}” will be removed from this browser. Your open workspace will stay as it is.`
            : `“${pending?.item.name ?? ""}” will replace the open workspace, including unapplied edits. Save your current network first if you want to keep it.`}
        </p>
        <div className="library-dialog-actions">
          <button
            type="button"
            ref={cancel}
            className="button button-secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
          <button
            type="button"
            className={pending?.kind === "delete" ? "danger-button" : "button"}
            onClick={finishAction}
          >
            {pending?.kind === "delete" ? "Delete snapshot" : "Open snapshot"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
