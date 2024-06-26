'use server'

import { CodeInterpreter } from '@e2b/code-interpreter';
export const sandboxTimeout = 10 * 60 * 1000 // 10 minutes in ms
const TEMPLATE = 'new_sandbox7'
const ALIAS = 'code-interpreter-multikernel'
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
  console.log('Running python code', code);
  const result = await sbx.notebook.execCell(code)
  console.log('Command result', result)
  return result
}

export async function createOrConnectJsKernel(userID: string) {
  console.log('create or connect', userID)
  const allSandboxes = await CodeInterpreter.list()
  console.log('all sandboxes', allSandboxes)
  const sandboxInfo = allSandboxes.find(sbx => sbx.alias === ALIAS)
  console.log('sandbox info', sandboxInfo)
  if (!sandboxInfo) {
    console.log('create js sandbox....')
    const sandbox = await CodeInterpreter.create()
    console.log('js sandbox id', sandbox.id)
    const jsID = await sandbox.notebook.createKernel({ kernelName: 'javascript' })
    console.log('js sandbox jsID', jsID)
    console.log('test execution ', jsID)
    const execution = await sandbox.notebook.execCell("console.log('Hello World!')", { kernelID: jsID })
    console.log('execution:',execution);
    return {'sandbox':sandbox,'jsID':jsID}
  }{
    const sandbox = await CodeInterpreter.reconnect(sandboxInfo.sandboxID)
    console.log('reconnected js sandbox id', sandbox.id)
    const jsID = await sandbox.notebook.createKernel({ kernelName: 'javascript' })
    console.log('reconnected js sandbox jsID', jsID)
    return {'sandbox':sandbox,'jsID':jsID}
  }
}


// export async function runJs(userID: string, code: string) {
//   const {sandbox,jsID} = await createOrConnectJsKernel(userID)
//   const result = await sandbox.notebook.execCell(code,{ kernelID: jsID })
//   return result
// }

export async function runJs(userID: string, code: string) {
  const result ={
    logs:{stdout:[],stderr:[]},
    error:undefined,
    results:[{html:code}]
  }
  return result
}

export async function getFileUploadURL(userID: string) {
  const sbx = await createOrConnect(userID)
  return sbx.fileURL
}

