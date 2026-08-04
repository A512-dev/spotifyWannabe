"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Checkbox, Input, Modal, Select, Tabs, Textarea } from "@/components/ui";
import { useAuth } from "@/providers";
import type { Gender } from "@/types";

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item.trim() : "";
}

export default function SignupPage() {
  const router = useRouter();
  const { registerListener, submitArtistApplication } = useAuth();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [listenerError, setListenerError] = useState("");
  const [artistError, setArtistError] = useState("");
  const [artistSuccess, setArtistSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleListenerSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = value(formData, "password");
    const confirmation = value(formData, "confirmPassword");
    setListenerError("");
    if (password !== confirmation) {
      setListenerError("Password and confirmation do not match.");
      return;
    }
    if (!acceptedPrivacyPolicy) {
      setListenerError("You must accept the privacy policy.");
      return;
    }
    setSubmitting(true);
    const result = await registerListener({
      displayName: value(formData, "displayName"),
      email: value(formData, "email"),
      password,
      birthDate: value(formData, "birthDate"),
      gender: value(formData, "gender") as Gender,
      acceptsPrivacyPolicy: true
    });
    setSubmitting(false);
    if (!result.ok) {
      setListenerError(result.error ?? "Could not create the account.");
      return;
    }
    router.push("/");
  };

  const handleArtistSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = value(formData, "artistPassword");
    const confirmation = value(formData, "artistConfirmPassword");
    const sampleLink = value(formData, "portfolioLink");
    const files = Array.from((form.elements.namedItem("portfolioFiles") as HTMLInputElement | null)?.files ?? []);
    setArtistError("");
    setArtistSuccess("");
    if (password !== confirmation) {
      setArtistError("Password and confirmation do not match.");
      return;
    }
    if (!sampleLink && files.length === 0) {
      setArtistError("Provide at least one portfolio link or file.");
      return;
    }
    if (!acceptedPrivacyPolicy) {
      setArtistError("You must accept the privacy policy.");
      return;
    }
    setSubmitting(true);
    const result = await submitArtistApplication({
      email: value(formData, "artistEmail"),
      password,
      stageName: value(formData, "stageName"),
      portfolioDescription: value(formData, "portfolioDescription"),
      sampleLinks: sampleLink ? [sampleLink] : [],
      sampleFiles: files,
      acceptsPrivacyPolicy: true
    });
    setSubmitting(false);
    if (!result.ok || !result.data) {
      setArtistError(result.error ?? "Could not submit the artist application.");
      return;
    }
    form.reset();
    setArtistSuccess(`${result.data.stageName} is now pending approval.`);
    router.push("/notifications");
  };

  const privacyCheckbox = (
    <Checkbox
      checked={acceptedPrivacyPolicy}
      label={<span>I accept the <button className="text-brand-500" onClick={() => setPrivacyOpen(true)} type="button">privacy policy</button></span>}
      name="privacyPolicy"
      onChange={(event) => setAcceptedPrivacyPolicy(event.target.checked)}
    />
  );

  return (
    <AuthLayout description="Create a listener account or submit an artist application for review." title="Create account">
      <Tabs tabs={[
        {
          id: "listener",
          label: "Listener",
          content: (
            <form className="space-y-4" onSubmit={handleListenerSignup}>
              <Input label="Display name" name="displayName" required />
              <Input label="Email" name="email" required type="email" />
              <Input label="Password" name="password" required type="password" />
              <Input label="Confirm password" name="confirmPassword" required type="password" />
              <Input label="Birth date" name="birthDate" required type="date" />
              <Select label="Gender" name="gender" options={[
                { label: "Select gender", value: "" },
                { label: "Female", value: "female" },
                { label: "Male", value: "male" },
                { label: "Other", value: "other" },
                { label: "Prefer not to say", value: "prefer_not_to_say" }
              ]} required />
              {privacyCheckbox}
              {listenerError ? <p className="text-sm text-red-300">{listenerError}</p> : null}
              <Button className="w-full" disabled={submitting} type="submit">Sign up as listener</Button>
            </form>
          )
        },
        {
          id: "artist",
          label: "Artist",
          content: (
            <form className="space-y-4" onSubmit={handleArtistSignup}>
              <Input label="Email" name="artistEmail" required type="email" />
              <Input label="Password" name="artistPassword" required type="password" />
              <Input label="Confirm password" name="artistConfirmPassword" required type="password" />
              <Input label="Stage name" name="stageName" required />
              <Textarea label="Portfolio description" name="portfolioDescription" />
              <Input label="Portfolio link" name="portfolioLink" placeholder="https://..." type="url" />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200" htmlFor="portfolioFiles">Portfolio files</label>
                <input className="block w-full text-sm text-slate-300" id="portfolioFiles" multiple name="portfolioFiles" type="file" />
              </div>
              {privacyCheckbox}
              {artistError ? <p className="text-sm text-red-300">{artistError}</p> : null}
              {artistSuccess ? <p className="text-sm text-brand-500">{artistSuccess}</p> : null}
              <Button className="w-full" disabled={submitting} type="submit">Submit artist application</Button>
            </form>
          )
        }
      ]} />
      <p className="mt-4 text-sm text-slate-400">Already have an account? <Link className="text-slate-50" href="/login">Log in</Link></p>
      <Modal onClose={() => setPrivacyOpen(false)} open={privacyOpen} title="Privacy policy">
        <p className="text-sm leading-6 text-slate-300">SoundWave stores account, listening, playlist, support, and payment data only to provide the service. Uploaded media and profile information are handled according to the project requirements.</p>
      </Modal>
    </AuthLayout>
  );
}
