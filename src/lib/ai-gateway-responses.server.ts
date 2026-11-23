import { createOpenAI } from "@ai-sdk/openai";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";
const LOVABLE_AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const RECEIPT_MODEL = "openai/gpt-6.1-sol";

function createLovableAiGatewayRunIdFetch(request: Request) {
  let runId = request.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
    getRunId: () => runId,
  };
}

export function createLovableReceiptModel(apiKey: string, request: Request) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(request);
  const provider = createOpenAI({
    baseURL: LOVABLE_AI_GATEWAY_URL,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  return {
    model: provider.responses(RECEIPT_MODEL),
    getRunId: runIdFetch.getRunId,
  };
}