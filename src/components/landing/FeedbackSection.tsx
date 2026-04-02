"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, CheckCircle2, Loader2 } from "lucide-react";

type FormState = "idle" | "loading" | "success" | "error";

export default function FeedbackSection() {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [message, setMessage]   = useState("");
  const [msgError, setMsgError] = useState("");
  const [state, setState]       = useState<FormState>("idle");
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgError("");
    setApiError("");

    if (!message.trim()) {
      setMsgError("Message is required.");
      return;
    }
    if (message.length > 2000) {
      setMsgError("Message must be under 2000 characters.");
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, email: email || undefined, message }),
      });
      if (res.ok) {
        setState("success");
        setName(""); setEmail(""); setMessage("");
      } else {
        setApiError("Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setApiError("Something went wrong. Please try again.");
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <section id="feedback" className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-orange-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Thank you!</h2>
          <p className="mt-2 text-gray-500">
            Your feedback has been received. We read every message.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            onClick={() => setState("idle")}
          >
            Send another message
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section id="feedback" className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        {/* Heading */}
        <div className="mb-10 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 mb-4">
            <MessageSquare className="h-5 w-5 text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Share Your Feedback
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Found a bug? Have a feature idea? Just want to say hi? We&apos;d love to hear from you.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="fb-name" className="text-sm text-gray-700">
              Name <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="fb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={state === "loading"}
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="fb-email" className="text-sm text-gray-700">
              Email <span className="text-gray-400">(optional — for follow-up)</span>
            </Label>
            <Input
              id="fb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={state === "loading"}
              autoComplete="email"
            />
          </div>

          {/* Message */}
          <div className="space-y-1">
            <Label htmlFor="fb-message" className="text-sm text-gray-700">
              Message <span className="text-orange-500">*</span>
            </Label>
            <Textarea
              id="fb-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think…"
              rows={5}
              disabled={state === "loading"}
              className={msgError ? "border-red-400 focus:border-red-400" : ""}
            />
            {msgError && (
              <p className="text-xs text-red-600 mt-1" role="alert">{msgError}</p>
            )}
            <p className="text-right text-xs text-gray-400">
              {message.length}/2000
            </p>
          </div>

          {/* API error */}
          {state === "error" && apiError && (
            <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2" role="alert">
              {apiError}
            </p>
          )}

          <Button
            type="submit"
            disabled={state === "loading"}
            className="w-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {state === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Feedback
              </>
            )}
          </Button>

          <p className="text-center text-xs text-gray-400">
            Your message is sent directly to the RentIQ team. We read everything.
          </p>
        </form>
      </div>
    </section>
  );
}
