/**
 * Performance monitoring utilities for tracking Web Vitals and custom metrics
 *
 * Web Vitals:
 * - LCP (Largest Contentful Paint): Loading performance - should be < 2.5s
 * - FID (First Input Delay): Interactivity - should be < 100ms
 * - CLS (Cumulative Layout Shift): Visual stability - should be < 0.1
 * - FCP (First Contentful Paint): First paint - should be < 1.8s
 * - TTFB (Time to First Byte): Server response - should be < 600ms
 * - INP (Interaction to Next Paint): Responsiveness - should be < 200ms
 */

export interface PerformanceMetric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    delta?: number;
    id?: string;
    navigationType?: string;
}

export type PerformanceReporter = (metric: PerformanceMetric) => void;

/**
 * Get rating based on metric thresholds
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    switch (name) {
        case 'LCP':
            return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
        case 'FID':
        case 'INP':
            return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
        case 'CLS':
            return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
        case 'FCP':
            return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
        case 'TTFB':
            return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
        default:
            return 'good';
    }
}

/**
 * Report a performance metric
 */
function reportMetric(name: string, value: number, reporter?: PerformanceReporter) {
    const metric: PerformanceMetric = {
        name,
        value,
        rating: getRating(name, value),
    };

    // Log to console in development
    if (import.meta.env.DEV) {
        console.log(`[Performance] ${name}:`, {
            value: `${Math.round(value)}ms`,
            rating: metric.rating,
        });
    }

    // Call reporter callback if provided
    if (reporter) {
        reporter(metric);
    }

    // Send to analytics/monitoring service here
    // Example: sendToAnalytics(metric);
}

/**
 * Monitor Web Vitals using the web-vitals library (if available)
 * Falls back to manual PerformanceObserver if not available
 */
export function measureWebVitals(reporter?: PerformanceReporter) {
    if (typeof window === 'undefined') return;

    // Use dynamic import but don't await - let it set up listeners asynchronously
    // This is intentional: we want the function to return immediately and let
    // the web-vitals library set up its observers in the background
    import('web-vitals')
        .then((webVitals) => {
            // web-vitals v5 removed onFID, use onINP as primary interactivity metric
            const { onCLS, onFCP, onLCP, onTTFB, onINP } = webVitals;

            onCLS((metric: any) => reportMetric('CLS', metric.value, reporter));
            onFCP((metric: any) => reportMetric('FCP', metric.value, reporter));
            onLCP((metric: any) => reportMetric('LCP', metric.value, reporter));
            onTTFB((metric: any) => reportMetric('TTFB', metric.value, reporter));
            onINP((metric: any) => reportMetric('INP', metric.value, reporter));
        })
        .catch((error) => {
            console.warn('[Performance] Failed to load web-vitals, using fallback:', error);
            measureWithPerformanceObserver(reporter);
        });
}

/**
 * Fallback measurement using PerformanceObserver
 */
function measureWithPerformanceObserver(reporter?: PerformanceReporter) {
    if (!('PerformanceObserver' in window)) return;

    try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
            const value = lastEntry.renderTime || lastEntry.loadTime || 0;
            reportMetric('LCP', value, reporter);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: PerformanceEntry & { processingStart?: number }) => {
                const value = entry.processingStart ? entry.processingStart - entry.startTime : 0;
                reportMetric('FID', value, reporter);
            });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: PerformanceEntry & { value?: number; hadRecentInput?: boolean }) => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value || 0;
                    reportMetric('CLS', clsValue, reporter);
                }
            });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Navigation timing for TTFB and FCP
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            // TTFB should be from navigation start to first byte received
            const ttfb = timing.responseStart - timing.navigationStart;
            const fcp = timing.domContentLoadedEventStart - timing.navigationStart;

            reportMetric('TTFB', ttfb, reporter);
            reportMetric('FCP', fcp, reporter);
        }
    } catch (error) {
        console.warn('[Performance] PerformanceObserver failed:', error);
    }
}

/**
 * Measure custom timing metrics
 */
export function measureCustom(name: string, startTime: number, reporter?: PerformanceReporter) {
    const duration = performance.now() - startTime;
    reportMetric(name, duration, reporter);
}

/**
 * Create a performance mark
 */
export function mark(name: string) {
    if (typeof window !== 'undefined' && 'performance' in window && 'mark' in window.performance) {
        try {
            performance.mark(name);
        } catch (error) {
            console.warn(`[Performance] Failed to create mark: ${name}`, error);
        }
    }
}

/**
 * Measure between two marks
 */
export function measureBetween(measureName: string, startMark: string, endMark: string, reporter?: PerformanceReporter) {
    if (typeof window !== 'undefined' && 'performance' in window && 'measure' in window.performance) {
        try {
            performance.measure(measureName, startMark, endMark);
            const measure = performance.getEntriesByName(measureName)[0];
            if (measure) {
                reportMetric(measureName, measure.duration, reporter);
            }
        } catch (error) {
            console.warn(`[Performance] Failed to measure: ${measureName}`, error);
        }
    }
}

/**
 * Get current page load metrics
 */
export function getPageLoadMetrics() {
    if (typeof window === 'undefined' || !window.performance || !window.performance.timing) {
        return null;
    }

    const timing = window.performance.timing;
    const navigation = window.performance.navigation;

    return {
        // Page load time (total)
        loadTime: timing.loadEventEnd - timing.navigationStart,

        // DNS lookup time
        dnsTime: timing.domainLookupEnd - timing.domainLookupStart,

        // TCP connection time
        tcpTime: timing.connectEnd - timing.connectStart,

        // Server response time (TTFB)
        ttfb: timing.responseStart - timing.requestStart,

        // Content download time
        downloadTime: timing.responseEnd - timing.responseStart,

        // DOM processing time
        domProcessing: timing.domComplete - timing.domLoading,

        // DOM ready time
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,

        // Navigation type
        navigationType: navigation.type === 0 ? 'navigate' : navigation.type === 1 ? 'reload' : 'back_forward',
    };
}

/**
 * Log performance summary to console
 */
export function logPerformanceSummary() {
    const metrics = getPageLoadMetrics();
    if (metrics) {
        console.group('📊 Performance Summary');
        console.log('Total Load Time:', `${metrics.loadTime}ms`);
        console.log('DNS Lookup:', `${metrics.dnsTime}ms`);
        console.log('TCP Connection:', `${metrics.tcpTime}ms`);
        console.log('TTFB (Server Response):', `${metrics.ttfb}ms`);
        console.log('Content Download:', `${metrics.downloadTime}ms`);
        console.log('DOM Processing:', `${metrics.domProcessing}ms`);
        console.log('DOM Ready:', `${metrics.domReady}ms`);
        console.log('Navigation Type:', metrics.navigationType);
        console.groupEnd();
    }
}
