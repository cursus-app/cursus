type AnalyticsEvent =
  | 'signup_started'
  | 'signup_completed'
  | 'first_submission'
  | 'harness_validated'
  | 'capstone_submitted'
  | 'certificate_issued'
  | 'feature_flag_activated'
  | 'cursus_created'
  | 'cursus_published'
  | 'cursus_archived'
  | 'cursus_deleted'
  | 'cursus_cloned'
  | 'theme_toggled';

type AnalyticsProps = Record<string, string | number | boolean>;

type PlausibleFn = (event: string, opts?: { props?: AnalyticsProps }) => void;

export function useAnalytics() {
  function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
    if (!import.meta.client) {
      return;
    }
    if (navigator.doNotTrack === '1') {
      return;
    }

    const win = window as Window & { plausible?: PlausibleFn };
    if (typeof win.plausible === 'function') {
      win.plausible(event, props !== undefined ? { props } : undefined);
    }
  }

  return { track };
}
