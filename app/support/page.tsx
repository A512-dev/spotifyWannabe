"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Button, Card, Modal, Table, Tabs, Textarea, type TableColumn } from "@/components/ui";
import { artistApprovalRequests } from "@/data/artist-approval-requests";
import { artists } from "@/data/artists";
import { ticketMessages as initialTicketMessages, tickets as initialTickets } from "@/data/tickets";
import { users } from "@/data/users";
import { formatDate } from "@/lib/formatters";
import { useAuth } from "@/providers";
import type { ApprovalStatus, Ticket, TicketMessage, TicketPriority, TicketStatus } from "@/types/domain";

interface ApprovalQueueItem {
  id: string;
  source: "seed" | "signup";
  artistProfileId?: string;
  stageName: string;
  email: string;
  portfolioSamples: string;
  status: ApprovalStatus;
  submittedAt: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

interface ReviewOverride {
  status: ApprovalStatus;
  reviewedByUserId: string;
  reviewedAt: string;
  reviewNote: string;
}

const statusToneMap: Record<TicketStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  open: "info",
  waiting_for_user: "warning",
  resolved: "success",
  closed: "neutral"
};

const priorityToneMap: Record<TicketPriority, "neutral" | "success" | "warning" | "danger" | "info"> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "danger"
};

const approvalToneMap: Record<ApprovalStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger"
};

