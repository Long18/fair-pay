import { useEffect } from 'react';
import { useResourceParams } from '@refinedev/core';
import { useLocation } from 'react-router';

/**
 * Custom hook to set the document title for FairPay
 * Replaces Refine's DocumentTitleHandler to ensure "FairPay" branding
 *
 * Format: [Page Name] | FairPay
 * Example: "Dashboard | FairPay", "Groups | FairPay"
 */
export const useDocumentTitle = () => {
  const { resource, action } = useResourceParams();
  const location = useLocation();
  const APP_NAME = 'FairPay';

  useEffect(() => {
    // Default title
    let title = APP_NAME;

    // Get page name from resource or location
    if (resource) {
      const resourceLabel = resource.meta?.label || resource.name;

      // Add action if available (Create, Edit, Show)
      if (action && action !== 'list') {
        const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
        title = `${actionLabel} ${resourceLabel} | ${APP_NAME}`;
      } else {
        title = `${resourceLabel} | ${APP_NAME}`;
      }
    } else {
      // For routes without resources (like login, register)
      const pathSegments = location.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const pageName = pathSegments[0]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        title = `${pageName} | ${APP_NAME}`;
      }
    }

    // Set the document title
    document.title = title;
  }, [resource, action, location.pathname]);
};
