'use server'

import { CodeInterpreter } from '@e2b/code-interpreter'

export const sandboxTimeout = 10 * 60 * 1000 // 10 minutes in ms
const TEMPLATE = 'new_sandbox7'
export async function createOrConnect(userID: string) {
  console.log('create or connect', userID)
  const allSandboxes = await CodeInterpreter.list()
  console.log('all sandboxes', allSandboxes)
  const sandboxInfo = allSandboxes.find(sbx => sbx.alias === TEMPLATE)
  console.log('sandbox info', sandboxInfo)
  if (!sandboxInfo) {
    // return await CodeInterpreter.create({
    //   metadata: {
    //     userId: userID
    //   }
    // })
    console.log('create sandbox....',TEMPLATE)
    const sandbox = await CodeInterpreter.create({
      template: TEMPLATE
    })
    console.log('sandbox id', sandbox.id)
    return sandbox
  }
  return CodeInterpreter.reconnect(sandboxInfo.sandboxID)
}

export async function runPython(userID: string, code: string) {
  const sbx = await createOrConnect(userID)
  // const sbx = await Sandbox.create({ template: 'new_sandbox2' })
  console.log('Running code', code)
  const result = await sbx.notebook.execCell(code)
  console.log('Command result', result)
  return result
}

export async function getFileUploadURL(userID: string) {
  const sbx = await createOrConnect(userID)
  return sbx.fileURL
}
