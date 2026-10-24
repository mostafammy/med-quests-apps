/**
 * AgentToolRegistry (OOP Strategy & Registry Pattern)
 * Central registry managing all 9 Agentic Tools, compiling their JSON schemas,
 * and dispatching execution with strict policy gating.
 */
import type { SafeAiContext } from '../context.ts';
import type {
  AgentToolName,
  IAgentTool,
  ToolExecutionContext,
  AgentToolResultPayload,
} from './toolTypes.ts';
import {
  AnalyzeVignetteTool,
  InspectTelemetryTool,
  DetectCognitiveBiasTool,
} from './autonomousDiagnosticTools.ts';
import {
  SimulatePvLoopTool,
  SimulatePeerCohortTool,
  CalculateCvEquationTool,
} from './clinicalModelingTools.ts';
import {
  CreateSrsAnchorTool,
  FormulateMnemonicTool,
  PrescribeMicroCurriculumTool,
} from './memoryRemediationTools.ts';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AgentToolExecutionEnvelope {
  readonly callId: string;
  readonly toolName: AgentToolName;
  readonly visibility: 'silent' | 'artifact';
  readonly status: 'ok' | 'blocked' | 'error';
  readonly llmFeedbackJson: string;
  readonly artifactPayload?: AgentToolResultPayload;
  readonly error?: string;
}

export class AgentToolRegistry {
  private readonly tools = new Map<AgentToolName, IAgentTool<any, any>>();

  constructor() {
    // 1. Silent Autonomous Background Tools
    this.register(new AnalyzeVignetteTool());
    this.register(new InspectTelemetryTool());
    this.register(new DetectCognitiveBiasTool());

    // 2. Clinical & Pathophysiological Modeling Tools
    this.register(new SimulatePvLoopTool());
    this.register(new SimulatePeerCohortTool());
    this.register(new CalculateCvEquationTool());

    // 3. Active Memory & Adaptive Remediation Tools
    this.register(new CreateSrsAnchorTool());
    this.register(new FormulateMnemonicTool());
    this.register(new PrescribeMicroCurriculumTool());
  }

  register(tool: IAgentTool<any, any>): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: AgentToolName): IAgentTool<any, any> | undefined {
    return this.tools.get(name);
  }

  /**
   * Compiles JSON Schema tool declarations for the LLM API.
   * Enforces Exam Integrity: If under timed proctored exam conditions,
   * clinical tools are excluded.
   */
  getToolDeclarations(context: SafeAiContext): ToolDefinition[] {
    if (context.kind === 'proctor') {
      return []; // No clinical tools during timed mock exams
    }

    const declarations: ToolDefinition[] = [];
    for (const tool of this.tools.values()) {
      declarations.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.jsonSchema,
        },
      });
    }
    return declarations;
  }

  async executeTool(
    callId: string,
    toolName: string,
    rawArgs: unknown,
    ctx: ToolExecutionContext
  ): Promise<AgentToolExecutionEnvelope> {
    const tool = this.tools.get(toolName as AgentToolName);
    if (!tool) {
      return {
        callId,
        toolName: toolName as AgentToolName,
        visibility: 'silent',
        status: 'error',
        llmFeedbackJson: JSON.stringify({ error: `Tool '${toolName}' not found.` }),
        error: `Tool '${toolName}' is not recognized.`,
      };
    }

    // Policy gate check
    if (ctx.safeContext.kind === 'proctor') {
      return {
        callId,
        toolName: tool.name,
        visibility: 'silent',
        status: 'blocked',
        llmFeedbackJson: JSON.stringify({ error: 'Clinical tools are blocked during timed mock examination.' }),
        error: 'Blocked by Proctor Exam Policy.',
      };
    }

    try {
      const parsedArgs = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs ?? {};
      const result = await tool.execute(parsedArgs, ctx);

      return {
        callId,
        toolName: tool.name,
        visibility: tool.visibility,
        status: 'ok',
        llmFeedbackJson: JSON.stringify(result),
        artifactPayload: tool.visibility === 'artifact' ? result : undefined,
      };
    } catch (err) {
      const message = (err as Error).message || 'Unknown tool execution error.';
      return {
        callId,
        toolName: tool.name,
        visibility: tool.visibility,
        status: 'error',
        llmFeedbackJson: JSON.stringify({ error: message }),
        error: message,
      };
    }
  }
}

export const agentToolRegistry = new AgentToolRegistry();
