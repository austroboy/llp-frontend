"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/use-language";
import { Plus, X } from "lucide-react";

type ServiceCategory = "expatriate" | "hr" | "licensing";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: Id<"serviceProducts"> | null;
}

export function ServiceDialog({ open, onOpenChange, editId }: ServiceDialogProps) {
  const { t } = useLanguage();
  const { user } = useUser();
  const allServices = useQuery(api.serviceProducts.list);
  const createService = useMutation(api.serviceProducts.create);
  const updateService = useMutation(api.serviceProducts.update);

  const [title, setTitle] = useState("");
  const [titleBn, setTitleBn] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionBn, setDescriptionBn] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("expatriate");
  const [icon, setIcon] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [deliverablesBn, setDeliverablesBn] = useState<string[]>([""]);
  const [ctaText, setCtaText] = useState("");
  const [ctaTextBn, setCtaTextBn] = useState("");
  const [badge, setBadge] = useState("");
  const [badgeBn, setBadgeBn] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [deliveryTimeline, setDeliveryTimeline] = useState("");
  const [price, setPrice] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId && allServices) {
      const service = allServices.find((s) => s._id === editId);
      if (service) {
        setTitle(service.title);
        setTitleBn(service.titleBn ?? "");
        setDescription(service.description);
        setDescriptionBn(service.descriptionBn ?? "");
        setCategory(service.category);
        setIcon(service.icon);
        setDeliverables(service.deliverables.length > 0 ? service.deliverables : [""]);
        setDeliverablesBn(service.deliverablesBn?.length ? service.deliverablesBn : [""]);
        setCtaText(service.ctaText);
        setCtaTextBn(service.ctaTextBn ?? "");
        setBadge(service.badge ?? "");
        setBadgeBn(service.badgeBn ?? "");
        setWorkflow(service.workflow ?? "");
        setDeliveryTimeline(service.deliveryTimeline ?? "");
        setPrice(service.price ?? "");
        setPaymentTerms(service.paymentTerms ?? "");
        setNotes(service.notes ?? "");
        setSortOrder(service.sortOrder.toString());
        setIsActive(service.isActive);
      }
    } else if (!editId) {
      setTitle("");
      setTitleBn("");
      setDescription("");
      setDescriptionBn("");
      setCategory("expatriate");
      setIcon("ClipboardCheck");
      setDeliverables([""]);
      setDeliverablesBn([""]);
      setCtaText("Request Service");
      setCtaTextBn("");
      setBadge("");
      setBadgeBn("");
      setWorkflow("");
      setDeliveryTimeline("");
      setPrice("");
      setPaymentTerms("");
      setNotes("");
      setSortOrder("0");
      setIsActive(true);
    }
  }, [editId, allServices]);

  const updateDeliverable = (index: number, value: string) => {
    const updated = [...deliverables];
    updated[index] = value;
    setDeliverables(updated);
  };

  const addDeliverable = () => setDeliverables([...deliverables, ""]);
  const removeDeliverable = (index: number) =>
    setDeliverables(deliverables.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!title || !description) return;
    setSaving(true);
    try {
      const cleanDeliverables = deliverables.filter(Boolean);
      const cleanDeliverablesBn = deliverablesBn.filter(Boolean);

      if (editId) {
        await updateService({
          id: editId,
          title,
          titleBn: titleBn || undefined,
          description,
          descriptionBn: descriptionBn || undefined,
          category,
          icon,
          deliverables: cleanDeliverables,
          deliverablesBn: cleanDeliverablesBn.length > 0 ? cleanDeliverablesBn : undefined,
          ctaText,
          ctaTextBn: ctaTextBn || undefined,
          badge: badge || undefined,
          badgeBn: badgeBn || undefined,
          workflow: workflow || undefined,
          deliveryTimeline: deliveryTimeline || undefined,
          price: price || undefined,
          paymentTerms: paymentTerms || undefined,
          notes: notes || undefined,
          sortOrder: parseInt(sortOrder) || 0,
          isActive,
        });
      } else {
        await createService({
          title,
          titleBn: titleBn || undefined,
          description,
          descriptionBn: descriptionBn || undefined,
          category,
          icon,
          deliverables: cleanDeliverables,
          deliverablesBn: cleanDeliverablesBn.length > 0 ? cleanDeliverablesBn : undefined,
          ctaText,
          ctaTextBn: ctaTextBn || undefined,
          badge: badge || undefined,
          badgeBn: badgeBn || undefined,
          workflow: workflow || undefined,
          deliveryTimeline: deliveryTimeline || undefined,
          price: price || undefined,
          paymentTerms: paymentTerms || undefined,
          notes: notes || undefined,
          sortOrder: parseInt(sortOrder) || 0,
          isActive,
          createdBy: user?.id ?? "unknown",
        });
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editId ? t("admin.services.editService") : t("admin.services.addService")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5 pb-4">
            {/* Title */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("admin.services.titleEn")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>{t("admin.services.titleBn")}</Label>
                <Input value={titleBn} onChange={(e) => setTitleBn(e.target.value)} />
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("admin.services.descEn")}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div>
                <Label>{t("admin.services.descBn")}</Label>
                <Textarea value={descriptionBn} onChange={(e) => setDescriptionBn(e.target.value)} rows={3} />
              </div>
            </div>

            {/* Category + Icon + Sort */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>{t("admin.services.category")}</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="expatriate">Expatriate & Visa</option>
                  <option value="hr">HR Services</option>
                  <option value="licensing">Licensing & Regulatory</option>
                </select>
              </div>
              <div>
                <Label>{t("admin.services.icon")}</Label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="ClipboardCheck" />
              </div>
              <div>
                <Label>{t("admin.services.sortOrder")}</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
            </div>

            {/* Workflow */}
            <div>
              <Label>Workflow (Brief Steps)</Label>
              <Textarea
                value={workflow}
                onChange={(e) => setWorkflow(e.target.value)}
                rows={2}
                placeholder="Document collection → Application submission → Follow-up → Issuance"
              />
            </div>

            {/* Timeline + Price + Payment Terms */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Delivery Timeline</Label>
                <Input
                  value={deliveryTimeline}
                  onChange={(e) => setDeliveryTimeline(e.target.value)}
                  placeholder="15–20 WD"
                />
              </div>
              <div>
                <Label>Price</Label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="12,000 + VAT"
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="50% advance"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Govt. fees extra, additional info..."
              />
            </div>

            {/* Deliverables */}
            <div>
              <Label>{t("admin.services.deliverables")}</Label>
              <div className="space-y-2 mt-2">
                {deliverables.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={d}
                      onChange={(e) => updateDeliverable(i, e.target.value)}
                      placeholder={`Deliverable ${i + 1}`}
                    />
                    {deliverables.length > 1 && (
                      <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => removeDeliverable(i)}>
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addDeliverable}>
                  <Plus className="size-3.5 mr-1" />
                  {t("admin.services.addDeliverable")}
                </Button>
              </div>
            </div>

            {/* CTA + Badge */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("admin.services.ctaText")}</Label>
                <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
              </div>
              <div>
                <Label>{t("admin.services.badge")}</Label>
                <Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Optional badge text" />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Label>{t("admin.services.active")}</Label>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${isActive ? "translate-x-4.5" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("admin.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !title || !description}>
            {saving ? t("admin.saving") : editId ? t("admin.save") : t("admin.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
