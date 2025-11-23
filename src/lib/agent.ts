import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

// Import tools and prompts
import { tools } from './tools';
import { SYSTEM_PROMPTS } from './prompts';

// Configure OpenAI-compatible model (Qwen)
const model = new ChatOpenAI({
  model: 'qwen-plus',
  temperature: 0.7,
  apiKey: 'sk-cc75be06983048da82d30fc2e43d2ada',
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
});

// Create frontend coding agent
const agent = createAgent({
  model: model,
  tools: tools,
  systemPrompt: SYSTEM_PROMPTS.FRONTEND_CODING,
});

// Export type definitions
export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'step' | 'error' | 'custom' | 'file_write_start' | 'file_write_content';
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  stepName?: string;
  timestamp: string;
  filePath?: string;
  fileContent?: string;
  isStreaming?: boolean;
}

// Stream agent execution - use multiple stream modes to get complete information
export async function* streamAgent(
  input: string,
  chatHistory: BaseMessage[] = [],
  abortSignal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  console.log('[Agent] Starting stream for input:', input);
  console.log('[Agent] Chat history length:', chatHistory.length);
  
  try {
    // Check if already aborted
    if (abortSignal?.aborted) {
      yield {
        type: 'error',
        content: 'Request was aborted',
        timestamp: new Date().toISOString(),
      };
      return;
    }

    // Build message list
    const messages = [
      ...chatHistory,
      { role: 'user' as const, content: input }
    ];

    console.log('[Agent] Calling agent.stream with messages:', messages.length);

    // Use multiple streamModes to get complete information:
    // - 'updates' gets updates for each agent step (complete tool call info and final text)
    // - 'custom' gets custom updates sent via config.writer in tools
    const stream = await agent.stream(
      { messages },
      { streamMode: ['updates', 'custom'] }
    );

    console.log('[Agent] Stream started with modes (updates, custom)');

    // Track processed messages and tool calls
    const processedToolCalls = new Set<string>();
    const seenSteps = new Set<string>(); // Track processed steps

    for await (const chunk of stream) {
      // Check if aborted
      if (abortSignal?.aborted) {
        console.log('[Agent] Stream aborted by user');
        yield {
          type: 'error',
          content: 'Request was aborted by user',
          timestamp: new Date().toISOString(),
        };
        break;
      }

      // Multiple streaming modes return format: [streamMode, data]
      if (!Array.isArray(chunk) || chunk.length !== 2) {
        console.warn('[Agent] Unexpected chunk format:', chunk);
        continue;
      }

      const [streamMode, data] = chunk;
      console.log(`[Agent] Received ${streamMode} chunk:`, typeof data === 'string' ? data.substring(0, 100) : data);

      // ============================================
      // Handle 'custom' mode: Updates sent via config.writer inside tools
      // ============================================
      if (streamMode === 'custom') {
        console.log('[Agent] Custom update:', data);
        if (typeof data === 'string') {
          console.log('[Agent] Custom update:', data);
          
          // Check if it's a file write related update
          if (data.includes('Writing to file:')) {
            const pathMatch = data.match(/Writing to file: (.+)/);
            if (pathMatch) {
              yield {
                type: 'file_write_start',
                content: data,
                filePath: pathMatch[1],
                timestamp: new Date().toISOString(),
              };
              continue;
            }
          }
          
          // Regular custom update
          yield {
            type: 'custom',
            content: data,
            timestamp: new Date().toISOString(),
          };
        }
        continue;
      }

      // ============================================
      // Handle 'updates' mode: Complete Agent step updates
      // ============================================
      if (streamMode === 'updates') {
        console.log('[Agent] Updates mode:', data);
        // Updates mode returns an object, key is node name, value is update content
        if (!data || typeof data !== 'object') {
          continue;
        }

        // Get node name and update content
        const entries = Object.entries(data);
        if (entries.length === 0) {
          continue;
        }

        const [nodeName, nodeUpdate] = entries[0];
        console.log(`[Agent] Update from node: ${nodeName}`, nodeUpdate);

        const stepKey = `${nodeName}-${Date.now()}`;
        
        // Check if this step has been processed (avoid duplicates)
        if (seenSteps.has(stepKey)) {
          continue;
        }
        seenSteps.add(stepKey);

        // Process node update
        const updateData = nodeUpdate as any;
        
        if (updateData.messages && Array.isArray(updateData.messages)) {
          const messages = updateData.messages;
          
          for (const message of messages) {
            const messageType = message._getType?.() || message.type || message.constructor?.name;
            
            // Handle tool calls in AI messages
            if (messageType === 'ai' || messageType === 'AIMessage' || messageType === 'AIMessageChunk') {
              // Handle AI message text content
              const content = message.content || message.kwargs?.content;
              if (content && typeof content === 'string' && content.trim()) {
                console.log('[Agent] AI response text:', content);
                yield {
                  type: 'text',
                  content: content,
                  timestamp: new Date().toISOString(),
                };
              }
              
              // Try to get tool call info from multiple locations
              let toolCalls = message.tool_calls || message.kwargs?.tool_calls;
              
              // If tool_calls is empty, try to get from tool_call_chunks
              if (!toolCalls || toolCalls.length === 0) {
                const toolCallChunks = message.tool_call_chunks || message.kwargs?.tool_call_chunks;
                if (toolCallChunks && Array.isArray(toolCallChunks) && toolCallChunks.length > 0) {
                  toolCalls = toolCallChunks.map((chunk: any) => {
                    let parsedArgs = chunk.args;
                    if (typeof chunk.args === 'string') {
                      try {
                        parsedArgs = JSON.parse(chunk.args);
                      } catch (parseError) {
                        console.warn('[Agent] Failed to parse tool call chunk args:', parseError);
                        parsedArgs = { raw: chunk.args, parseError: parseError instanceof Error ? parseError.message : String(parseError) };
                      }
                    }
                    return {
                      id: chunk.id || `tool-${chunk.name}-${Date.now()}`,
                      name: chunk.name,
                      args: parsedArgs,
                    };
                  });
                  console.log('[Agent] Extracted tool calls from tool_call_chunks:', toolCalls);
                }
              }
              
              // If still empty, try to get from additional_kwargs.tool_calls
              if (!toolCalls || toolCalls.length === 0) {
                const additionalToolCalls = message.kwargs?.additional_kwargs?.tool_calls;
                if (additionalToolCalls && Array.isArray(additionalToolCalls) && additionalToolCalls.length > 0) {
                  toolCalls = additionalToolCalls.map((tc: any) => {
                    let parsedArgs = tc.function?.arguments;
                    if (typeof tc.function?.arguments === 'string') {
                      try {
                        parsedArgs = JSON.parse(tc.function.arguments);
                      } catch (parseError) {
                        console.warn('[Agent] Failed to parse additional_kwargs tool call args:', parseError);
                        parsedArgs = { raw: tc.function.arguments, parseError: parseError instanceof Error ? parseError.message : String(parseError) };
                      }
                    }
                    return {
                      id: tc.id || `tool-${tc.function?.name}-${Date.now()}`,
                      name: tc.function?.name,
                      args: parsedArgs,
                    };
                  });
                  console.log('[Agent] Extracted tool calls from additional_kwargs:', toolCalls);
                }
              }
              
              // Handle invalid_tool_calls (tool call failures)
              const invalidToolCalls = message.invalid_tool_calls || message.kwargs?.invalid_tool_calls;
              if (invalidToolCalls && Array.isArray(invalidToolCalls) && invalidToolCalls.length > 0) {
                console.log('[Agent] Invalid tool calls detected:', invalidToolCalls);
                for (const invalidCall of invalidToolCalls) {
                  const toolId = invalidCall.id || `tool-${invalidCall.name}-${Date.now()}`;
                  
                  if (!processedToolCalls.has(toolId)) {
                    processedToolCalls.add(toolId);
                    
                    // Safely parse tool arguments
                    let parsedArgs = invalidCall.args;
                    if (typeof invalidCall.args === 'string') {
                      try {
                        parsedArgs = JSON.parse(invalidCall.args);
                      } catch (parseError) {
                        console.warn('[Agent] Failed to parse invalid tool call args:', parseError);
                        // If parsing fails, keep original string
                        parsedArgs = { raw: invalidCall.args, parseError: parseError instanceof Error ? parseError.message : String(parseError) };
                      }
                    }
                    
                    // Send tool call failure info
                    yield {
                      type: 'tool_call',
                      content: `Tool call failed: ${invalidCall.name} - ${invalidCall.error}`,
                      toolName: invalidCall.name,
                      toolInput: parsedArgs,
                      timestamp: new Date().toISOString(),
                    };
                    
                    // Immediately send failure result
                    yield {
                      type: 'tool_result',
                      content: `Error: ${invalidCall.error}`,
                      toolName: invalidCall.name,
                      toolOutput: `Error: ${invalidCall.error}`,
                      timestamp: new Date().toISOString(),
                    };
                  }
                }
              }
              
              if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                  const toolId = toolCall.id || `tool-${toolCall.name}-${Date.now()}`;
                  
                  if (!processedToolCalls.has(toolId)) {
                    console.log('[Agent] Tool call detected:', toolCall);
                    processedToolCalls.add(toolId);
                    
                    // Special handling for write_file tool
                    if (toolCall.name === 'write_file') {
                      yield {
                        type: 'file_write_start',
                        content: `Writing file: ${toolCall.args?.path || 'unknown'}`,
                        toolName: toolCall.name,
                        toolInput: toolCall.args,
                        filePath: toolCall.args?.path,
                        fileContent: toolCall.args?.content,
                        timestamp: new Date().toISOString(),
                      };
                    }
                    
                    // Send tool call info
                    yield {
                      type: 'tool_call',
                      content: `Calling ${toolCall.name}...`,
                      toolName: toolCall.name,
                      toolInput: toolCall.args,
                      timestamp: new Date().toISOString(),
                    };
                  }
                }
              }
            }
            
            // Handle tool messages (tool execution results)
            else if (messageType === 'tool' || messageType === 'ToolMessage') {
              const content = message.content || message.kwargs?.content;
              const toolName = message.name || message.kwargs?.name || 'unknown';
              const toolCallId = message.tool_call_id || message.kwargs?.tool_call_id;
              
              console.log('[Agent] Tool result detected:', { toolName, toolCallId, content });
              
              yield {
                type: 'tool_result',
                content: content,
                toolName: toolName,
                toolOutput: content,
                timestamp: new Date().toISOString(),
              };
            }
          }
        }
        
        // Send step completion info
        yield {
          type: 'step',
          content: `Step completed: ${nodeName}`,
          stepName: nodeName,
          timestamp: new Date().toISOString(),
        };
        
        continue;
      }
    }

    console.log('[Agent] Stream completed successfully');
  } catch (error) {
    console.error('[Agent] Stream error:', error);
    yield {
      type: 'error',
      content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

// Simple non-streaming call (for testing)
export async function invokeAgent(input: string, chatHistory: BaseMessage[] = []) {
  console.log('[Agent] Invoking agent with input:', input);
  try {
    const messages = [
      ...chatHistory,
      { role: 'user' as const, content: input }
    ];

    const result = await agent.invoke({ messages });
    console.log('[Agent] Invoke result:', result);
    
    // Get last message
    if (result.messages && result.messages.length > 0) {
      const lastMessage = result.messages[result.messages.length - 1];
      return lastMessage.content;
    }
    
    return 'No response from agent';
  } catch (error) {
    console.error('[Agent] Invoke error:', error);
    throw new Error(`Agent error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function: Convert message format
export function convertToLangChainMessages(messages: Array<{ role: string; content: string }>): BaseMessage[] {
  return messages.map(msg => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.content);
    } else {
      return new AIMessage(msg.content);
    }
  });
}

// Export agent and related tools
export { agent, model };
export { tools } from './tools';
export { SYSTEM_PROMPTS } from './prompts';
