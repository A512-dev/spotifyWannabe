"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Button, Card, Input, Modal, Select, Table, Tabs, Textarea, type TableColumn } from "@/components/ui";
import {
  operationsApi,
  type ArtistApplicationApi,
  type SupportOverviewApi,
  type TicketApi
} from "@/features/operations/api";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { useAuth } from "@/providers";
import type { TicketPriority, TicketStatus } from "@/types/domain";

const statusTone: Record<TicketStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  open: "warning",
  waiting_for_user: "info",
  resolved: "success",
  closed: "neutral"
};

function messageFrom(error: unknown) {
  return error instanceof ApiError ? error.message : "The request could not be completed.";
}

export default function SupportPage() {
  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === "support" || currentUser?.role === "admin";
  const [tickets, setTickets] = useState<TicketApi[]>([]);
  const [applications, setApplications] = useState<ArtistApplicationApi[]>([]);
  const [overview, setOverview] = useState<SupportOverviewApi | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketApi | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ArtistApplicationApi | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>("medium");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotice("");
    try {
      const ticketResponse = await operationsApi.listTickets({ search, status: statusFilter });
      setTickets(ticketResponse.results);
      if (isStaff) {
        const [applicationResponse, supportOverview] = await Promise.all([
          operationsApi.listApplications({ status: "pending" }),
          operationsApi.supportOverview()
        ]);
        setApplications(applicationResponse.results);
        setOverview(supportOverview);
      }
    } catch (error) {
      setNotice(messageFrom(error));
    } finally {
      setLoading(false);
    }
  }, [isStaff, search, statusFilter]);

  useEffect(() => {
    if (currentUser) void loadData();
  }, [currentUser, loadData]);

  const openTicket = async (ticket: TicketApi) => {
    setBusy(true);
    try {
      setSelectedTicket(await operationsApi.getTicket(ticket.id));
    } catch (error) {
      setNotice(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  const refreshSelectedTicket = async () => {
    if (!selectedTicket) return;
    setSelectedTicket(await operationsApi.getTicket(selectedTicket.id));
  };

  const sendMessage = async (body: string, isInternalNote: boolean) => {
    if (!selectedTicket || !body.trim()) return;
    setBusy(true);
    try {
      await operationsApi.addTicketMessage(selectedTicket.id, body.trim(), isInternalNote);
      if (isInternalNote) setInternalNote("");
      else setReplyBody("");
      await refreshSelectedTicket();
      await loadData();
    } catch (error) {
      setNotice(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    setBusy(true);
    try {
      await operationsApi.updateTicketStatus(selectedTicket.id, status);
      await refreshSelectedTicket();
      await loadData();
    } catch (error) {
      setNotice(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  const createTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setBusy(true);
    try {
      await operationsApi.createTicket(ticketSubject.trim(), ticketMessage.trim(), ticketPriority);
      setTicketSubject("");
      setTicketMessage("");
      setTicketPriority("medium");
      setNotice("Ticket created successfully.");
      await loadData();
    } catch (error) {
      setNotice(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  const reviewApplication = async (decision: "approved" | "rejected") => {
    if (!selectedApplication || (decision === "rejected" && !reviewNote.trim())) return;
    setBusy(true);
    try {
      await operationsApi.reviewApplication(selectedApplication.id, decision, reviewNote.trim());
      setSelectedApplication(null);
      setReviewNote("");
      setNotice(`Artist application ${decision}.`);
      await loadData();
    } catch (error) {
      setNotice(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  const ticketColumns = useMemo<TableColumn<TicketApi>[]>(() => [
    {
      key: "subject",
      header: "Subject",
      render: (row) => (
        <button className="font-medium text-slate-50 hover:text-brand-500" onClick={() => void openTicket(row)} type="button">
          {row.subject}
        </button>
      )
    },
    { key: "requester", header: "Requester", render: (row) => row.requesterName ?? row.requesterId },
    { key: "status", header: "Status", render: (row) => <Badge tone={statusTone[row.status]}>{row.status.replaceAll("_", " ")}</Badge> },
    { key: "priority", header: "Priority", render: (row) => <Badge>{row.priority}</Badge> },
    { key: "updated", header: "Updated", render: (row) => formatDate(row.updatedAt) }
  ], []);

  const applicationColumns = useMemo<TableColumn<ArtistApplicationApi>[]>(() => [
    { key: "artist", header: "Artist", render: (row) => <span className="font-medium text-slate-50">{row.stageName}</span> },
    { key: "email", header: "Email", render: (row) => row.email },
    { key: "samples", header: "Samples", render: (row) => String(row.samples.length) },
    { key: "submitted", header: "Submitted", render: (row) => formatDate(row.submittedAt) },
    { key: "actions", header: "Actions", render: (row) => <Button onClick={() => setSelectedApplication(row)} size="sm" variant="secondary">Review</Button> }
  ], []);

  const createTicketPanel = (
    <Card>
      <h2 className="text-lg font-semibold text-slate-50">Create a support ticket</h2>
      <div className="mt-4 grid gap-4">
        <Input label="Subject" maxLength={180} onChange={(event) => setTicketSubject(event.target.value)} value={ticketSubject} />
        <Select
          label="Priority"
          onChange={(event) => setTicketPriority(event.target.value as TicketPriority)}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "urgent", label: "Urgent" }
          ]}
          value={ticketPriority}
        />
        <Textarea label="Describe the problem" onChange={(event) => setTicketMessage(event.target.value)} rows={5} value={ticketMessage} />
        <Button disabled={busy || !ticketSubject.trim() || !ticketMessage.trim()} onClick={() => void createTicket()}>
          Submit ticket
        </Button>
      </div>
    </Card>
  );

  const ticketsPanel = (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Input label="Search tickets" onChange={(event) => setSearch(event.target.value)} value={search} />
        <Select
          label="Status"
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { value: "", label: "All statuses" },
            { value: "open", label: "Open" },
            { value: "waiting_for_user", label: "Waiting for user" },
            { value: "resolved", label: "Resolved" },
            { value: "closed", label: "Closed" }
          ]}
          value={statusFilter}
        />
        <Button className="self-end" disabled={loading} onClick={() => void loadData()} variant="secondary">Refresh</Button>
      </div>
      <Table columns={ticketColumns} emptyMessage={loading ? "Loading tickets..." : "No tickets found."} getRowKey={(row) => row.id} rows={tickets} />
    </div>
  );

  const applicationsPanel = (
    <Table columns={applicationColumns} emptyMessage={loading ? "Loading applications..." : "No pending artist applications."} getRowKey={(row) => row.id} rows={applications} />
  );

  return (
    <DashboardLayout eyebrow={isStaff ? "Support workspace" : "Help center"}>
      <PageHeader
        description={isStaff ? "Review artist applications and manage user support conversations." : "Create a ticket and follow your conversations with the support team."}
        title={isStaff ? "Support dashboard" : "Support"}
      />

      {notice ? <p className="mt-4 rounded-md border border-surface-600 bg-surface-800 p-3 text-sm text-slate-200">{notice}</p> : null}

      {isStaff && overview ? (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Open tickets" value={String(overview.tickets.open)} />
          <StatCard label="Urgent tickets" value={String(overview.urgentOpenTickets)} />
          <StatCard label="Unassigned tickets" value={String(overview.unassignedOpenTickets)} />
          <StatCard label="Pending artists" value={String(overview.artistApplications.pending)} />
        </section>
      ) : null}

      <section className="mt-6">
        <Tabs
          tabs={isStaff
            ? [
                { id: "tickets", label: "Support tickets", content: ticketsPanel },
                { id: "applications", label: "Artist approvals", content: applicationsPanel }
              ]
            : [
                { id: "create", label: "New ticket", content: createTicketPanel },
                { id: "tickets", label: "My tickets", content: ticketsPanel }
              ]}
        />
      </section>

      <Modal onClose={() => setSelectedTicket(null)} open={Boolean(selectedTicket)} title={selectedTicket?.subject ?? "Ticket"}>
        {selectedTicket ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone[selectedTicket.status]}>{selectedTicket.status.replaceAll("_", " ")}</Badge>
              <Badge>{selectedTicket.priority}</Badge>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-surface-600 p-3">
              {(selectedTicket.messages ?? []).map((message) => (
                <article className="rounded-md bg-surface-700 p-3" key={message.id}>
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span>{message.isInternalNote ? "Internal note" : message.senderId}</span>
                    <span>{formatDate(message.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{message.body}</p>
                </article>
              ))}
            </div>
            <Textarea label="Reply" onChange={(event) => setReplyBody(event.target.value)} rows={4} value={replyBody} />
            <Button disabled={busy || !replyBody.trim()} onClick={() => void sendMessage(replyBody, false)}>Send reply</Button>
            {isStaff ? (
              <>
                <Textarea label="Internal note" onChange={(event) => setInternalNote(event.target.value)} rows={3} value={internalNote} />
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy || !internalNote.trim()} onClick={() => void sendMessage(internalNote, true)} variant="secondary">Add internal note</Button>
                  {(["open", "resolved", "closed"] as TicketStatus[]).map((status) => (
                    <Button disabled={busy || selectedTicket.status === status} key={status} onClick={() => void changeStatus(status)} size="sm" variant="ghost">
                      Mark {status}
                    </Button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal onClose={() => setSelectedApplication(null)} open={Boolean(selectedApplication)} title={selectedApplication?.stageName ?? "Artist application"}>
        {selectedApplication ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">{selectedApplication.portfolioDescription || "No description was provided."}</p>
            <div className="space-y-2">
              {selectedApplication.samples.map((sample) => {
                const href = sample.fileUrl || sample.externalUrl;
                return href ? <a className="block rounded-md border border-surface-600 p-3 text-sm text-brand-500 hover:bg-surface-700" href={href} key={sample.id} rel="noreferrer" target="_blank">{sample.title}</a> : null;
              })}
            </div>
            <Textarea label="Review note / rejection reason" onChange={(event) => setReviewNote(event.target.value)} rows={4} value={reviewNote} />
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => void reviewApplication("approved")}>Approve</Button>
              <Button disabled={busy || !reviewNote.trim()} onClick={() => void reviewApplication("rejected")} variant="danger">Reject</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
}
