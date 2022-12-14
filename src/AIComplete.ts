import { Configuration, OpenAIApi } from 'openai'
import { globbySync, Options } from 'globby'
import { readFileSync } from 'fs'
import {
  CreateCompletionRequest,
  CreateCompletionResponse
} from 'openai/api.js'
import { ConfigurationParameters } from 'openai/configuration.js'

export interface InputItem {
  type: 'filepath' | 'text'
  value: string
}

export interface AICompleteOptions {
  openAI: {
    config: ConfigurationParameters
  }
}

export interface RequestArgs {
  globby?: {
    options?: Options
    patterns: string | readonly string[]
  }
  input: (args: {
    args: RequestArgs
    filePath: string
    text: string
  }) => Promise<{
    content?: string
    createCompletionRequest?: Partial<CreateCompletionRequest>
    maxTokens?: number
    prompt: string
  }>
  inputList?: InputItem[]
  output: (args: {
    args: RequestArgs
    content: string
    createCompletionRequest: Partial<CreateCompletionRequest>
    data: CreateCompletionResponse
    filePath: string
    maxTokens?: number
    prompt: string
  }) => Promise<{
    choice: any
  }>
}

export const defaultCreateCompletionRequest = {
  temperature: 0.7,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
}

export class AIComplete {
  private readonly openai: OpenAIApi
  private readonly options: AICompleteOptions
  private static MAX_TOKENS = 4000
  private static DEFAULT_MODEL = 'text-davinci-003'

  constructor(options: AICompleteOptions) {
    const configuration = new Configuration(options.openAI.config)
    this.openai = new OpenAIApi(configuration)
    this.options = options
  }

  private async request(args: RequestArgs & {}, fn: any) {
    const inputList = []

    const addGlobbyInput = (
      patterns: string | readonly string[],
      options?: Options
    ) => {
      inputList.push(
        ...globbySync(patterns, options).map((filePath) => ({
          type: 'filepath',
          value: filePath
        }))
      )
    }

    const addFileInput = (filePath: string) => {
      inputList.push({
        type: 'filepath',
        value: filePath
      })
    }

    const addTextInput = (text: string) => {
      inputList.push({
        type: 'text',
        value: text
      })
    }

    if (args.globby) {
      addGlobbyInput(args.globby.patterns, args.globby.options)
    }

    if (args.inputList) {
      for (const inputItem of args.inputList) {
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

    for (const inputItem of inputList) {
      try {
        res.push(
          await fn(
            args,
            getContent(inputItem),
            inputItem.type === 'filepath' ? inputItem.value : undefined
          )
        )
      } catch (error) {
        console.error(error)
        res.push(null)
      }
    }

    return res
  }

  public async createCompletion(args: RequestArgs) {
    return this.request(args, this.createCompletionFromText.bind(this))
  }

  public async createCompletionFromText(
    args: RequestArgs,
    text: string,
    filePath?: string
  ) {
    const input = await args.input({
      args,
      text,
      filePath
    })

    const prompt = `${input.prompt} ${input.content || text}`.trim()

    // count alphanumeric characters in prompt
    const promptLength = prompt.replace(/[^a-z0-9]/gi, '').length

    const maxTokens =
      input.maxTokens || Math.min(promptLength, AIComplete.MAX_TOKENS)

    if (maxTokens > AIComplete.MAX_TOKENS) {
      throw new Error(
        `maxTokens must be less than ${AIComplete.MAX_TOKENS}. Try breaking the input into smaller chunks.`
      )
    }

    const request: CreateCompletionRequest = {
      model: AIComplete.DEFAULT_MODEL,
      prompt,
      max_tokens: maxTokens,
      ...defaultCreateCompletionRequest,
      ...input.createCompletionRequest
    }

    const response = await this.openai.createCompletion(request)
    const data = response.data

    const output = await args.output({
      data,
      createCompletionRequest: request,
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
}
