import { z } from 'zod'
import {
  type CoreMessage,
  type ImagePart,
  type UserContent,
  type CoreUserMessage,
  type CoreAssistantMessage,
  type CoreToolMessage,
  StreamingTextResponse,
  StreamData,
  streamText,
  tool,
  convertToCoreMessages,
} from 'ai'
// import { anthropic } from '@ai-sdk/anthropic'
import { bedrock } from '@ai-sdk/amazon-bedrock';
import type {
  RequestOptions,
} from '@ai-sdk/ui-utils';
import {
  runPython,
  runJs
} from '@/lib/local-sandbox'

// import { ToolResult } from 'ai/generate-text/tool-result';


export interface ServerMessage {
  role: 'user' | 'assistant' | 'function';
  content: string;
}

interface ToolResult<NAME extends string, ARGS, RESULT> {
  /**
ID of the tool call. This ID is used to match the tool call with the tool result.
 */
  toolCallId: string;
  /**
Name of the tool that was called.
 */
  toolName: NAME;
  /**
Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
   */
  args: ARGS;
  /**
Result of the tool call. This is the result of the tool's execution.
   */
  result: RESULT;
}

type initMessages ={
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: Array<ToolResult<string, unknown, unknown>>;
};


export async function POST(req: Request) {
  const { messages, userID, data }: { messages: CoreMessage[], userID: string, data:string } = await req.json()
  // console.log('userID', userID)
  console.log(messages)
  // console.log(data)
  const initialMessages = messages.slice(0, -1) as initMessages [];
  // const coreMessages = convertToCoreMessages(initialMessages) 
  const currentMessage = messages[messages.length - 1];
  const imageData = data?JSON.parse(data):[];
  const imageMessages = (imageData as []).map(it => ({ type: 'image', image: it})) as ImagePart[];
  const userContent = [
    { type: 'text', text: currentMessage.content as string },
    ...imageMessages
  ]
  const newMessages =[
    ...initialMessages,
    {
      role: 'user',
      content: userContent as UserContent,
    },
  ];
  console.log(newMessages)
  let streamData: StreamData = new StreamData()

  const result = await streamText({
    // model: bedrock('anthropic.claude-3-sonnet-20240229-v1:0',
     model: bedrock('anthropic.claude-3-5-sonnet-20240620-v1:0',
       {
      additionalModelRequestFields: { top_k: 250 },
    }),
    tools: {
      runPython: tool({
        description: 'Runs Python code.',
        parameters: z.object({
          title: z.string().describe('Short title (5 words max) of the artifact.'),
          description: z.string().describe('Short description (10 words max) of the artifact.'),
          code: z.string().describe('The code to run.'),
        }),
        async execute({ code }) {
          streamData.append({
            tool: 'runPython',
            state: 'running',
          })

          const execOutput = await runPython(userID, code)
          const stdout = execOutput.logs.stdout
          const stderr = execOutput.logs.stderr
          const runtimeError = execOutput.error
          const results = execOutput.results
          streamData.append({
            tool: 'runPython',
            state: 'complete',
          })

          return {
            stdout,
            stderr,
            runtimeError,
            cellResults: results,
          }
        },
      }),
      runJs: tool({
        description: 'Runs HTML or Javascript code.',
        parameters: z.object({
          title: z.string().describe('Short title (5 words max) of the artifact.'),
          description: z.string().describe('Short description (10 words max) of the artifact.'),
          code: z.string().describe('The code to run. can be a html and js code'),
        }),
        async execute({ code }) {
          // console.log(code)
          streamData.append({
            tool: 'runJs',
            state: 'running',
          })

          const execOutput = await runJs(userID, code)
          const stdout = execOutput.logs.stdout
          const stderr = execOutput.logs.stderr
          const runtimeError = execOutput.error
          const results = execOutput.results
          // const stdout :string [] = []
          // const stderr :string [] = []
          // const runtimeError = undefined
          // const results = [{'html':code}]

          streamData.append({
            tool: 'runJs',
            state: 'complete',
          })
          // console.log(data)
          return {
            stdout,
            stderr,
            runtimeError,
            cellResults: results,
          }
        },
      }),
    },
    toolChoice: 'auto',
    system: `
    You are a skilled Python and Javascript developer.
    One of your expertise is also data science.
    You can run Python, Javascript and bash code. Code for each programming language runs in its own context and reference previous definitions and variables.
    The code runs inside a Jupyter notebook so we can easily get visualizations.
    Use seaborn for data visualization.

    Messages inside [] means that it's a UI element or a user event. For example:
    - "[Chart was generated]" means a chart in a Jupyter notebook was generated and displayed to user.
    `,
    messages:newMessages,
  })

  const stream = result.toAIStream({
    async onFinal() {
      await streamData.close()
    }
  })

  return new StreamingTextResponse(stream, {}, streamData);
}
