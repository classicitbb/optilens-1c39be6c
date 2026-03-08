import { differenceInCalendarDays, endOfWeek, format, isWithinInterval, parseISO, startOfWeek, subWeeks } from "date-fns";
import { MoonshotState } from "./store";
import { BusinessPlan, Issue, Meeting, Metric, Todo } from "./types";

const safePct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

const getWeekStartIndex = (weekStart: MoonshotState["settings"]["weekStart"]) => (weekStart === "Monday" ? 1 : 0);

const getMetricLatest = (metric: Metric) => metric.points[metric.points.length - 1]?.value ?? metric.actual;
const getMetricPrevious = (metric: Metric) => metric.points[metric.points.length - 2]?.value ?? metric.actual;

const isMetricOnTrack = (value: number, metric: Metric) => value >= metric.target;

const normalizeBusinessPlanFields = (plan: BusinessPlan) => {
  const future = plan.futureFocus;
  const shortTerm = plan.shortTermFocus;

  return [
    ...future.coreValues,
    future.bhag,
    future.threeYearVision.revenue,
    future.threeYearVision.mrr,
    future.threeYearVision.nrr,
    future.threeYearVision.grossMargin,
    future.threeYearVision.customers,
    future.marketingStrategy.targetMarket,
    future.marketingStrategy.differentiators,
    future.marketingStrategy.guarantee,
    future.marketingStrategy.process,
    future.coreFocus,
    future.coachesAndAdvisors,
    future.richNotes,
    shortTerm.oneYearPlan,
    shortTerm.quarterlyGoals,
    shortTerm.keyInitiatives,
    shortTerm.obstacles,
    shortTerm.rocksSummary,
    shortTerm.notes,
  ];
};

const isOverdueTodo = (todo: Todo, now: Date) => !todo.completed && parseISO(todo.dueDate) < now;

const getIssueAge = (issue: Issue, meetingsById: Map<string, Meeting>, now: Date) => {
  const anchorDate = issue.meetingId ? meetingsById.get(issue.meetingId)?.date : undefined;
  if (!anchorDate) return 0;
  return Math.max(0, differenceInCalendarDays(now, parseISO(anchorDate)));
};

export const selectDashboardKpis = (state: MoonshotState) => {
  const now = new Date();
  const weekStartsOn = getWeekStartIndex(state.settings.weekStart);
  const thisWeek = { start: startOfWeek(now, { weekStartsOn }), end: endOfWeek(now, { weekStartsOn }) };

  const meetingsThisWeek = state.meetings.filter((meeting) => {
    const meetingDate = parseISO(meeting.date);
    return isWithinInterval(meetingDate, thisWeek);
  });

  const meetingsCompletedThisWeek = meetingsThisWeek.filter((meeting) => meeting.status === "Completed").length;

  const metricsOnTrack = state.metrics.filter((metric) => isMetricOnTrack(getMetricLatest(metric), metric));
  const metricsOnTrackPct = safePct(metricsOnTrack.length, state.metrics.length);
  const previousOnTrackPct = safePct(
    state.metrics.filter((metric) => isMetricOnTrack(getMetricPrevious(metric), metric)).length,
    state.metrics.length,
  );

  const rocksOnTrackCount = state.rocks.filter((rock) => rock.status === "On Track" || rock.status === "Completed").length;
  const nowQuarter = Math.floor(now.getMonth() / 3);
  const rocksCompletedThisQuarter = state.rocks.filter((rock) => {
    const dueDate = parseISO(rock.dueDate);
    return rock.status === "Completed" && Math.floor(dueDate.getMonth() / 3) === nowQuarter && dueDate.getFullYear() === now.getFullYear();
  }).length;

  const openTodos = state.todos.filter((todo) => !todo.completed).length;
  const completedTodos = state.todos.filter((todo) => todo.completed).length;
  const overdueTodos = state.todos.filter((todo) => isOverdueTodo(todo, now)).length;

  const openIssues = state.issues.filter((issue) => issue.status !== "Resolved");
  const resolvedIssues = state.issues.filter((issue) => issue.status === "Resolved").length;
  const meetingsById = new Map(state.meetings.map((meeting) => [meeting.id, meeting]));
  const avgOpenIssueAge = openIssues.length
    ? Math.round(openIssues.reduce((sum, issue) => sum + getIssueAge(issue, meetingsById, now), 0) / openIssues.length)
    : 0;

  const businessPlanFields = normalizeBusinessPlanFields(state.businessPlan);
  const completedBusinessPlanFields = businessPlanFields.filter((field) => String(field).trim().length > 0).length;

  return {
    meetings: {
      thisWeek: meetingsThisWeek.length,
      completionRate: safePct(meetingsCompletedThisWeek, meetingsThisWeek.length),
    },
    metrics: {
      onTrackPct: metricsOnTrackPct,
      offTrackCount: Math.max(0, state.metrics.length - metricsOnTrack.length),
      trendDelta: metricsOnTrackPct - previousOnTrackPct,
    },
    rocks: {
      onTrackPct: safePct(rocksOnTrackCount, state.rocks.length),
      completedThisQuarter: rocksCompletedThisQuarter,
      atRiskCount: state.rocks.filter((rock) => rock.status === "At Risk").length,
    },
    todos: {
      open: openTodos,
      completed: completedTodos,
      overdue: overdueTodos,
    },
    issues: {
      open: openIssues.length,
      resolved: resolvedIssues,
      avgAgeDays: avgOpenIssueAge,
    },
    businessPlan: {
      completionPct: safePct(completedBusinessPlanFields, businessPlanFields.length),
    },
  };
};

export const selectScorecardTrend = (state: MoonshotState) => {
  const windowSize = 6;
  return Array.from({ length: windowSize }, (_, idx) => {
    const windowIndex = idx - windowSize;
    const label = format(subWeeks(new Date(), Math.abs(windowIndex + 1)), "MMM d");
    const onTrackCount = state.metrics.filter((metric) => {
      const point = metric.points[metric.points.length + windowIndex];
      if (!point) return false;
      return isMetricOnTrack(point.value, metric);
    }).length;

    return {
      label,
      onTrackPct: safePct(onTrackCount, state.metrics.length),
      avgActual: state.metrics.length
        ? Math.round(
            state.metrics.reduce((sum, metric) => {
              const point = metric.points[metric.points.length + windowIndex];
              return sum + (point?.value ?? getMetricLatest(metric));
            }, 0) / state.metrics.length,
          )
        : 0,
    };
  });
};

export const selectExecutionTrend = (state: MoonshotState) => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, idx) => {
    const anchor = subWeeks(now, 5 - idx);
    const label = format(anchor, "MMM d");

    const todosDue = state.todos.filter((todo) => parseISO(todo.dueDate) <= anchor);
    const todosCompleted = todosDue.filter((todo) => todo.completed).length;
    const issuesKnown = state.issues.filter((issue) => {
      const meetingDate = issue.meetingId ? state.meetings.find((meeting) => meeting.id === issue.meetingId)?.date : undefined;
      return meetingDate ? parseISO(meetingDate) <= anchor : false;
    });
    const issuesResolved = issuesKnown.filter((issue) => issue.status === "Resolved").length;

    return {
      label,
      todoCompletionPct: safePct(todosCompleted, todosDue.length),
      issueResolutionPct: safePct(issuesResolved, issuesKnown.length),
      rockOnTrackPct: safePct(
        state.rocks.filter((rock) => rock.status === "On Track" || rock.status === "Completed").length,
        state.rocks.length,
      ),
    };
  });
};
