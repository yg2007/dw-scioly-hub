/**
 * Prefetch route chunks after initial page load.
 * Uses requestIdleCallback (with setTimeout fallback) to avoid
 * blocking the main thread during dashboard render.
 *
 * Only prefetches once per session — subsequent calls are no-ops.
 */

let prefetched = false;
let studentPrefetched = false;

export function prefetchLikelyRoutes() {
  if (prefetched) return;
  prefetched = true;

  const schedule = typeof requestIdleCallback === "function"
    ? requestIdleCallback
    : (cb) => setTimeout(cb, 2000);

  schedule(() => {
    // Staff routes — most likely next destinations after dashboard
    import("../components/EventsListPage");
    import("../components/SchedulePage");
    import("../components/TeamManagement");
    import("../components/QuestionBankPage");
  });

  // Stagger less-likely routes to avoid bandwidth contention
  setTimeout(() => {
    import("../components/PartnerSynergyPage");
    import("../components/StudentCapabilityMatrix");
    import("../components/BuildLogPage");
    import("../components/SuggestionsPage");
  }, 5000);
}

export function prefetchStudentRoutes() {
  if (studentPrefetched) return;
  studentPrefetched = true;

  const schedule = typeof requestIdleCallback === "function"
    ? requestIdleCallback
    : (cb) => setTimeout(cb, 2000);

  schedule(() => {
    // Student routes — most likely next destinations after dashboard
    import("../components/EventsListPage");
    import("../components/StudyPathPage");
    import("../components/QuizPage");
    import("../components/BuildLogPage");
  });

  // Stagger less-likely routes to avoid bandwidth contention
  setTimeout(() => {
    import("../components/PartnerSynergyPage");
    import("../components/MockTestPage");
    import("../components/CipherDrillPage/CipherDrillPage");
    import("../components/SuggestionsPage");
  }, 5000);
}
