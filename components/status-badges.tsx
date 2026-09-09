"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
import type { DealStatus, LeadStatus, MeetingStatus, TaskPriority, TaskStatus } from "@/lib/types";

const leadColor: Record<LeadStatus, "zinc" | "blue" | "amber" | "green" | "red"> = {
  new_lead: "zinc",
  meeting_scheduled: "blue",
  meeting_completed: "amber",
  deal_closed: "green",
  deal_lost: "red",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { dict } = useI18n();
  return <Badge color={leadColor[status]}>{dict.leadStatus[status]}</Badge>;
}

const meetingColor: Record<MeetingStatus, "zinc" | "blue" | "green" | "red"> = {
  scheduled: "blue",
  completed: "green",
  canceled: "red",
  no_show: "zinc",
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const { dict } = useI18n();
  return <Badge color={meetingColor[status]}>{dict.meetingStatus[status]}</Badge>;
}

const dealColor: Record<DealStatus, "amber" | "green" | "red"> = {
  open: "amber",
  won: "green",
  lost: "red",
};

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const { dict } = useI18n();
  return <Badge color={dealColor[status]}>{dict.dealStatus[status]}</Badge>;
}

const taskStatusColor: Record<TaskStatus, "zinc" | "blue" | "green"> = {
  new: "zinc",
  in_progress: "blue",
  completed: "green",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { dict } = useI18n();
  return <Badge color={taskStatusColor[status]}>{dict.taskStatus[status]}</Badge>;
}

const taskPriorityColor: Record<TaskPriority, "zinc" | "amber" | "red"> = {
  low: "zinc",
  medium: "amber",
  high: "red",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const { dict } = useI18n();
  return <Badge color={taskPriorityColor[priority]}>{dict.taskPriority[priority]}</Badge>;
}
