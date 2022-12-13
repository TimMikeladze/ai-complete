import { Configuration, OpenAIApi } from 'openai'
import { globby, Options } from 'globby'
import { readFileSync } from 'fs'
import {
  CreateCompletionRequest,
  CreateCompletionResponse
} from 'openai/api.js'
import { ConfigurationParameters } from 'openai/configuration.js'

export interface AICompleteOptions {
  globby: {
    options?: Options
    patterns: string | readonly string[]
  }
  openAI: {
    config: ConfigurationParameters
    createCompletionRequest?: Partial<CreateCompletionRequest>
  }
}

export interface AICompleteArgs {
  input: ({
    args,
    filePath,
    fileContent
  }: {
    args: AICompleteArgs
    fileContent: string
    filePath: string
  }) => Promise<{
    createCompletionRequest?: Partial<CreateCompletionRequest>
    fileContent?: string
    maxTokens?: number
    prompt: string
  }>
  output: (response: CreateCompletionResponse) => Promise<{
    choice: any
  }>
}

export class AIComplete {
  private readonly openai: OpenAIApi
  private readonly options: AICompleteOptions
  private readonly filePaths: string[] = []
  private static MAX_TOKENS = 4000

  constructor(options: AICompleteOptions) {
    const configuration = new Configuration(options.openAI.config)
    this.openai = new OpenAIApi(configuration)
    this.options = options
  }

  async initialize() {
    const filePaths = await globby(
      this.options.globby.patterns,
      this.options.globby.options
    )
    this.filePaths.push(...filePaths)
  }

  async aiCompleteFiles(args: AICompleteArgs) {
    const res = []
    for (const filePath of this.filePaths) {
      try {
        res.push(await this.aiCompleteFile(filePath, args))
      } catch (error) {
        console.error(error)
        res.push(null)
      }
    }
    return res
  }

  async aiCompleteFile(filePath: string, args: AICompleteArgs) {
    const fileContent = readFileSync(filePath, 'utf8')

    const input = await args.input({
      args,
      fileContent,
      filePath
    })

    const prompt = `${input.prompt} ${input.fileContent || fileContent}`.trim()

    // count alphanumeric characters in prompt
    const promptLength = prompt.replace(/[^a-z0-9]/gi, '').length

    const maxTokens =
      input.maxTokens || Math.min(promptLength, AIComplete.MAX_TOKENS)

    if (maxTokens > AIComplete.MAX_TOKENS) {
      throw new Error(
        `maxTokens must be less than ${AIComplete.MAX_TOKENS} for ${filePath}. Try breaking the file into smaller chunks.`
      )
    }

    const response = await this.openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      temperature: 0.7,
      max_tokens: maxTokens,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      ...this.options.openAI.createCompletionRequest,
      ...input.createCompletionRequest
    })

    const output = await args.output(response.data)

    return output.choice
  }
}
