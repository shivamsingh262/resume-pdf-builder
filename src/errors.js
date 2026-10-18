'use strict';

// An error caused by user input or the local environment (bad config, missing
// photo, Chromium not installed, ...). The CLI prints these without a stack
// trace; anything else is treated as a bug and printed in full.
class UserError extends Error {
  constructor(message, { details = [], hint, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'UserError';
    this.details = details;
    this.hint = hint;
  }
}

module.exports = { UserError };
