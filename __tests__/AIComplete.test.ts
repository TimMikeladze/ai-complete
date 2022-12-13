import { AIComplete } from '../src'

describe('AIComplete', () => {
  it('happy path', async () => {
    const translator = new AIComplete({
      globby: {
        patterns: ['__tests__/happy-path/**/*']
      },
      openAI: {
        config: {
          apiKey: process.env.OPENAI_API_KEY
        },
        createCompletionRequest: {
          // controls randomness, as value approaches 0 the output will be more deterministic
          temperature: 0
        }
      }
    })

    await translator.initialize()

    const [result] = await translator.aiCompleteFiles({
      input: async ({ args, filePath, fileContent }) => ({
        prompt:
          'Translate the JSON below into Russian but keep names of all keys and metadata in English.'
      }),
      output: async ({ choices }) => ({
        choice: JSON.parse(choices[0].text)
      })
    })

    expect(result).toMatchSnapshot()

    expect(typeof result).toBe('object')
  })
})
