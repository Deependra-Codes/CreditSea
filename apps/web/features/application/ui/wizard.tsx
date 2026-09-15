"use client";

import type { ApplicationResponse, ProfileResponse, SalarySlipResponse } from "@lms/contracts";
import { useState } from "react";
import { type WizardStep, currentStep } from "../model/step";
import { EligibilityForm } from "./eligibility-form";
import { LoanConfigurator } from "./loan-configurator";
import { SlipUpload } from "./slip-upload";
import { WizardSteps } from "./wizard-steps";

const HEADING: Record<WizardStep, { title: string; blurb: string }> = {
  2: {
    title: "Your details",
    blurb: "We check four things. All of them have to pass before you can apply.",
  },
  3: {
    title: "Salary slip",
    blurb: "A recent slip, so the sanction team can verify the income you entered.",
  },
  4: {
    title: "Your loan",
    blurb: "Move the sliders. The total updates as you go — nothing is submitted until you apply.",
  },
};

export function Wizard({ initial }: { initial: ApplicationResponse }) {
  const [application, setApplication] = useState(initial);
  const step = currentStep(application);
  const heading = HEADING[step];

  const withProfile = (profile: ProfileResponse) =>
    setApplication((previous) => ({ ...previous, profile }));

  const withSlip = (salarySlip: SalarySlipResponse) =>
    setApplication((previous) =>
      previous.profile ? { ...previous, profile: { ...previous.profile, salarySlip } } : previous,
    );

  return (
    <div className="flex flex-col gap-7">
      <WizardSteps current={step} />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{heading.title}</h1>
        <p className="text-sm text-ink-2">{heading.blurb}</p>
      </div>

      <div className="rounded-card border border-line bg-canvas p-5 shadow-lift-1 sm:p-6">
        {step === 2 && (
          <EligibilityForm
            profile={application.profile}
            serverBre={application.profile?.bre ?? null}
            onPassed={withProfile}
          />
        )}
        {step === 3 && <SlipUpload onUploaded={withSlip} />}
        {step === 4 && <LoanConfigurator />}
      </div>
    </div>
  );
}
