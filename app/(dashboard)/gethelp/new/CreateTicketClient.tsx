"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createTicketAction } from "@/app/(dashboard)/gethelp/actions";
import type { UserProfile } from "@/lib/supabase/profile";

interface CreateTicketClientProps {
  userProfile: UserProfile;
}

export function CreateTicketClient({ userProfile }: CreateTicketClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState("General Inquiry");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const canSubmit = subject.trim().length > 0 && description.trim().length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    const email = userProfile.email;
    const fullTitle = `[${category}] ${subject.trim()}`;

    try {
      const ticket = await createTicketAction({
        email,
        title: fullTitle,
        description: description.trim(),
      });
      toast.success("Support ticket created successfully!");
      router.push(`/gethelp/${ticket.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create ticket");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto space-y-6 px-4 py-6 md:px-6 md:py-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight">Submit a Ticket</h1>
            <p className="text-sm text-muted-foreground">
              Describe the issue you&apos;re experiencing and we&apos;ll resolve it as soon as possible.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => router.push("/gethelp")}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Submit Ticket
            </Button>
          </div>
        </div>

        {/* ── Ticket Fields ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Ticket Details</CardTitle>
              <CardDescription>Specify the category and describe your issue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bug Report">Bug Report</SelectItem>
                    <SelectItem value="Feature Request">Feature Request</SelectItem>
                    <SelectItem value="Account Issue">Account Issue</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="e.g. Profile picture upload failing"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Details / Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about the issue. Please include steps to reproduce if applicable..."
                  className="min-h-[160px] resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Contact Information</CardTitle>
              <CardDescription>The email address associated with your ticket.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Registered Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userProfile.email}
                  readOnly
                  className="bg-muted cursor-not-allowed text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Our support team will send updates to your registered account email.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