function findUserName(userId?: string) {
  if (!userId) {
    return "Unassigned";
  }

  return users.find((user) => user.id === userId)?.displayName ?? "Unknown user";
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSeedApprovalItems(): ApprovalQueueItem[] {
  return artistApprovalRequests.map((request) => {
    const artist = artists.find((item) => item.id === request.artistProfileId);
    const requester = users.find((user) => user.id === request.requestedByUserId);

    return {
      id: request.id,
      source: "seed",
      artistProfileId: request.artistProfileId,
      stageName: artist?.stageName ?? "Unknown artist",
      email: requester?.email ?? "unknown@example.com",
      portfolioSamples: artist
        ? `${artist.bio}\n\nGenres: ${artist.genreTags.join(", ")}`
        : "No portfolio samples were provided.",
      status: request.status,
      submittedAt: request.submittedAt,
      reviewedByUserId: request.reviewedByUserId,
      reviewedAt: request.reviewedAt,
      reviewNote: request.reviewNote
    };
  });
}

export default function SupportPage() {
  const { artistApplications, currentUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>(initialTicketMessages);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(initialTickets[0]?.id ?? "");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus | "all">("all");
  const [replyBody, setReplyBody] = useState("");
  const [internalNoteBody, setInternalNoteBody] = useState("");
  const [reviewOverrides, setReviewOverrides] = useState<Record<string, ReviewOverride>>({});
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const approvalItems = useMemo<ApprovalQueueItem[]>(() => {
    const signupApplications: ApprovalQueueItem[] = artistApplications.map((application) => ({
      id: application.id,
      source: "signup",
      stageName: application.stageName,
      email: application.email,
      portfolioSamples: application.portfolioSamples,
      status: application.status,
      submittedAt: application.submittedAt
    }));

    return [...normalizeSeedApprovalItems(), ...signupApplications].map((item) => {
      const override = reviewOverrides[item.id];

      if (!override) {
        return item;
      }

      return {
        ...item,
        status: override.status,
        reviewedByUserId: override.reviewedByUserId,
        reviewedAt: override.reviewedAt,
        reviewNote: override.reviewNote
      };
    });
  }, [artistApplications, reviewOverrides]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0],
    [selectedTicketId, tickets]
  );

  const selectedTicketMessages = useMemo(() => {
    if (!selectedTicket) {
      return [];
    }

    return ticketMessages
      .filter((message) => message.ticketId === selectedTicket.id)
      .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
  }, [selectedTicket, ticketMessages]);

  const filteredTickets = useMemo(() => {
    if (ticketStatusFilter === "all") {
      return tickets;
    }

    return tickets.filter((ticket) => ticket.status === ticketStatusFilter);
  }, [ticketStatusFilter, tickets]);

  const selectedApproval = useMemo(
    () => approvalItems.find((item) => item.id === selectedApprovalId) ?? null,
    [approvalItems, selectedApprovalId]
  );

  const openTicketsCount = tickets.filter((ticket) => ticket.status === "open").length;
  const pendingApprovalsCount = approvalItems.filter((item) => item.status === "pending").length;
  const urgentTicketsCount = tickets.filter((ticket) => ticket.priority === "urgent" || ticket.priority === "high").length;

  const updateTicketStatus = (ticketId: string, status: TicketStatus) => {
    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status,
              updatedAt: new Date().toISOString()
            }
          : ticket
      )
    );
  };

  const addTicketMessage = (body: string, isInternalNote: boolean) => {
    if (!selectedTicket || !body.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const message: TicketMessage = {
      id: createId(isInternalNote ? "internal-note" : "support-reply"),
      ticketId: selectedTicket.id,
      senderId: currentUser?.id ?? "user-support-1",
      body: body.trim(),
      isInternalNote,
      createdAt: now
    };

    setTicketMessages((currentMessages) => [...currentMessages, message]);
    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.id === selectedTicket.id
          ? {
              ...ticket,
              status: isInternalNote ? ticket.status : "waiting_for_user",
              assignedSupportUserId: currentUser?.id ?? ticket.assignedSupportUserId,
              updatedAt: now
            }
          : ticket
      )
    );

    if (isInternalNote) {
      setInternalNoteBody("");
    } else {
      setReplyBody("");
    }
  };

  const reviewArtistRequest = (approvalId: string, status: "approved" | "rejected") => {
    if (status === "rejected" && !reviewNote.trim()) {
      return;
    }

    setReviewOverrides((currentOverrides) => ({
      ...currentOverrides,
      [approvalId]: {
        status,
        reviewedByUserId: currentUser?.id ?? "user-support-1",
        reviewedAt: new Date().toISOString(),
        reviewNote: reviewNote.trim() || "Approved after portfolio review."
      }
    }));
    setSelectedApprovalId(null);
    setReviewNote("");
  };

  const ticketColumns: TableColumn<Ticket>[] = [
    {
      key: "subject",
      header: "Subject",
      render: (ticket) => (
        <button className="text-left font-medium text-slate-50 hover:text-brand-500" onClick={() => setSelectedTicketId(ticket.id)} type="button">
          {ticket.subject}
        </button>
      )
    },
    {
      key: "requester",
      header: "Requester",
      render: (ticket) => findUserName(ticket.requesterId)
    },
    {
      key: "status",
      header: "Status",
      render: (ticket) => <Badge tone={statusToneMap[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
    },
    {
      key: "priority",
      header: "Priority",
      render: (ticket) => <Badge tone={priorityToneMap[ticket.priority]}>{ticket.priority}</Badge>
    },
    {
      key: "updated",
      header: "Updated",
      render: (ticket) => formatDate(ticket.updatedAt)
    }
  ];

  const approvalColumns: TableColumn<ApprovalQueueItem>[] = [
    {
      key: "stageName",
      header: "Artist",
      render: (item) => (
        <div>
          <p className="font-medium text-slate-50">{item.stageName}</p>
          <p className="text-xs text-slate-400">{item.email}</p>
        </div>
      )
    },
    {
      key: "source",
      header: "Source",
      render: (item) => <Badge>{item.source === "seed" ? "Mock data" : "Signup form"}</Badge>
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <Badge tone={approvalToneMap[item.status]}>{item.status}</Badge>
    },
    {
      key: "submitted",
      header: "Submitted",
      render: (item) => formatDate(item.submittedAt)
    },
    {
      key: "actions",
      header: "Actions",
      render: (item) => (
        <Button onClick={() => setSelectedApprovalId(item.id)} size="sm" variant="secondary">
          Review
        </Button>
      )
    }
  ];

  const ticketWorkspace = (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Ticket queue</h2>
            <p className="mt-1 text-sm text-slate-400">Select a ticket to open the conversation workspace.</p>
          </div>
          <select
            className="h-10 rounded-md border border-surface-600 bg-surface-800 px-3 text-sm text-slate-50 outline-none focus:border-brand-500"
            onChange={(event) => setTicketStatusFilter(event.target.value as TicketStatus | "all")}
            value={ticketStatusFilter}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="waiting_for_user">Waiting for user</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="mt-4">
          <Table columns={ticketColumns} emptyMessage="No tickets match this filter." getRowKey={(ticket) => ticket.id} rows={filteredTickets} />
        </div>
      </Card>

      <Card>
        {selectedTicket ? (
          <>
            <div className="flex flex-col gap-3 border-b border-surface-600 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">{selectedTicket.subject}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Requested by {findUserName(selectedTicket.requesterId)} · Assigned to {findUserName(selectedTicket.assignedSupportUserId)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={statusToneMap[selectedTicket.status]}>{selectedTicket.status.replaceAll("_", " ")}</Badge>
                  <Badge tone={priorityToneMap[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => updateTicketStatus(selectedTicket.id, "resolved")} size="sm" variant="secondary">
                  Resolve
                </Button>
                <Button onClick={() => updateTicketStatus(selectedTicket.id, "closed")} size="sm" variant="ghost">
                  Close
                </Button>
              </div>
            </div>

            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {selectedTicketMessages.length === 0 ? (
                <p className="rounded-md border border-surface-600 bg-surface-900 p-4 text-sm text-slate-400">No messages have been added to this ticket yet.</p>
              ) : (
                selectedTicketMessages.map((message) => (
                  <div
                    className={`rounded-lg border p-3 ${
                      message.isInternalNote
                        ? "border-yellow-500/30 bg-yellow-500/10"
                        : "border-surface-600 bg-surface-900"
                    }`}
                    key={message.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-50">{findUserName(message.senderId)}</p>
                      <div className="flex items-center gap-2">
                        {message.isInternalNote ? <Badge tone="warning">Internal note</Badge> : null}
                        <span className="text-xs text-slate-500">{formatDate(message.createdAt)}</span>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">{message.body}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <Textarea
                  label="Reply to user"
                  name="replyBody"
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder="Write a clear customer-facing response."
                  value={replyBody}
                />
                <Button className="mt-3" disabled={!replyBody.trim()} onClick={() => addTicketMessage(replyBody, false)}>
                  Send reply
                </Button>
              </div>

              <div>
                <Textarea
                  label="Internal note"
                  name="internalNoteBody"
                  onChange={(event) => setInternalNoteBody(event.target.value)}
                  placeholder="Write a note visible only to support/admin users."
                  value={internalNoteBody}
                />
                <Button className="mt-3" disabled={!internalNoteBody.trim()} onClick={() => addTicketMessage(internalNoteBody, true)} variant="secondary">
                  Add note
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Select a ticket to view details.</p>
        )}
      </Card>
    </div>
  );

  const approvalWorkspace = (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Artist approval requests</h2>
          <p className="mt-1 text-sm text-slate-400">
            Review portfolios, approve qualified artists, or reject incomplete applications with a reason.
          </p>
        </div>
        <Badge tone="warning">{pendingApprovalsCount} pending</Badge>
      </div>

      <div className="mt-5">
        <Table columns={approvalColumns} emptyMessage="No artist approval requests found." getRowKey={(item) => item.id} rows={approvalItems} />
      </div>
    </Card>
  );

  return (
    <DashboardLayout eyebrow="Support workspace">
      <PageHeader
        description="Review artist verification requests, handle user tickets, and keep operational queues under control."
        title="Support"
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Open tickets" value={String(openTicketsCount)} />
        <StatCard label="Pending artist approvals" value={String(pendingApprovalsCount)} />
        <StatCard label="High priority tickets" value={String(urgentTicketsCount)} />
      </section>

      <section className="mt-6">
        <Tabs
          defaultTabId="tickets"
          tabs={[
            {
              id: "tickets",
              label: "Support tickets",
              content: ticketWorkspace
            },
            {
              id: "approvals",
              label: "Artist approvals",
              content: approvalWorkspace
            }
          ]}
        />
      </section>

      <Modal open={Boolean(selectedApproval)} title="Review artist request" onClose={() => setSelectedApprovalId(null)}>
        {selectedApproval ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">Artist name</p>
              <p className="text-lg font-semibold text-slate-50">{selectedApproval.stageName}</p>
              <p className="text-sm text-slate-400">{selectedApproval.email}</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-200">Portfolio samples</p>
              <div className="max-h-48 overflow-y-auto rounded-md border border-surface-600 bg-surface-900 p-3 text-sm leading-6 text-slate-300">
                {selectedApproval.portfolioSamples}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-400">Current status</p>
                <Badge tone={approvalToneMap[selectedApproval.status]}>{selectedApproval.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-slate-400">Submitted</p>
                <p className="text-sm text-slate-200">{formatDate(selectedApproval.submittedAt)}</p>
              </div>
            </div>

            {selectedApproval.reviewNote ? (
              <div className="rounded-md border border-surface-600 bg-surface-900 p-3 text-sm text-slate-300">
                <p className="font-medium text-slate-100">Previous review note</p>
                <p className="mt-1">{selectedApproval.reviewNote}</p>
              </div>
            ) : null}

            <Textarea
              helperText="A rejection must include a clear reason. Approval can use the default note."
              label="Review note"
              name="reviewNote"
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Example: Portfolio is complete and metadata is consistent."
              value={reviewNote}
            />

            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => reviewArtistRequest(selectedApproval.id, "rejected")} variant="danger">
                Reject
              </Button>
              <Button onClick={() => reviewArtistRequest(selectedApproval.id, "approved")}>Approve</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
}