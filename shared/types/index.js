/**
 * Shared API Response Contracts & JSDoc Type Signatures
 *
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indicates request status
 * @property {string} [message] - Human-readable status message
 * @property {*} [data] - Response payload
 * @property {string} [code] - Error code if failed
 */
export const ApiResponseContract = {
  success: true,
  message: '',
  data: null,
};
