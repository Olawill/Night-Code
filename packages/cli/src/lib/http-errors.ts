type ErrorResponse = {
  json: () => Promise<unknown>;
  status: number;
  statusText: string;
};

export const getErrorMessage = async (response: ErrorResponse) => {
  try {
    const data = (await response.json()) as { error?: string };

    if (typeof data.error === "string" && data.error.length > 0) {
      return data.error;
    }
  } catch {
    // Ignore invalid error payloads, and fallback to the status text below.
  }

  return response.statusText || `Request failed with status ${response.status}`;
};
