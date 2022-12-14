import { AIComplete } from '../src'

describe('AIComplete', () => {
  it('happy path', async () => {
    const aic = new AIComplete({
      openAI: {
        config: {
          apiKey: process.env.OPENAI_API_KEY
        }
      }
    })
    const [result] = await aic.createCompletion({
      globby: {
        patterns: ['example/locales/en/**/*']
      },
      input: async ({ args, filePath, text }) => ({
        prompt:
          'Translate the JSON below into Russian but keep names of all keys and metadata in English.',
        createCompletionRequest: {
          temperature: 0
        }
      }),
      output: async ({ data }) => ({
        choice: JSON.parse(data.choices[0].text)
      })
    })

    expect(result.output.choice).toMatchSnapshot()
  })
})
