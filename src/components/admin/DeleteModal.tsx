"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type DeleteModalProps = {
  lessonId: number | null;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteModal({
  lessonId,
  isOpen,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = () => {
    setIsDeleting(true);
    onConfirm();
  };

  const handleClose = () => {
    setIsDeleting(false);
    onCancel();
  };

  return (
    <Modal open={isOpen} title="حذف الدرس" onClose={handleClose}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          هل تريد حذف الدرس {lessonId ?? ""}؟ لا يمكن التراجع عن هذا الإجراء.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button variant="danger" onClick={handleConfirm} loading={isDeleting}>
            حذف
          </Button>
          <Button variant="secondary" onClick={handleClose}>
            إلغاء
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteModal;
