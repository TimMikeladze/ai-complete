import {
  Configuration,
  CreateEditRequest,
  CreateEditResponse,
  OpenAIApi
} from 'openai'
import { globbySync, Options } from 'globby'
import { readFileSync } from 'fs'
import {
  CreateCompletionRequest,
  CreateCompletionResponse
} from 'openai/api.js'
import { ConfigurationParameters } from 'openai/configuration.js'

export interface DataInput {
  type: 'filepath' | 'text'
  value: string
}

export interface AICompleteOptions {
  openAI: {
    config: ConfigurationParameters
  }
}

export type RequestArgs = {
  data?: DataInput[]
  globby?: {
    options?: Options
    patterns: string | readonly string[]
  }
}

export interface CreateCompletionArgs {
  input: (args: {
    args: CreateCompletionArgs
    filePath: string
    text: string
  }) => Promise<{
    content?: string
    maxTokens?: number
    prompt: string
    request?: Partial<CreateCompletionRequest>
  }>
  output: (args: {
    args: RequestArgs
    content: string
    data: CreateCompletionResponse
    filePath: string
    maxTokens?: number
    prompt: string
    request: Partial<CreateCompletionRequest>
  }) => Promise<{
    choice: any
  }>
}

export interface CreateEditArgs {
  input: (args: {
    args: CreateEditArgs
    filePath: string
    text: string
  }) => Promise<{
    content?: string
    input?: string
    instruction: string
    request?: CreateEditRequest
  }>
  output: (args: {
    args: CreateEditArgs
    content: string
    data: CreateEditResponse
    filePath: string
    input?: string
    instruction: string
    request: CreateEditRequest
  }) => Promise<{
    choice: any
  }>
}

export interface CreateInsertArgs {
  input: (args: {
    args: CreateInsertArgs
    filePath: string
    text: string
  }) => Promise<{
    content?: string
    input?: string
    instruction: string
    request?: CreateEditRequest
  }>
  output: (args: {
    args: CreateEditArgs
    content: string
    data: CreateEditResponse
    filePath: string
    input?: string
    instruction: string
    request: CreateEditRequest
  }) => Promise<{
    choice: any
  }>
}

export const defaultCreateCompletionRequest = {
  temperature: 0.7,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  model: 'text-davinci-003'
}

export const defaultCreateEditRequest = {
  temperature: 0.7,
  top_p: 1,
  model: 'text-davinci-edit-001'
}

export class AIComplete {
  private readonly openai: OpenAIApi
  private readonly options: AICompleteOptions
  private static MAX_TOKENS = 4000

  constructor(options: AICompleteOptions) {
    const configuration = new Configuration(options.openAI.config)
    this.openai = new OpenAIApi(configuration)
    this.options = options
  }

  private async request(args: RequestArgs & {}, fn: any) {
    const data = []

    const addGlobbyInput = (
      patterns: string | readonly string[],
      options?: Options
    ) => {
      data.push(
        ...globbySync(patterns, options).map((filePath) => ({
          type: 'filepath',
          value: filePath
        }))
      )
    }

    const addFileInput = (filePath: string) => {
      data.push({
        type: 'filepath',
        value: filePath
      })
    }

    const addTextInput = (text: string) => {
      data.push({
        type: 'text',
        value: text
      })
    }

    if (args.globby) {
      addGlobbyInput(args.globby.patterns, args.globby.options)
    }

    if (args.data) {
      for (const inputItem of args.data) {
        if (inputItem.type === 'filepath') {
          addFileInput(inputItem.value)
        }
        if (inputItem.type === 'text') {
          addTextInput(inputItem.value)
        }
      }
    }
    const getContent = (inputItem): string => {
      let content: string
      if (inputItem.type === 'filepath') {
        content = readFileSync(inputItem.value, 'utf8')
      }
      if (inputItem.type === 'text') {
        content = inputItem.value
      }
      return content
    }

    const res = []

    for (const inputItem of data) {
      try {
        res.push(
          await fn(
            args,
            getContent(inputItem),
            inputItem.type === 'filepath' ? inputItem.value : undefined
          )
        )
      } catch (e) {
        console.error(e)
      }
    }

    return res
  }

  public static getTokenCount(prompt: string, _maxTokens?: number) {
    // count alphanumeric characters in prompt
    const promptLength = prompt.replace(/[^a-z0-9]/gi, '').length

    const maxTokens =
      _maxTokens || Math.min(promptLength, AIComplete.MAX_TOKENS)

    if (maxTokens > AIComplete.MAX_TOKENS) {
      throw new Error(
        `maxTokens must be less than ${AIComplete.MAX_TOKENS}. Try breaking the input into smaller chunks.`
      )
    }
    return maxTokens
  }

  public async createCompletion(args: RequestArgs & CreateCompletionArgs) {
    return this.request(args, this.createCompletionFromText.bind(this))
  }

  public async createCompletionFromText(
    args: RequestArgs & CreateCompletionArgs,
    text: string,
    filePath?: string
  ) {
    const input = await args.input({
      args,
      text,
      filePath
    })

    const prompt = `${input.prompt} ${input.content || text}`.trim()

    const maxTokens = AIComplete.getTokenCount(prompt, input.maxTokens)

    const request: CreateCompletionRequest = {
      prompt,
      max_tokens: maxTokens,
      ...defaultCreateCompletionRequest,
      ...input.request
    }

    const response = await this.openai.createCompletion(request)
    const data = response.data

    const output = await args.output({
      data,
      request,
      maxTokens,
      prompt,
      args,
      content: text,
      filePath
    })

    return {
      data,
      input,
      request,
      output,
      args,
      filePath
    }
  }

  public async createEdit(args: RequestArgs & CreateEditArgs) {
    return this.request(args, this.createEditFromText.bind(this))
  }

  public async createEditFromText(
    args: RequestArgs & CreateEditArgs,
    text: string,
    filePath?: string
  ) {
    const input = await args.input({
      args,
      text,
      filePath
    })

    const content = input.content || text
    const instruction = input.instruction

    const request: CreateEditRequest = {
      instruction,
      input: content,
      ...defaultCreateEditRequest,
      ...input.request
    }

    const response = await this.openai.createEdit(request)
    const data = response.data

    const output = await args.output({
      data,
      request,
      instruction,
      input: content,
      args,
      content: text,
      filePath
    })

    return {
      output,
      data,
      request,
      instruction,
      input: content,
      args,
      content: text,
      filePath
    }
  }
}
