"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Checkbox, Input, Modal, Select, Tabs, Textarea } from "@/components/ui";
import { useAuth } from "@/providers";
import type { Gender } from "@/types";

function getString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function validatePassword(password: string) {
  return password.length >= 6;
}

export default function SignupPage() {
  const router = useRouter();
  const { registerListener, submitArtistApplication } = useAuth();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [listenerError, setListenerError] = useState("");
  const [artistError, setArtistError] = useState("");
  const [artistSuccess, setArtistSuccess] = useState("");

  const handleListenerSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setListenerError("");

    const formData = new FormData(event.currentTarget);
    const displayName = getString(formData, "displayName");
    const email = getString(formData, "email");
    const password = getString(formData, "password");
    const confirmPassword = getString(formData, "confirmPassword");
    const birthDate = getString(formData, "birthDate");
    const gender = getString(formData, "gender") as Gender;

    if (!displayName || !email || !password || !confirmPassword || !birthDate || !gender) {
      setListenerError("Please fill in all required fields.");
      return;
    }

    if (!validatePassword(password)) {
      setListenerError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setListenerError("Password and confirmation do not match.");
      return;
    }

    if (!acceptedPrivacyPolicy) {
      setListenerError("You must accept the privacy policy before creating an account.");
      return;
    }

    const result = registerListener({
      displayName,
      email,
      password,
      birthDate,
      gender
    });

    if (!result.ok) {
      setListenerError(result.error ?? "Could not create the account.");
      return;
    }

    router.push("/");
  };

  const handleArtistSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setArtistError("");
    setArtistSuccess("");

    const formData = new FormData(event.currentTarget);
    const email = getString(formData, "artistEmail");
    const password = getString(formData, "artistPassword");
    const stageName = getString(formData, "stageName");
    const portfolioSamples = getString(formData, "portfolioSamples");

    if (!email || !password || !stageName || !portfolioSamples) {
      setArtistError("Please fill in all artist application fields.");
      return;
    }

    if (!validatePassword(password)) {
      setArtistError("Password must be at least 6 characters.");
      return;
    }

    const result = submitArtistApplication({
      email,
      password,
      stageName,
      portfolioSamples
    });

    if (!result.ok || !result.data) {
      setArtistError(result.error ?? "Could not submit the artist application.");
      return;
    }

    event.currentTarget.reset();
    setArtistSuccess(`${result.data.stageName} is now in pending approval status.`);
  };

  return (
    <AuthLayout
      description="Create a listener account or submit an artist application for review."
      title="Create account"
    >
      <Tabs
        tabs={[
          {
            id: "listener",
            label: "Listener",
            content: (
              <form className="space-y-4" onSubmit={handleListenerSignup}>
                <Input label="Display name" name="displayName" placeholder="Maya Stone" required />
                <Input autoComplete="email" label="Email" name="email" placeholder="maya@example.com" required type="email" />
                <Input
                  autoComplete="new-password"
                  label="Password"
                  name="password"
                  placeholder="At least 6 characters"
                  required
                  type="password"
                />
                <Input
                  autoComplete="new-password"
                  label="Confirm password"
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  required
                  type="password"
                />
                <Input label="Birth date" name="birthDate" required type="date" />
                <Select
                  defaultValue=""
                  label="Gender"
                  name="gender"
                  options={[
                    { label: "Select gender", value: "" },
                    { label: "Female", value: "female" },
                    { label: "Male", value: "male" },
                    { label: "Other", value: "other" },
                    { label: "Prefer not to say", value: "prefer_not_to_say" }
                  ]}
                  required
                />
                <Checkbox
                  checked={acceptedPrivacyPolicy}
                  label={
                    <>
                      I accept the{" "}
                      <button
                        className="text-brand-500 hover:text-brand-600"
                        onClick={(event) => {
                          event.preventDefault();
                          setPrivacyOpen(true);
                        }}
                        type="button"
                      >
                        privacy policy
                      </button>
                    </>
                  }
                  name="privacyPolicy"
                  onChange={(event) => setAcceptedPrivacyPolicy(event.target.checked)}
                />
                {listenerError ? <p className="text-sm text-red-300">{listenerError}</p> : null}
                <Button className="w-full" type="submit">
                  Sign up as listener
                </Button>
              </form>
            )
          },
          {
            id: "artist",
            label: "Artist",
            content: (
              <form className="space-y-4" onSubmit={handleArtistSignup}>
                <Input autoComplete="email" label="Email" name="artistEmail" placeholder="artist@example.com" required type="email" />
                <Input
                  autoComplete="new-password"
                  label="Password"
                  name="artistPassword"
                  placeholder="At least 6 characters"
                  required
                  type="password"
                />
                <Input label="Stage name" name="stageName" placeholder="Orbit Bloom" required />
                <Textarea
                  helperText="Add links, release notes, or a short description of your sample works."
                  label="Portfolio samples"
                  name="portfolioSamples"
                  placeholder="https://soundcloud.com/example, demo album notes, live performance links..."
                  required
                />
                {artistError ? <p className="text-sm text-red-300">{artistError}</p> : null}
                {artistSuccess ? <p className="text-sm text-brand-500">{artistSuccess}</p> : null}
                <Button className="w-full" type="submit">
                  Submit artist application
                </Button>
              </form>
            )
          }
        ]}
      />

      <p className="mt-4 text-sm text-slate-400">
        Already have an account?{" "}
        <Link className="text-slate-100 hover:text-brand-500" href="/login">
          Log in
        </Link>
      </p>

      <Modal onClose={() => setPrivacyOpen(false)} open={privacyOpen} title="Privacy policy">
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            SoundWave uses your account information to create your profile, protect access to your account, and
            personalize the app experience.
          </p>
          <p>
            For this Phase 1 mock app, signup data is stored only in this browser session and local storage. A real
            backend would replace this with secure server-side storage.
          </p>
        </div>
      </Modal>
    </AuthLayout>
  );
}
