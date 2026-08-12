import './themes/base.css'

import { WorkspaceController } from './workspace-controller'

const root = document.getElementById('app')
if (!root) throw new Error('BeiyeMD workspace root was not found')

document.body.classList.add(`platform-${window.electronAPI.platform}`)

const workspace = new WorkspaceController(root, window.electronAPI)
workspace.start().catch((error: unknown) => {
  console.error('Unable to start BeiyeMD workspace', error)
})
