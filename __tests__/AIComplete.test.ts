import { AIComplete } from '../src'

describe('AIComplete', () => {
  it('happy path', async () => {
    const aiComplete = new AIComplete({
      globby: {
        patterns: ['__tests__/happy-path/**/*']
      },
      openAI: {
        config: {
          apiKey: process.env.OPENAI_API_KEY
        },
        createCompletionRequest: {
          temperature: 0
        }
      }
    })

    const [result] = await aiComplete.aiCompleteFiles({
      input: async ({ args, filePath, fileContent }) => ({
        prompt:
          'Translate the JSON below into Russian but keep names of all keys and metadata in English.'
      }),
      output: async ({ data }) => ({
        choice: JSON.parse(data.choices[0].text)
      })
    })

    expect(result.output.choice).toMatchSnapshot()
  })
})
