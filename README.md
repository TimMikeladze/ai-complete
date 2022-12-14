# ai-complete

A toolkit that super-charges your workflow when working with `openai`.

## Install

```bash
npm install ai-complete
# or
yarn add ai-complete
# or
pnpm add ai-complete
```

**Note:** You will need to get an API key from [OpenAI](https://beta.openai.com/login/).

## Usage

In the following example we use `ai-complete` to translate a directory containing a bunch JSON language files. Our goal is to translate the files into another language and write the translated files to a new directory.

> Note: You can run this example by cloning this repo and running `yarn example`.

```js
import 'dotenv/config'

import AIComplete from 'ai-complete'
import { existsSync, mkdirSync, writeFileSync } from 'fs'

const inputDir = 'locales/en'
const outputDir = 'locales/ru'

await aic.createCompletion({
  // Where to read files from. All globby pattern and options are supported.
  globby: {
    patterns: ['example/locales/en/**/*.json']
  },
  // This function is called for each file and the results are used as arguments for the OpenAI API.
  input: async ({ args, filePath, fileContent }) => {
    return {
      // Describe what you want to do with the file.
      prompt:
        'Translate the JSON below into Russian but keep names of all keys and metadata in English.',
      createCompletionRequest: {
        // controls randomness, as value approaches 0 the output will be more deterministic
        temperature: 0
      }
    }
  },
  // This function is called with the results from each OpenAI API call.
  output: async ({ data, filePath }) => {
    // Parse the results from JSON to JS.
    const choice = JSON.parse(data.choices[0].text)

    // Calculate the new file path of the translated file.

    const outputFilePath = filePath.replace(inputDir, outputDir)

    const dir = outputFilePath.substring(0, outputFilePath.lastIndexOf('/'))

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Write the results to the file.

    const fileContents = JSON.stringify(choice, null, 2)

    try {
      writeFileSync(outputFilePath, fileContents, { flag: 'wx' })
      console.log('Wrote file: ' + outputFilePath)
    } catch (error) {
      console.error('Error writing file: ' + outputFilePath)
      console.error(error.message)
    }

    return {
      choice
    }
  }
})
```

## Running examples and tests

1. Create a `.env` file in the root of the project and add your `OPENAI_API_KEY` to it.
2. Run `yarn example` to run the `translate.js` example.
3. Run `yarn test` to run all the tests.
