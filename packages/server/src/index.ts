import { createApp } from './app.js'
import { getEnv } from './utils/env.js'
import { ensureBuiltInPrompts } from './services/promptService.js'

const env = getEnv()
const app = createApp()

ensureBuiltInPrompts().catch((err) => {
  console.error('Failed to seed built-in prompts:', err)
})

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`)
})
