/**
 * Analytics tracking utility
 * Supports multiple analytics providers (Google Analytics, Mixpanel, Amplitude, etc.)
 * Configured via environment variables
 */

export type AnalyticsProvider = 'ga4' | 'mixpanel' | 'amplitude' | 'none';

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
}

class Analytics {
  private provider: AnalyticsProvider = 'none';
  private isInitialized = false;

  constructor() {
    // Determine provider from environment
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      this.provider = 'ga4';
    } else if (import.meta.env.VITE_MIXPANEL_TOKEN) {
      this.provider = 'mixpanel';
    } else if (import.meta.env.VITE_AMPLITUDE_API_KEY) {
      this.provider = 'amplitude';
    }
  }

  /**
   * Initialize analytics provider
   * Call this once in your app entry point
   */
  init() {
    if (this.isInitialized || this.provider === 'none') return;

    switch (this.provider) {
      case 'ga4':
        this.initGoogleAnalytics();
        break;
      case 'mixpanel':
        this.initMixpanel();
        break;
      case 'amplitude':
        this.initAmplitude();
        break;
    }

    this.isInitialized = true;
    console.log(`📊 Analytics initialized: ${this.provider}`);
  }

  private initGoogleAnalytics() {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!measurementId) return;

    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    const gtag = (...args: any[]) => {
      (window as any).dataLayer.push(...args);
    };
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false, // We'll track page views manually
    });
  }

  private initMixpanel() {
    // Placeholder for Mixpanel initialization
    console.log('Mixpanel initialization - add SDK');
  }

  private initAmplitude() {
    // Placeholder for Amplitude initialization
    console.log('Amplitude initialization - add SDK');
  }

  /**
   * Track a custom event
   */
  track(event: AnalyticsEvent) {
    if (!this.isInitialized || this.provider === 'none') {
      console.log(`[Analytics] ${event.category}: ${event.action}`, event.properties);
      return;
    }

    switch (this.provider) {
      case 'ga4':
        this.trackGA4(event);
        break;
      case 'mixpanel':
        this.trackMixpanel(event);
        break;
      case 'amplitude':
        this.trackAmplitude(event);
        break;
    }
  }

  private trackGA4(event: AnalyticsEvent) {
    if (!(window as any).gtag) return;

    (window as any).gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      ...event.properties,
    });
  }

  private trackMixpanel(event: AnalyticsEvent) {
    // Placeholder for Mixpanel tracking
    console.log('Mixpanel track', event);
  }

  private trackAmplitude(event: AnalyticsEvent) {
    // Placeholder for Amplitude tracking
    console.log('Amplitude track', event);
  }

  /**
   * Track page view
   */
  pageView(path: string, title?: string) {
    if (!this.isInitialized || this.provider === 'none') {
      console.log(`[Analytics] Page view: ${path}`);
      return;
    }

    switch (this.provider) {
      case 'ga4':
        if ((window as any).gtag) {
          (window as any).gtag('event', 'page_view', {
            page_path: path,
            page_title: title,
          });
        }
        break;
      case 'mixpanel':
        console.log('Mixpanel page view', path);
        break;
      case 'amplitude':
        console.log('Amplitude page view', path);
        break;
    }
  }

  /**
   * Set user properties
   */
  setUser(userId: string, properties?: Record<string, any>) {
    if (!this.isInitialized || this.provider === 'none') return;

    switch (this.provider) {
      case 'ga4':
        if ((window as any).gtag) {
          (window as any).gtag('set', 'user_properties', {
            user_id: userId,
            ...properties,
          });
        }
        break;
      case 'mixpanel':
        console.log('Mixpanel identify', userId, properties);
        break;
      case 'amplitude':
        console.log('Amplitude identify', userId, properties);
        break;
    }
  }

  /**
   * Clear user data on logout
   */
  clearUser() {
    if (!this.isInitialized || this.provider === 'none') return;

    switch (this.provider) {
      case 'ga4':
        if ((window as any).gtag) {
          (window as any).gtag('set', 'user_properties', {
            user_id: undefined,
          });
        }
        break;
      case 'mixpanel':
        console.log('Mixpanel reset');
        break;
      case 'amplitude':
        console.log('Amplitude reset');
        break;
    }
  }
}

// Singleton instance
export const analytics = new Analytics();

// Convenience functions for common events
export const trackExpenseCreated = (amount: number, currency: string, method: string) => {
  analytics.track({
    category: 'Expense',
    action: 'created',
    label: method,
    value: amount,
    properties: { currency, split_method: method },
  });
};

export const trackPaymentRecorded = (amount: number, currency: string) => {
  analytics.track({
    category: 'Payment',
    action: 'recorded',
    value: amount,
    properties: { currency },
  });
};

export const trackGroupCreated = (memberCount: number) => {
  analytics.track({
    category: 'Group',
    action: 'created',
    properties: { member_count: memberCount },
  });
};

export const trackFriendAdded = () => {
  analytics.track({
    category: 'Friend',
    action: 'added',
  });
};

export const trackSettingsChanged = (setting: string, value: any) => {
  analytics.track({
    category: 'Settings',
    action: 'changed',
    label: setting,
    properties: { setting, value },
  });
};

export const trackAuthAction = (action: 'login' | 'logout' | 'register') => {
  analytics.track({
    category: 'Auth',
    action,
  });
};

export const trackFeatureUsed = (feature: string) => {
  analytics.track({
    category: 'Feature',
    action: 'used',
    label: feature,
  });
};
