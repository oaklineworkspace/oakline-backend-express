
import * as Sentry from "@sentry/nextjs";

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request?.data) {
        const sensitiveFields = ['password', 'ssn', 'accountNumber', 'routingNumber'];
        sensitiveFields.forEach(field => {
          if (event.request.data[field]) {
            event.request.data[field] = '[Filtered]';
          }
        });
      }
      return event;
    }
  });
};

export const logBankingError = (error, context = {}) => {
  Sentry.withScope(scope => {
    scope.setTag('component', 'banking');
    scope.setLevel('error');
    scope.setContext('banking_context', context);
    Sentry.captureException(error);
  });
};

export const logComplianceEvent = (event, data) => {
  Sentry.withScope(scope => {
    scope.setTag('component', 'compliance');
    scope.setLevel('info');
    scope.setContext('compliance_data', data);
    Sentry.captureMessage(`Compliance Event: ${event}`);
  });
};
