import { AIComplete } from '../src'

describe('AIComplete', () => {
  it('createCompletion', async () => {
    const aic = new AIComplete({
      openAI: {
        config: {
          apiKey: process.env.OPENAI_API_KEY
        }
      }
    })
    const result = await aic.createCompletion({
      globby: {
        patterns: ['example/locales/en/**/*']
      },
      input: async (args) => ({
        prompt:
          'Translate the JSON below into Russian but keep names of all keys and metadata in English.',
        request: {
          temperature: 0
        }
      }),
      output: async ({ data }) => ({
        choice: JSON.parse(data.choices[0].text)
      })
    })

    expect(result.map((x) => x.output.choice)).toMatchSnapshot()
  })

  it('createEdit', async () => {
    const aic = new AIComplete({
      openAI: {
        config: {
          apiKey: process.env.OPENAI_API_KEY
        }
      }
    })
    const result = await aic.createEdit({
      data: [
        {
          type: 'text',
          value: 'One, two, ___, four.'
        }
      ],
      input: async () => ({
        instruction: 'Fill in the blank with the correct word.'
      }),
      output: async ({ data }) => {
        return {
          choice: data.choices[0].text
        }
      }
    })

    expect(result.map((x) => x.output)).toMatchSnapshot()
  })
})
