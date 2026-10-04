"use client";
import { useRef, useState, type SetStateAction } from "react";
import type { SiteConfig } from "@invitations/domain";

/** The ref changes synchronously, so late network replies cannot replace new edits. */
export function useDraft(initial: SiteConfig) {
  const [config, update] = useState(initial);
  const [available, setAvailable] = useState({
    canUndo: false,
    canRedo: false,
  });
  function sync() {
    setAvailable({
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
    });
  }
  const current = useRef(initial);
  const past = useRef<SiteConfig[]>([]);
  const future = useRef<SiteConfig[]>([]);
  const lastEdit = useRef(0);
  function setConfig(value: SetStateAction<SiteConfig>) {
    const next = typeof value === "function" ? value(current.current) : value;
    if (JSON.stringify(next) === JSON.stringify(current.current)) return;
    if (Date.now() - lastEdit.current > 500) {
      past.current = [...past.current.slice(-49), current.current];
    }
    lastEdit.current = Date.now();
    future.current = [];
    current.current = next;
    update(next);
    sync();
  }
  function reset(next: SiteConfig) {
    past.current = [];
    future.current = [];
    current.current = next;
    update(next);
    sync();
  }
  function undo() {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(current.current);
    current.current = previous;
    lastEdit.current = 0;
    update(previous);
    sync();
  }
  function redo() {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(current.current);
    current.current = next;
    lastEdit.current = 0;
    update(next);
    sync();
  }
  return { config, setConfig, reset, current, undo, redo, ...available };
}
