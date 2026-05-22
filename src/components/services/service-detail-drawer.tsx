"use client";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Id } from "@convex/_generated/dataModel";

export interface ServiceDetail {
  _id: Id<"serviceProducts">;
  title: string;
  titleBn?: string;
  description: string;
  descriptionBn?: string;
  category: "expatriate" | "hr" | "licensing";
  kind?: string;
  authority?: string;
  legal?: string;
  engagementCovers?: string;
  workflow?: string;
  deliveryTimeline?: string;
  price?: string;
  paymentTerms?: string;
  notes?: string;
  deliverables?: string[];
}

interface Props {
  open: boolean;
  service: ServiceDetail | null;
  refLabel: string;
  catNo: string;
  catLabel: string;
  onClose: () => void;
  onRequestScope: () => void;
}

export function ServiceDetailDrawer({
  open,
  service,
  refLabel,
  catNo,
  catLabel,
  onClose,
  onRequestScope,
}: Props) {
  const processSteps = service?.workflow
    ? service.workflow
        .split(/→|->/)
        .map((s) => s.trim().replace(/\.$/, ""))
        .filter((s) => s.length > 1)
    : [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="sv2-sheet-content p-0 w-full sm:max-w-[720px] sm:w-[720px] border-l-0"
      >
        <SheetTitle className="sr-only">
          {service?.title ?? "Service details"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {service?.description ?? ""}
        </SheetDescription>

        {service ? (
          <div className="sv2-drawer-frame">
            <header className="sv2-drawer-header">
              <span className="sv2-drawer-crumb">
                SERVICES · {catLabel.toUpperCase()} · {refLabel}
              </span>
            </header>

            <div className="sv2-drawer-body">
              <div className="sv2-drawer-eyebrow">
                CATEGORY {catNo} · {catLabel.toUpperCase()} · {refLabel}
              </div>
              <h2 className="sv2-drawer-title">{service.title}</h2>
              <p className="sv2-drawer-lead">{service.description}</p>

              <div className="sv2-drawer-tags">
                {service.kind ? (
                  <span className="sv2-drawer-tag">{service.kind}</span>
                ) : null}
                {service.deliveryTimeline ? (
                  <span className="sv2-drawer-tag">
                    {service.deliveryTimeline}
                  </span>
                ) : null}
                {service.paymentTerms ? (
                  <span className="sv2-drawer-tag">{service.paymentTerms}</span>
                ) : null}
              </div>

              <section className="sv2-drawer-section">
                <h3 className="sv2-drawer-h3">At a glance</h3>
                <div className="sv2-drawer-glance">
                  <div className="sv2-drawer-glance-item">
                    <span className="sv2-drawer-lab">Service fee</span>
                    <span className="sv2-drawer-val">
                      {service.price ?? "Scoped per job"}
                    </span>
                  </div>
                  <div className="sv2-drawer-glance-item">
                    <span className="sv2-drawer-lab">Typical duration</span>
                    <span className="sv2-drawer-val">
                      {service.deliveryTimeline ?? "Scoped per job"}
                    </span>
                  </div>
                  <div className="sv2-drawer-glance-item">
                    <span className="sv2-drawer-lab">Anchor kind</span>
                    <span className="sv2-drawer-val">{service.kind ?? "—"}</span>
                  </div>
                  <div className="sv2-drawer-glance-item">
                    <span className="sv2-drawer-lab">Reference</span>
                    <span className="sv2-drawer-val">{refLabel}</span>
                  </div>
                </div>
              </section>

              {processSteps.length > 0 ? (
                <section className="sv2-drawer-section">
                  <h3 className="sv2-drawer-h3">Process</h3>
                  <ol className="sv2-drawer-steps">
                    {processSteps.map((step, i) => (
                      <li className="sv2-drawer-step" key={i}>
                        <span className="sv2-drawer-step-n">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="sv2-drawer-step-t">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {service.engagementCovers ? (
                <section className="sv2-drawer-section">
                  <h3 className="sv2-drawer-h3">Engagement covers</h3>
                  <p className="sv2-drawer-prose">{service.engagementCovers}</p>
                </section>
              ) : null}

              {(service.authority || service.legal) && (
                <section className="sv2-drawer-section">
                  <h3 className="sv2-drawer-h3">Authority &amp; legal basis</h3>
                  <dl className="sv2-drawer-dl">
                    {service.authority ? (
                      <div>
                        <dt>Authority</dt>
                        <dd>{service.authority}</dd>
                      </div>
                    ) : null}
                    {service.legal ? (
                      <div>
                        <dt>Legal basis</dt>
                        <dd>{service.legal}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>
              )}

              {service.notes ? (
                <section className="sv2-drawer-section">
                  <h3 className="sv2-drawer-h3">Notes</h3>
                  <p className="sv2-drawer-prose">{service.notes}</p>
                </section>
              ) : null}
            </div>

            <footer className="sv2-drawer-footer">
              <div className="sv2-drawer-foot-meta">
                <span className="sv2-drawer-foot-fee">{service.price ?? "—"}</span>
                <span className="sv2-drawer-foot-dur">
                  {service.deliveryTimeline ?? "Scoped per job"}
                </span>
              </div>
              <button
                type="button"
                className="sv2-drawer-cta"
                onClick={onRequestScope}
              >
                Request scope <span aria-hidden="true">→</span>
              </button>
            </footer>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}