import type { StreamFn } from "@mariozechner/pi-agent-core";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("agent/openrouter-reasoning");

/** Shape of an OpenAI-compatible streaming chunk with reasoning extensions */
interface StreamChunkDelta {
  content?: string;
  reasoning?: string;
  reasoning_details?: string;
  thinking?: string;
}

interface StreamChunkChoice {
  delta?: StreamChunkDelta;
}

interface StreamChunk {
  choices?: StreamChunkChoice[];
}

function extractReasoningText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const chunk = payload as StreamChunk;
  const delta = chunk.choices?.[0]?.delta;
  if (!delta) return undefined;

  // Check known reasoning fields: 'reasoning' (common), 'reasoning_details', 'thinking'
  const text = delta.reasoning || delta.reasoning_details || delta.thinking;
  return typeof text === "string" ? text : undefined;
}

export function createOpenRouterReasoningLogger(params: {
  onReasoningStream?: (event: { text: string }) => void;
}) {
  if (!params.onReasoningStream) {
    return null;
  }

  const wrapStreamFn = (streamFn: StreamFn): StreamFn => {
    return (model, context, options) => {
      const nextOnPayload = (payload: unknown) => {
        try {
          const reasoning = extractReasoningText(payload);
          if (reasoning) {
            params.onReasoningStream?.({ text: reasoning });
          }
        } catch {
          // ignore parsing errors, strictly side-effect logger
        }

        // Forward to original handler if exists
        options?.onPayload?.(payload);
      };

      return streamFn(model, context, {
        ...options,
        onPayload: nextOnPayload,
      });
    };
  };

  return { wrapStreamFn };
}
