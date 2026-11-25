'use client';

import React, { useEffect, useRef } from 'react';

export interface ModalDialogProps {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  dismissMode?: 'any' | 'closerequest' | 'none';
  className?: string;
  children: React.ReactNode;
}

/**
 * 基於原生 HTML <dialog> + showModal() 封裝的無障礙 Modal 對話框元件：
 * - 自動進入 Top Layer 並將背景文件設為 inert
 * - 支援原生 Esc 關閉與關閉後焦點自動返回觸發按鈕
 * - 內建 closedby="any" 輕觸關閉及 Safari 指標座標邊界 Fallback
 */
export const ModalDialog: React.FC<ModalDialogProps> = ({
  id,
  isOpen,
  onClose,
  ariaLabelledBy,
  ariaLabel,
  dismissMode = 'any',
  className = 'w-[calc(100vw-2rem)] max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 p-0 m-auto max-h-[90vh] overflow-hidden',
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);

  isOpenRef.current = isOpen;
  onCloseRef.current = onClose;

  // 同步開啟 / 關閉狀態至原生 showModal() / close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  // 綁定 cancel (Esc) 與 close 原生事件並重設 returnValue
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      if (dismissMode === 'none') {
        e.preventDefault();
      }
    };

    const handleClose = () => {
      dialog.returnValue = '';
      if (isOpenRef.current) {
        onCloseRef.current();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [dismissMode]);

  // 對尚未支援 closedby="any" 的瀏覽器（如 Safari）提供指標邊界 Fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dismissMode !== 'any') return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && dialog.open) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, [dismissMode]);

  return (
    <dialog
      id={id}
      ref={dialogRef}
      aria-labelledby={ariaLabelledBy}
      aria-label={!ariaLabelledBy ? ariaLabel : undefined}
      className={className}
      {...({ closedby: dismissMode } as Record<string, unknown>)}
    >
      {isOpen ? children : null}
    </dialog>
  );
};
