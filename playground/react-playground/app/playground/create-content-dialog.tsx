"use client";

import React, { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { useLocale } from "../i18n/LocaleContext";

type Props = {
  onCreateContent: (title: string) => void;
  trigger: React.ReactNode;
};

export default function CreateContentDialog({ onCreateContent, trigger }: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  function handleCreate() {
    if (title.trim()) {
      onCreateContent(title.trim());
      setTitle("");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialog.create.title")}</DialogTitle>
          <DialogDescription>{t("dialog.create.description")}</DialogDescription>
        </DialogHeader>
        <Input
          placeholder={t("dialog.create.placeholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("dialog.create.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim()}>
            {t("dialog.create.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
